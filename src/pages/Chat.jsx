import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Mic, Volume2, Square } from 'lucide-react';
import { getDakshaResponse } from '../services/aiService';

export default function Chat() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! I am Daksha AI. What would you like to learn today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    const aiResponse = await getDakshaResponse(userMessage, 'English');
    setMessages((prev) => [...prev, { sender: 'ai', text: aiResponse }]);
    setLoading(false);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white px-8 py-8 max-w-6xl mx-auto flex flex-col">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
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

      <div className="flex-1 bg-slate-900 rounded-3xl border border-slate-800 p-6 mb-6 overflow-y-auto shadow-lg shadow-slate-950/20">
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
                  <button
                    onClick={() => speak(msg.text)}
                    className="mt-3 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-white"
                  >
                    <Volume2 className="w-4 h-4" /> Listen
                  </button>
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
        </div>
      </div>

      <form onSubmit={handleSend} className="grid gap-3 md:grid-cols-[auto_1fr_auto] items-center">
        <button
          type="button"
          onClick={handleListen}
          className={`rounded-2xl p-4 transition ${isListening ? 'bg-indigo-500/20 text-indigo-200' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          <Mic className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? 'Listening...' : 'Ask Daksha anything...'}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900 px-5 py-4 text-white outline-none focus:border-indigo-500"
          disabled={loading || isListening}
        />

        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="rounded-2xl bg-indigo-600 px-5 py-4 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
