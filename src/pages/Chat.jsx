import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Mic, Volume2, Square } from 'lucide-react';
import { getDakshaResponse, getDakshaLessonPackage } from '../services/aiService';
import { saveLessonPackage } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lessonPackage, setLessonPackage] = useState(null);
  const [lessonStatus, setLessonStatus] = useState('');
  const [lastUserPrompt, setLastUserPrompt] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  const handleListen = () => {
    if (!recognitionRef.current) {
      alert('Your browser does not support voice input.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }

    recognitionRef.current.start();
    setIsListening(true);
  };

  const speak = (text) => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  };

  const { user } = useAuth();

  const shouldGenerateLessonPackage = (message) => {
    const normalized = message.toLowerCase();
    return [
      'lesson',
      'course',
      'roadmap',
      'learning plan',
      'study plan',
      'teach me',
      'training',
      'curriculum'
    ].some((keyword) => normalized.includes(keyword));
  };

  const sendMessage = async (text, options = {}) => {
    if (!text?.trim() || loading) return;

    const userMessage = text.trim();
    const isFollowUp = options.isFollowUp || false;

    if (!isFollowUp) {
      setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
      setLastUserPrompt(userMessage);
    } else {
      setMessages((prev) => [...prev, { sender: 'user', text: options.displayText || userMessage }]);
      setLastUserPrompt(userMessage);
    }

    setInput('');
    setLoading(true);
    setLessonPackage(null);
    setLessonStatus('');

    const aiResponse = await getDakshaResponse(userMessage, 'English');
    setMessages((prev) => [...prev, { sender: 'ai', text: aiResponse }]);

    if (shouldGenerateLessonPackage(userMessage)) {
      try {
        const packageResult = await getDakshaLessonPackage(userMessage, 'topic', 'Chat lesson package');
        setLessonPackage(packageResult);
        setLessonStatus('Lesson package generated.');

        if (user) {
          setLessonStatus('Saving lesson package...');
          await saveLessonPackage(user.uid, {
            sourceName: 'Chat Lesson Package',
            sourceType: 'topic',
            sourceText: userMessage
          }, packageResult);
          setLessonStatus('Lesson package saved to Firebase.');
        }
      } catch (error) {
        console.error('Lesson generate error:', error);
        setLessonStatus('Unable to generate lesson package right now.');
      }
    }

    setLoading(false);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    await sendMessage(input);
  };

  const handleFollowUpAction = async (action) => {
    const context = lastUserPrompt || messages[messages.length - 1]?.text || '';
    const prompts = {
      learning: `Continue learning from this topic. Build on the previous explanation with the next practical step and a short challenge. Topic: ${context}`,
      simpler: `Explain this topic in much simpler language. Keep it clear and concise. Topic: ${context}`,
      example: `Give one practical example that makes this topic easy to understand. Topic: ${context}`,
      translate: `Translate the main idea of this topic into simple English. Keep the wording clear and easy to read. Topic: ${context}`
    };

    const actionText = {
      learning: 'Continue Learning',
      simpler: 'Explain Simpler',
      example: 'Give Example',
      translate: 'Translate'
    };

    await sendMessage(prompts[action], {
      isFollowUp: true,
      displayText: actionText[action]
    });
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl flex-col bg-slate-950 px-4 py-4 text-white sm:px-6 sm:py-8 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Teacher</h1>
          <p className="text-slate-400 mt-2">Talk, type, or listen to Daksha's guided learning experience.</p>
        </div>
        {isSpeaking && (
          <button
            onClick={() => speak('')}
            className="inline-flex items-center gap-2 rounded-2xl bg-red-600/15 border border-red-600 text-red-300 px-4 py-3 hover:bg-red-600/20 transition-colors"
          >
            <Square className="w-4 h-4" /> Stop Speaking
          </button>
        )}
      </div>

      <div className="mb-6 flex-1 overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-lg shadow-slate-950/20 sm:p-6">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`p-3 rounded-full ${msg.sender === 'user' ? 'bg-indigo-600' : 'bg-slate-700'}`}>
                {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
              </div>
              <div className={`p-4 rounded-3xl max-w-[72%] ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                {msg.sender === 'ai' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => speak(msg.text)}
                      className="inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
                    >
                      <Volume2 className="w-4 h-4" /> Listen
                    </button>
                    {index === messages.length - 1 && !loading && (
                      <>
                        <button onClick={() => handleFollowUpAction('learning')} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-200 hover:border-indigo-500">Continue Learning</button>
                        <button onClick={() => handleFollowUpAction('simpler')} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-200 hover:border-indigo-500">Explain Simpler</button>
                        <button onClick={() => handleFollowUpAction('example')} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-200 hover:border-indigo-500">Give Example</button>
                        <button onClick={() => handleFollowUpAction('translate')} className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-sm text-slate-200 hover:border-indigo-500">Translate</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="p-3 rounded-full bg-slate-700">
                <Bot className="w-5 h-5" />
              </div>
              <div className="p-4 rounded-3xl bg-slate-800 text-slate-400 animate-pulse">
                Daksha is thinking...
              </div>
            </div>
          )}

          {lessonPackage && (
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-6 mt-6">
              <div className="flex items-center justify-between mb-4 gap-4">
                <div>
                  <h2 className="text-xl font-semibold">Generated Lesson Package</h2>
                  <p className="text-slate-400">A structured course package based on your topic request.</p>
                </div>
                <span className="text-slate-300 text-sm">{lessonStatus}</span>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {lessonPackage.completeCourse && (
                  <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                    <h3 className="text-lg font-semibold mb-2">Complete Course</h3>
                    <p className="text-slate-300 whitespace-pre-wrap">{lessonPackage.completeCourse}</p>
                  </div>
                )}
                {lessonPackage.learningRoadmap && (
                  <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                    <h3 className="text-lg font-semibold mb-2">Learning Roadmap</h3>
                    <p className="text-slate-300 whitespace-pre-wrap">{lessonPackage.learningRoadmap}</p>
                  </div>
                )}
                {lessonPackage.cheatSheet && (
                  <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                    <h3 className="text-lg font-semibold mb-2">Cheat Sheet</h3>
                    <p className="text-slate-300 whitespace-pre-wrap">{lessonPackage.cheatSheet}</p>
                  </div>
                )}
                {lessonPackage.flashcards && (
                  <div className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                    <h3 className="text-lg font-semibold mb-2">Flashcards</h3>
                    <p className="text-slate-300 whitespace-pre-wrap">{typeof lessonPackage.flashcards === 'string' ? lessonPackage.flashcards : JSON.stringify(lessonPackage.flashcards, null, 2)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <form onSubmit={handleSend} className="grid items-center gap-3 sm:grid-cols-[auto_1fr_auto]">
        <button
          type="button"
          onClick={handleListen}
          className={`rounded-2xl p-3 transition sm:p-4 ${isListening ? 'bg-indigo-500/20 text-indigo-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          <Mic className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? 'Listening...' : 'Ask Daksha anything...'}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none focus:border-indigo-500 sm:px-5 sm:py-4"
          disabled={loading || isListening}
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-2xl bg-indigo-600 px-4 py-3 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5 sm:py-4"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
