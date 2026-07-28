import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { saveVoiceLesson, getUserVoiceLessons, deleteVoiceLesson, renameVoiceLesson, bookmarkVoiceLesson } from '../services/firestoreService';
import { getDakshaResponse } from '../services/aiService';
import { buildVoiceTeachingPrompt, buildVoiceTeachingProfile } from '../utils/aiVoiceTeacherEngine.js';
import VoiceRecorder from '../components/voice/VoiceRecorder';
import VoicePlayer from '../components/voice/VoicePlayer';
import ConversationBubble from '../components/voice/ConversationBubble';
import VoiceControls from '../components/voice/VoiceControls';
import TeacherAvatar from '../components/voice/TeacherAvatar';
import LoadingVoice from '../components/voice/LoadingVoice';

const LANGUAGE_OPTIONS = [
  { label: 'Auto-detect', value: 'Auto-detect', code: 'auto' },
  { label: 'English', value: 'English', code: 'en-US' },
  { label: 'Telugu', value: 'Telugu', code: 'te-IN' },
  { label: 'Hindi', value: 'Hindi', code: 'hi-IN' },
  { label: 'Tamil', value: 'Tamil', code: 'ta-IN' },
  { label: 'Kannada', value: 'Kannada', code: 'kn-IN' },
  { label: 'Malayalam', value: 'Malayalam', code: 'ml-IN' },
  { label: 'Marathi', value: 'Marathi', code: 'mr-IN' },
  { label: 'Bengali', value: 'Bengali', code: 'bn-BD' },
  { label: 'Gujarati', value: 'Gujarati', code: 'gu-IN' },
  { label: 'Punjabi', value: 'Punjabi', code: 'pa-IN' },
  { label: 'Urdu', value: 'Urdu', code: 'ur-PK' },
  { label: 'Odia', value: 'Odia', code: 'or-IN' },
  { label: 'Assamese', value: 'Assamese', code: 'as-IN' },
  { label: 'Sanskrit', value: 'Sanskrit', code: 'sa-IN' },
  { label: 'Nepali', value: 'Nepali', code: 'ne-NP' },
  { label: 'Sinhala', value: 'Sinhala', code: 'si-LK' },
  { label: 'Arabic', value: 'Arabic', code: 'ar-SA' },
  { label: 'Persian', value: 'Persian', code: 'fa-IR' },
  { label: 'Turkish', value: 'Turkish', code: 'tr-TR' },
  { label: 'Hebrew', value: 'Hebrew', code: 'he-IL' },
  { label: 'Russian', value: 'Russian', code: 'ru-RU' },
  { label: 'Ukrainian', value: 'Ukrainian', code: 'uk-UA' },
  { label: 'Polish', value: 'Polish', code: 'pl-PL' },
  { label: 'Czech', value: 'Czech', code: 'cs-CZ' },
  { label: 'Slovak', value: 'Slovak', code: 'sk-SK' },
  { label: 'Hungarian', value: 'Hungarian', code: 'hu-HU' },
  { label: 'Romanian', value: 'Romanian', code: 'ro-RO' },
  { label: 'Bulgarian', value: 'Bulgarian', code: 'bg-BG' },
  { label: 'Greek', value: 'Greek', code: 'el-GR' },
  { label: 'Serbian', value: 'Serbian', code: 'sr-RS' },
  { label: 'Croatian', value: 'Croatian', code: 'hr-HR' },
  { label: 'Bosnian', value: 'Bosnian', code: 'bs-BA' },
  { label: 'Slovenian', value: 'Slovenian', code: 'sl-SI' },
  { label: 'Albanian', value: 'Albanian', code: 'sq-AL' },
  { label: 'Dutch', value: 'Dutch', code: 'nl-NL' },
  { label: 'German', value: 'German', code: 'de-DE' },
  { label: 'French', value: 'French', code: 'fr-FR' },
  { label: 'Spanish', value: 'Spanish', code: 'es-ES' },
  { label: 'Portuguese', value: 'Portuguese', code: 'pt-PT' },
  { label: 'Italian', value: 'Italian', code: 'it-IT' },
  { label: 'Swedish', value: 'Swedish', code: 'sv-SE' },
  { label: 'Norwegian', value: 'Norwegian', code: 'nb-NO' },
  { label: 'Danish', value: 'Danish', code: 'da-DK' },
  { label: 'Finnish', value: 'Finnish', code: 'fi-FI' },
  { label: 'Icelandic', value: 'Icelandic', code: 'is-IS' },
  { label: 'Irish', value: 'Irish', code: 'ga-IE' },
  { label: 'Welsh', value: 'Welsh', code: 'cy-GB' },
  { label: 'Basque', value: 'Basque', code: 'eu-ES' },
  { label: 'Catalan', value: 'Catalan', code: 'ca-ES' },
  { label: 'Chinese (Simplified)', value: 'Chinese (Simplified)', code: 'zh-CN' },
  { label: 'Chinese (Traditional)', value: 'Chinese (Traditional)', code: 'zh-TW' },
  { label: 'Japanese', value: 'Japanese', code: 'ja-JP' },
  { label: 'Korean', value: 'Korean', code: 'ko-KR' },
  { label: 'Thai', value: 'Thai', code: 'th-TH' },
  { label: 'Vietnamese', value: 'Vietnamese', code: 'vi-VN' },
  { label: 'Indonesian', value: 'Indonesian', code: 'id-ID' },
  { label: 'Malay', value: 'Malay', code: 'ms-MY' },
  { label: 'Filipino', value: 'Filipino', code: 'fil-PH' },
  { label: 'Burmese', value: 'Burmese', code: 'my-MM' },
  { label: 'Khmer', value: 'Khmer', code: 'km-KH' },
  { label: 'Lao', value: 'Lao', code: 'lo-LA' },
  { label: 'Mongolian', value: 'Mongolian', code: 'mn-MN' },
  { label: 'Swahili', value: 'Swahili', code: 'sw-TZ' },
  { label: 'Zulu', value: 'Zulu', code: 'zu-ZA' },
  { label: 'Afrikaans', value: 'Afrikaans', code: 'af-ZA' },
  { label: 'Hausa', value: 'Hausa', code: 'ha-NG' },
  { label: 'Yoruba', value: 'Yoruba', code: 'yo-NG' },
  { label: 'Igbo', value: 'Igbo', code: 'ig-NG' },
  { label: 'Amharic', value: 'Amharic', code: 'am-ET' },
  { label: 'Somali', value: 'Somali', code: 'so-SO' },
  { label: 'Latin', value: 'Latin', code: 'la-LA' },
  { label: 'Estonian', value: 'Estonian', code: 'et-EE' },
  { label: 'Latvian', value: 'Latvian', code: 'lv-LV' },
  { label: 'Lithuanian', value: 'Lithuanian', code: 'lt-LT' },
  { label: 'Azerbaijani', value: 'Azerbaijani', code: 'az-AZ' },
  { label: 'Belarusian', value: 'Belarusian', code: 'be-BY' },
  { label: 'Esperanto', value: 'Esperanto', code: 'eo' },
  { label: 'Kurdish', value: 'Kurdish', code: 'ku-TR' },
  { label: 'Uyghur', value: 'Uyghur', code: 'ug-CN' },
  { label: 'Kazakh', value: 'Kazakh', code: 'kk-KZ' },
  { label: 'Uzbek', value: 'Uzbek', code: 'uz-UZ' },
  { label: 'Tajik', value: 'Tajik', code: 'tg-TJ' },
  { label: 'Kyrgyz', value: 'Kyrgyz', code: 'ky-KG' },
  { label: 'Turkmen', value: 'Turkmen', code: 'tk-TM' },
  { label: 'Armenian', value: 'Armenian', code: 'hy-AM' },
  { label: 'Georgian', value: 'Georgian', code: 'ka-GE' },
  { label: 'Malagasy', value: 'Malagasy', code: 'mg-MG' },
  { label: 'Maori', value: 'Maori', code: 'mi-NZ' },
  { label: 'Hawaiian', value: 'Hawaiian', code: 'haw-US' },
  { label: 'Tatar', value: 'Tatar', code: 'tt-RU' },
  { label: 'Bashkir', value: 'Bashkir', code: 'ba-RU' },
  { label: 'Quechua', value: 'Quechua', code: 'qu-PE' },
  { label: 'Aymara', value: 'Aymara', code: 'ay-BO' },
  { label: 'Coptic', value: 'Coptic', code: 'cop' },
  { label: 'Faroese', value: 'Faroese', code: 'fo-FO' },
  { label: 'Luxembourgish', value: 'Luxembourgish', code: 'lb-LU' },
  { label: 'Maltese', value: 'Maltese', code: 'mt-MT' },
  { label: 'Scottish Gaelic', value: 'Scottish Gaelic', code: 'gd-GB' },
  { label: 'Corsican', value: 'Corsican', code: 'co-FR' },
];

