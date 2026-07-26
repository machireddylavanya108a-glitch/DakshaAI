import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase/firebaseConfig';
import {
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  reauthenticateWithPopup,
  updateProfile,
  browserSessionPersistence,
  setPersistence,
  signInAnonymously
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { secureSession, secureStorage } from '../utils/security';

const AuthContext = createContext();

function getUserRole(email) {
  const normalized = String(email || '').toLowerCase();
  if (normalized === 'nomis108a@gmail.com') return 'Super Admin';
  if (normalized.includes('admin')) return 'Admin';
  return 'Student';
}

function getDeviceInfo() {
  if (typeof navigator === 'undefined') return 'Unknown device';
  const ua = navigator.userAgent;
  if (ua.includes('Mobile')) return 'Mobile';
  if (ua.includes('Mac')) return 'Mac';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Linux')) return 'Linux';
  return 'Desktop';
}

function validatePasswordStrength(password) {
  if (typeof password !== 'string') return false;
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const role = getUserRole(currentUser.email);
        const profileRef = doc(db, 'userProfiles', currentUser.uid);
        const device = getDeviceInfo();
        await setDoc(profileRef, {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'Daksha Learner',
          photoURL: currentUser.photoURL || '',
          role,
          emailVerified: currentUser.emailVerified,
          device,
          lastLoginAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        }, { merge: true });
        secureStorage(`session:${currentUser.uid}`, { uid: currentUser.uid, email: currentUser.email, role, device }, 60);
        secureSession('last-login', { uid: currentUser.uid, device }, 60);
      }
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const withSessionPersistence = async (callback) => {
    await setPersistence(auth, browserSessionPersistence);
    return callback();
  };

  const loginWithGoogle = () => withSessionPersistence(() => signInWithPopup(auth, new GoogleAuthProvider()));
  const loginWithGitHub = () => withSessionPersistence(() => signInWithPopup(auth, new GithubAuthProvider()));
  const loginWithMicrosoft = () => withSessionPersistence(() => signInWithPopup(auth, new OAuthProvider('microsoft.com')));
  const loginWithApple = () => withSessionPersistence(() => signInWithPopup(auth, new OAuthProvider('apple.com')));
  const loginAsGuest = () => withSessionPersistence(() => signInAnonymously(auth));

  const signupWithEmail = async (email, password, displayName = '') => {
    if (!validatePasswordStrength(password)) {
      throw new Error('Password must be at least 8 characters and include a number and uppercase letter.');
    }
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    await sendEmailVerification(result.user);
    return result;
  };

  const loginWithEmail = async (email, password) => {
    if (!email || !password) throw new Error('Email and password are required.');
    return withSessionPersistence(() => signInWithEmailAndPassword(auth, email, password));
  };
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);
  const verifyEmail = () => sendEmailVerification(auth.currentUser);
  const logout = async () => {
    if (auth.currentUser) {
      const profileRef = doc(db, 'userProfiles', auth.currentUser.uid);
      await updateDoc(profileRef, { lastLogoutAt: serverTimestamp() });
    }
    secureSession('last-login', null, 0);
    secureStorage('session:current', null, 0);
    return signOut(auth);
  };
  const reauthenticate = () => reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider());

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        loginWithGitHub,
        loginWithMicrosoft,
        loginWithApple,
        loginAsGuest,
        signupWithEmail,
        loginWithEmail,
        resetPassword,
        verifyEmail,
        logout,
        reauthenticate,
        role: user ? getUserRole(user.email) : 'Guest',
        sessionTimeout: 60,
        deviceInfo: getDeviceInfo(),
        isEmailVerified: Boolean(user?.emailVerified),
        passwordStrength: validatePasswordStrength,
        validatePasswordStrength
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
