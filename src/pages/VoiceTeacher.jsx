import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveVoiceLesson, getUserVoiceLessons, deleteVoiceLesson, renameVoiceLesson, bookmarkVoiceLesson } from '../services/firestoreService';
import { getDakshaResponse } from '../services/aiService';
import VoiceRecorder from '../components/voice/VoiceRecorder';
import VoicePlayer from '../components/voice/VoicePlayer';
import ConversationBubble from '../components/voice/ConversationBubble';
import VoiceControls from '../components/voice/VoiceControls';
import TeacherAvatar from '../components/voice/TeacherAvatar';
import LoadingVoice from '../components/voice/LoadingVoice';

export default function VoiceTeacher() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [conversation, setConversation] = useState([]);
  const [teacherMode, setTeacherMode] = useState('friendly');
  const [language, setLanguage] = useState('English');
  const [savedLessons, setSavedLessons] = useState([]);
  const [voiceSpeed, setVoiceSpeed] = useState(1); 
  const [voicePitch, setVoicePitch] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pushToTalk, setPushToTalk] = useState(false);
  const [handsFree, setHandsFree] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [renameId, setRenameId] = useState('');
  const [renameValue, setRenameValue] = useState('');
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    if (!user?.uid) return;
    getUserVoiceLessons(user.uid).then((res) => setSavedLessons(res || [])).catch(() => setSavedLessons([]));
  }, [user?.uid]);

  const recognitionSupported = useMemo(() => typeof window !== 'undefined' && 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window, []);

  const handleStart = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic to begin the teaching session.');
      return;
    }
    setLoading(true);
    setError('');
    setIsListening(true);
    try {
      const assistantReply = await getDakshaResponse(`Teach me about ${topic} in a ${teacherMode} style and respond in ${language}. Keep it concise but helpful.`, language);
      setConversation((prev) => [...prev, { role: 'user', text: topic, timestamp: new Date().toLocaleTimeString() }, { role: 'assistant', text: assistantReply, timestamp: new Date().toLocaleTimeString() }]);
      setIsSpeaking(true);
      if (user?.uid) {
        await saveVoiceLesson(user.uid, {
          topic,
          conversation: [{ role: 'user', text: topic }, { role: 'assistant', text: assistantReply }],
          language,
          teacherMode,
          createdAt: new Date().toISOString()
        });
        const fresh = await getUserVoiceLessons(user.uid);
        setSavedLessons(fresh || []);
      }
    } catch (err) {
      setError(err.message || 'Voice session failed.');
    } finally {
      setLoading(false);
      setIsListening(false);
      setIsSpeaking(false);
    }
  };

  const handleStop = () => {
    setIsListening(false);
    setIsSpeaking(false);
    setPaused(false);
  };

  const handleInterrupt = () => {
    setIsSpeaking(false);
    setPaused(true);
  };

  const handleBookmark = async () => {
    if (!user?.uid) return;
    try {
      await bookmarkVoiceLesson(user.uid, { topic, conversation, teacherMode, language });
      setBookmarks((prev) => [...prev, topic]);
    } catch (err) {
      setError(err.message || 'Unable to bookmark this lesson.');
    }
  };

  const startRename = (item) => {
    setRenameId(item.id);
    setRenameValue(item.topic || 'Voice lesson');
  };

  const saveRename = async (id) => {
    if (!user?.uid) return;
    try {
      await renameVoiceLesson(user.uid, id, renameValue);
      setSavedLessons((prev) => prev.map((item) => (item.id === id ? { ...item, topic: renameValue } : item)));
      setRenameId('');
    } catch (err) {
      setError(err.message || 'Unable to rename conversation.');
    }
  };

  const deleteSession = async (id) => {
    if (!user?.uid) return;
    try {
      await deleteVoiceLesson(user.uid, id);
      const fresh = await getUserVoiceLessons(user.uid);
      setSavedLessons(fresh || []);
    } catch (err) {
      setError(err.message || 'Unable to delete conversation.');
    }
  };

  const loadLesson = (item) => {
    setTopic(item.topic || '');
    setConversation(item.conversation || []);
    setTeacherMode(item.teacherMode || 'friendly');
    setLanguage(item.language || 'English');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-10 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">AI Voice Teacher</p>
              <h1 className="mt-2 text-4xl font-semibold text-white">Learn through natural voice conversations</h1>
              <p className="mt-3 max-w-2xl text-slate-400">Choose a teaching style, speak your question, and let the AI tutor guide you in real time.</p>
            </div>
          </div>
        </div>

        {error ? <div className="rounded-[1.5rem] border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
          <div className="space-y-6">
            <VoiceRecorder
              topic={topic}
              setTopic={setTopic}
              isListening={isListening}
              isSpeaking={isSpeaking}
              pushToTalk={pushToTalk}
              handsFree={handsFree}
              onStart={handleStart}
              onStop={handleStop}
              onTogglePushToTalk={() => setPushToTalk((prev) => !prev)}
              onToggleHandsFree={() => setHandsFree((prev) => !prev)}
              onInterrupt={handleInterrupt}
              recognitionSupported={recognitionSupported}
            />
            <VoiceControls teacherMode={teacherMode} setTeacherMode={setTeacherMode} language={language} setLanguage={setLanguage} />
          </div>
          <div className="space-y-6">
            <TeacherAvatar isSpeaking={isSpeaking} />
            <VoicePlayer
              isSpeaking={isSpeaking}
              voiceSpeed={voiceSpeed}
              voicePitch={voicePitch}
              onSpeedChange={(event) => setVoiceSpeed(parseFloat(event.target.value))}
              onPitchChange={(event) => setVoicePitch(parseFloat(event.target.value))}
              onStop={handleStop}
              onPauseResume={() => setPaused((prev) => !prev)}
              paused={paused}
            />
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Conversation History</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Live teaching transcript</h3>
              </div>
              <button onClick={handleBookmark} className="rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950">Bookmark</button>
            </div>
            <div className="mt-5 space-y-3">
              {loading ? <LoadingVoice /> : null}
              {conversation.length === 0 ? <p className="text-sm text-slate-500">The conversation will appear here as you learn.</p> : conversation.map((item, index) => <ConversationBubble key={`${item.role}-${index}`} role={item.role} text={item.text} timestamp={item.timestamp || 'now'} />)}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Bookmarks</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Saved voices</h3>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-300">
                {bookmarks.length ? bookmarks.map((item, index) => <div key={`${item}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2">{item}</div>) : <p className="text-slate-500">Bookmark your favourite lessons to revisit them.</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Saved Voice Lessons</p>
              <h3 className="text-xl font-semibold text-white">Continue, rename, delete, and replay</h3>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {savedLessons.length === 0 ? <p className="text-sm text-slate-500">No voice lessons saved yet.</p> : savedLessons.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  {renameId === item.id ? (
                    <input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} className="rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white" />
                  ) : (
                    <p className="font-medium text-white">{item.topic || 'Voice lesson'}</p>
                  )}
                  <p className="text-sm text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Saved recently'}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => loadLesson(item)} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">Continue</button>
                  {renameId === item.id ? (
                    <button onClick={() => saveRename(item.id)} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300">Save</button>
                  ) : (
                    <button onClick={() => startRename(item)} className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-300">Rename</button>
                  )}
                  <button onClick={() => deleteSession(item.id)} className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