const LANGUAGE_LABELS = Object.fromEntries(LANGUAGE_OPTIONS.map((entry) => [entry.value, entry.label]));

function detectLanguageFromText(text) {
  const normalized = (text || '').toLowerCase();
  const patterns = [
    { language: 'Telugu', keys: ['మీ', 'మీకు', 'నేను', 'గురించి', 'తెలుగు', 'కోసం'] },
    { language: 'Hindi', keys: ['आप', 'कृपया', 'सीखना', 'विषय', 'मुझे', 'हिंदी'] },
    { language: 'Tamil', keys: ['நான்', 'உங்களுக்கு', 'தமிழ்', 'பற்றி', 'குறித்து'] },
    { language: 'Kannada', keys: ['ನಾನು', 'ನಿಮಗೆ', 'ಕನ್ನಡ', 'ಗುರಿಯಾಗಿ', 'ಬಗ್ಗೆ'] },
    { language: 'Malayalam', keys: ['ഞാൻ', 'നിങ്ങൾക്ക്', 'മലയാളം', 'കുറിച്ച്', 'ബഹുലം'] },
    { language: 'Marathi', keys: ['मी', 'तुम्हाला', 'मराठी', 'बद्दल', 'विषय'] },
    { language: 'Bengali', keys: ['আমি', 'আপনাকে', 'বাংলা', 'সম্পর্কে', 'বিষয়'] },
    { language: 'Gujarati', keys: ['હું', 'તમને', 'ગુજરાતી', 'વિષય', 'બાબત'] },
    { language: 'Punjabi', keys: ['ਮੈਂ', 'ਤੁਹਾਨੂੰ', 'ਪੰਜਾਬੀ', 'ਬਾਰੇ', 'ਵಿಷ਼ਾ'] },
    { language: 'Urdu', keys: ['میں', 'آپ', 'اردو', 'کے بارے', 'موضوع'] },
    { language: 'Arabic', keys: ['أنا', 'أنت', 'العربية', 'حول', 'موضوع'] },
    { language: 'Persian', keys: ['من', 'تو', 'فارسی', 'درباره', 'موضوع'] },
    { language: 'Russian', keys: ['я', 'ты', 'русский', 'о', 'тема'] },
    { language: 'French', keys: ['je', 'vous', 'français', 'sujet', 'à propos'] },
    { language: 'Spanish', keys: ['yo', 'usted', 'español', 'tema', 'sobre'] },
    { language: 'German', keys: ['ich', 'du', 'deutsch', 'thema', 'über'] },
    { language: 'Japanese', keys: ['私', 'あなた', '日本語', 'について', 'テーマ'] },
    { language: 'Chinese (Simplified)', keys: ['我', '你', '中文', '关于', '主题'] },
    { language: 'Chinese (Traditional)', keys: ['我', '你', '中文', '關於', '主題'] },
    { language: 'Korean', keys: ['저', '당신', '한국어', '에 대해', '주제'] },
    { language: 'Portuguese', keys: ['eu', 'você', 'português', 'sobre', 'tópico'] },
    { language: 'Italian', keys: ['io', 'tu', 'italiano', 'argomento', 'sul'] },
    { language: 'Turkish', keys: ['ben', 'sen', 'türkçe', 'konu', 'hakkında'] },
  ];

  for (const pattern of patterns) {
    if (pattern.keys.some((key) => normalized.includes(key))) {
      return pattern.language;
    }
  }

  return null;
}

