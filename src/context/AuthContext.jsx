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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const AuthContext = createContext();

function getUserRole(email) {
  const normalized = String(email || '').toLowerCase();
  if (normalized === 'nomis108a@gmail.com') return 'Super Admin';
  if (normalized.includes('admin')) return 'Admin';
  return 'Student';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const role = getUserRole(currentUser.email);
        await setDoc(doc(db, 'userProfiles', currentUser.uid), {
          uid: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || 'Daksha Learner',
          photoURL: currentUser.photoURL || '',
          role,
          emailVerified: currentUser.emailVerified,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        }, { merge: true });
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
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(result.user, { displayName });
    }
    await sendEmailVerification(result.user);
    return result;
  };

  const loginWithEmail = (email, password) => withSessionPersistence(() => signInWithEmailAndPassword(auth, email, password));
  const resetPassword = (email) => sendPasswordResetEmail(auth, email);
  const verifyEmail = () => sendEmailVerification(auth.currentUser);
  const logout = () => signOut(auth);
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
        role: user ? getUserRole(user.email) : 'Guest'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