function getLanguageCode(language) {
  const option = LANGUAGE_OPTIONS.find((entry) => entry.value === language);
  return option?.code || 'en-US';
}

export default function VoiceTeacher() {
  const { user } = useAuth();
  const recognitionRef = useRef(null);
  const [topic, setTopic] = useState('');
  const [conversation, setConversation] = useState([]);
  const [teacherMode, setTeacherMode] = useState('friendly');
  const [language, setLanguage] = useState('English');
  const [detectedLanguage, setDetectedLanguage] = useState('English');
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

  useEffect(() => {
    const saved = window.localStorage.getItem('daksha-voice-language');
    if (saved) {
      setLanguage(saved);
      setDetectedLanguage(saved);
    }
  }, []);

  useEffect(() => {
    if (language && language !== 'Auto-detect') {
      window.localStorage.setItem('daksha-voice-language', language);
    }
  }, [language]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = getLanguageCode(language === 'Auto-detect' ? 'English' : language);

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((result) => result[0].transcript).join(' ').trim();
      if (transcript) {
        const detected = detectLanguageFromText(transcript) || language;
        setTopic(transcript);
        setDetectedLanguage(detected);
        if (!pushToTalk || handsFree) {
          void generateLesson(transcript, detected);
        }
      }
      setIsListening(false);
    };

    recognition.onerror = () => {
      setError('Speech recognition failed. Please try again or type your topic instead.');
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [language, pushToTalk, handsFree]);

  const recognitionSupported = useMemo(() => typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window), []);

  const speakText = (text, speakLanguage = language) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLanguageCode(speakLanguage === 'Auto-detect' ? 'English' : speakLanguage);
    utterance.rate = voiceSpeed;
    utterance.pitch = voicePitch;
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setPaused(false);
  };

  const generateLesson = async (promptText, resolvedLanguage) => {
    if (!promptText.trim()) {
      setError('Please enter a topic to begin the teaching session.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const profile = buildVoiceTeachingProfile(promptText, resolvedLanguage, teacherMode);
      const prompt = buildVoiceTeachingPrompt(promptText, resolvedLanguage, teacherMode);
      const assistantReply = await getDakshaResponse(prompt, resolvedLanguage);
      const userEntry = { role: 'user', text: promptText, timestamp: new Date().toLocaleTimeString() };
      const assistantEntry = { role: 'assistant', text: assistantReply, timestamp: new Date().toLocaleTimeString(), profile };
      setConversation((prev) => [...prev, userEntry, assistantEntry]);
      speakText(assistantReply, resolvedLanguage);
      if (user?.uid) {
        await saveVoiceLesson(user.uid, {
          topic: promptText,
          conversation: [userEntry, assistantEntry],
          language: resolvedLanguage,
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
    }
  };

  const handleStart = async () => {
    const trimmedTopic = topic.trim();
    const detected = detectLanguageFromText(trimmedTopic) || language;
    setDetectedLanguage(detected);
    if (recognitionSupported && (handsFree || !pushToTalk)) {
      if (recognitionRef.current) {
        recognitionRef.current.lang = getLanguageCode(detected === 'Auto-detect' ? 'English' : detected);
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
    if (trimmedTopic) {
      await generateLesson(trimmedTopic, detected);
    }
  };

  const handleStop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    stopSpeech();
    setIsListening(false);
  };

  const handleInterrupt = () => {
    stopSpeech();
    setPaused(true);
  };

  const handlePauseResume = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPaused(false);
    } else {
      window.speechSynthesis.pause();
      setPaused(true);
    }
  };

  const handleBookmark = async () => {
    if (!user?.uid) return;
    try {
      await bookmarkVoiceLesson(user.uid, { topic, conversation, teacherMode, language: detectedLanguage || language });
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
    setDetectedLanguage(item.language || 'English');
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
              <p className="mt-3 max-w-2xl text-slate-400">Choose a teaching style, speak your question, and let the AI tutor guide you in real time in 100+ languages.</p>
            </div>
            <div className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              Active language: <span className="font-semibold">{detectedLanguage || language}</span>
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
            <VoiceControls teacherMode={teacherMode} setTeacherMode={setTeacherMode} language={language} setLanguage={setLanguage} languageOptions={LANGUAGE_OPTIONS} detectedLanguage={detectedLanguage} />
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
              onPauseResume={handlePauseResume}
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
