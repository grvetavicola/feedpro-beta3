import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mic, MicOff, Video, VideoOff, PhoneOff, 
  MessageSquare, Image as ImageIcon, Send, 
  Volume2, VolumeX, Sparkles, Loader2, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ai, VETIA_SYSTEM_PROMPT } from '@/lib/gemini';

// --- Types ---
interface Message {
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'image' | 'audio';
  imageUrl?: string;
}

// --- Components ---

const VetIACharacter = ({ isSpeaking, isListening }: { isSpeaking: boolean; isListening: boolean }) => {
  return (
    <div className="relative w-72 h-72 md:w-96 md:h-96 flex items-center justify-center">
      {/* Outer Glow Aura */}
      <motion.div 
        className="absolute inset-0 bg-cyan-500/10 rounded-full blur-[100px]"
        animate={{
          scale: isSpeaking ? [1, 1.2, 1] : [1, 1.1, 1],
          opacity: isSpeaking ? [0.3, 0.5, 0.3] : [0.2, 0.4, 0.2],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      />
      
      {/* The Character Container */}
      <motion.div
        className="relative z-10 w-full h-full flex items-center justify-center"
        animate={{
          y: [0, -8, 0],
          rotate: isListening ? [0, 1, -1, 0] : 0
        }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-[0_0_30px_rgba(34,211,238,0.4)]">
          <defs>
            <linearGradient id="headGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
            
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* Character Group */}
          <g filter="url(#glow)">
            {/* Side Pads */}
            <path d="M35,85 C20,85 20,135 35,135" fill="none" stroke="url(#headGradient)" strokeWidth="12" strokeLinecap="round" />
            <path d="M165,85 C180,85 180,135 165,135" fill="none" stroke="url(#headGradient)" strokeWidth="12" strokeLinecap="round" />

            {/* Main Head Outline */}
            <rect x="45" y="55" width="110" height="100" rx="45" fill="none" stroke="url(#headGradient)" strokeWidth="12" />

            {/* Forehead Star */}
            <motion.path 
              d="M100,35 L106,55 L125,61 L106,67 L100,87 L94,67 L75,61 L94,55 Z" 
              fill="url(#headGradient)"
              animate={{ 
                scale: isSpeaking ? [1, 1.1, 1] : 1,
                opacity: [0.8, 1, 0.8]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Eyes */}
            <motion.ellipse 
              cx="78" cy="105" rx="12" ry="18" 
              fill="white"
              animate={{ 
                scaleY: [1, 0.1, 1],
                opacity: isSpeaking ? [0.9, 1, 0.9] : 1
              }}
              transition={{ 
                scaleY: { duration: 0.2, repeat: Infinity, repeatDelay: 4 }
              }}
            />
            <motion.ellipse 
              cx="122" cy="105" rx="12" ry="18" 
              fill="white"
              animate={{ 
                scaleY: [1, 0.1, 1],
                opacity: isSpeaking ? [0.9, 1, 0.9] : 1
              }}
              transition={{ 
                scaleY: { duration: 0.2, repeat: Infinity, repeatDelay: 4 }
              }}
            />

            {/* Beak */}
            <motion.path 
              d="M100,120 L115,140 L85,140 Z" 
              fill="white"
              animate={{ 
                scale: isSpeaking ? [1, 1.15, 1] : 1,
                y: isSpeaking ? [0, 2, 0] : 0
              }}
              transition={{ duration: 0.4, repeat: Infinity }}
            />
          </g>

          {/* Scanning Line (Subtle) */}
          <motion.rect
            x="50" y="60" width="100" height="2"
            fill="#22d3ee"
            fillOpacity="0.2"
            animate={{ y: [60, 150, 60] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </svg>
        
        {/* Neural Waves */}
        {isSpeaking && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute border border-cyan-400/20 rounded-full"
                initial={{ width: 100, height: 100, opacity: 0.5 }}
                animate={{ width: 400, height: 400, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.7 }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default function VideoCall() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hola, colega. Soy VetIA, tu asistente especializado en nutrición animal. Estoy aquí para apoyarte con cálculos de raciones, dietas terapéuticas o cualquier duda técnica que tengas en tu práctica diaria. ¿En qué caso podemos trabajar juntos hoy?', type: 'text' }
  ]);
  const [inputText, setInputText] = useState('');
  const [tempTranscript, setTempTranscript] = useState('');
  const transcriptRef = useRef('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMode, setChatMode] = useState<'text-only' | 'text-voice' | 'voice-voice'>('voice-voice');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  // --- Speech Recognition Setup ---
  useEffect(() => {
    if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'es-ES';

      recognitionRef.current.onresult = (event: any) => {
        const fullTranscript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        
        transcriptRef.current = fullTranscript;
        setTempTranscript(fullTranscript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      return () => {
        recognitionRef.current?.stop();
      };
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Handlers ---
  const toggleListening = () => {
    if (isProcessing) return;

    if (isListening) {
      console.log("Stopping listening and sending...");
      try {
        recognitionRef.current?.stop();
      } catch (e) {
        console.error("Stop error:", e);
      }
      
      const finalTranscript = transcriptRef.current.trim();
      if (finalTranscript) {
        handleSendMessage(finalTranscript);
      }
      setTempTranscript('');
      transcriptRef.current = '';
      setIsListening(false);
    } else {
      console.log("Starting listening...");
      setTempTranscript('');
      transcriptRef.current = '';
      setIsListening(true);
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Failed to start recognition:", e);
        setIsListening(false);
      }
    }
  };

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-ES';
      
      // Professional, calm, and clear tone
      utterance.pitch = 1.0; 
      utterance.rate = 0.95;  

      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(v => 
        v.lang.startsWith('es') && 
        (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Neural'))
      );
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text) return;

    const newUserMessage: Message = { 
      role: 'user', 
      content: text, 
      type: 'text'
    };
    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');
    setIsProcessing(true);

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: { parts: [{ text }] },
        config: {
          systemInstruction: VETIA_SYSTEM_PROMPT
        }
      });

      const aiText = response.text || "Lo siento, hubo un inconveniente con la conexión. ¿Podría repetirme eso, por favor?";
      setMessages(prev => [...prev, { role: 'assistant', content: aiText, type: 'text' }]);
      
      if (chatMode !== 'text-only') {
        speak(aiText);
      }
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "¡Vaya! Algo falló en el sistema. ¡Intentémoslo de nuevo!", type: 'text' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-[var(--bg)] text-[var(--text-primary)] flex flex-col overflow-hidden font-sans">
      {/* Header */}
      <header className="h-[60px] px-6 flex justify-between items-center bg-[var(--surface)] border-b border-white/5 z-20">
        <div className="flex items-center gap-4">
          <div className="w-2 h-2 bg-[var(--accent)] rounded-full shadow-[0_0_10px_var(--accent)] animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-lg tracking-tight">VetIA <span className="font-light opacity-60">Assistant</span></span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowChat(!showChat)}
            className={cn(
              "p-2 rounded-lg transition-colors",
              showChat ? "bg-[var(--accent)] text-black" : "text-[var(--text-secondary)] hover:text-white"
            )}
          >
            <MessageSquare size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        
        {/* Character Area */}
        <div className="flex-1 relative flex flex-col items-center justify-center bg-[radial-gradient(circle_at_center,#1E293B_0%,#0A0B0E_100%)] p-4">
          <div className="relative cursor-pointer" onClick={toggleListening}>
            <VetIACharacter isSpeaking={isSpeaking} isListening={isListening} />
            
            {/* Pulse Ring when listening */}
            {isListening && (
              <motion.div 
                className="absolute inset-0 border-4 border-[var(--accent)] rounded-full"
                initial={{ scale: 0.8, opacity: 0.5 }}
                animate={{ scale: 1.5, opacity: 0 }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            )}
          </div>

          <div className="mt-12 flex flex-col items-center gap-4">
            {isListening && tempTranscript && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xs text-center mb-4 p-3 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm pointer-events-none select-none"
              >
                <p className="text-xs text-[var(--accent)] italic">"{tempTranscript}..."</p>
              </motion.div>
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleListening}
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl",
                isListening 
                  ? "bg-[var(--accent)] text-black shadow-[0_0_40px_rgba(45,212,191,0.5)]" 
                  : "bg-white/5 border border-white/10 text-white hover:bg-white/10"
              )}
            >
              {isListening ? <Volume2 size={32} /> : <Mic size={32} />}
            </motion.button>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--text-secondary)]">
              {isListening ? 'Escuchando...' : 'Pulsa para hablar'}
            </p>
          </div>

          {/* Processing Indicator */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="absolute top-10 px-4 py-2 bg-[var(--accent)]/10 border border-[var(--accent)]/30 backdrop-blur-xl rounded-full flex items-center gap-2 text-[var(--accent)] text-xs font-bold uppercase tracking-widest"
              >
                <Loader2 className="animate-spin" size={14} />
                Procesando...
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Chat Sidebar (Side Panel) */}
        <AnimatePresence>
          {showChat && (
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="absolute inset-y-0 right-0 w-full md:w-80 bg-[var(--surface)] border-l border-white/5 z-30 flex flex-col shadow-2xl p-6"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Conversación</h3>
                <button onClick={() => setShowChat(false)} className="p-1 hover:bg-white/5 rounded text-[var(--text-secondary)]">
                  <X size={18} />
                </button>
              </div>

              {/* Chat Mode Selection */}
              <div className="mb-4 flex gap-2 p-1 bg-black/20 rounded-lg border border-white/5">
                {[
                  { id: 'text-only', label: 'Texto' },
                  { id: 'text-voice', label: 'T+V' },
                  { id: 'voice-voice', label: 'Voz' }
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setChatMode(mode.id as any)}
                    className={cn(
                      "flex-1 py-1.5 text-[10px] font-bold rounded transition-all",
                      chatMode === mode.id ? "bg-[var(--accent)] text-black" : "text-[var(--text-secondary)] hover:text-white"
                    )}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              
              <div className="flex-1 overflow-y-auto bg-black/20 rounded-xl border border-white/5 p-4 space-y-4 scrollbar-hide">
                {messages.map((msg, i) => (
                  <div key={i} className="space-y-1">
                    <div className={cn(
                      "text-xs leading-relaxed",
                      msg.role === 'assistant' ? "text-[var(--accent)]" : "text-[var(--text-primary)]"
                    )}>
                      <strong className="uppercase text-[10px] mr-1 opacity-70">
                        {msg.role === 'user' ? 'Usuario:' : 'VetIA:'}
                      </strong>
                      {msg.content}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="mt-6">
                <div className="relative">
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputText)}
                    placeholder="Escribe..."
                    className="w-full bg-black/20 border border-white/5 rounded-lg px-4 py-3 text-xs focus:outline-none focus:border-[var(--accent)]/50 transition-colors"
                  />
                  <button 
                    onClick={() => handleSendMessage(inputText)}
                    disabled={!inputText.trim() || isProcessing}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-[var(--accent)] disabled:opacity-30"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Controls - Simplified */}
      <footer className="h-[80px] bg-[var(--surface)] border-t border-white/5 flex justify-center items-center gap-12 z-20">
        <div className="flex flex-col items-center gap-1 relative group">
          <button 
            onClick={toggleListening}
            disabled={isProcessing}
            className={cn(
              "p-3 rounded-full transition-all border",
              isListening ? "bg-[var(--accent)] text-black border-[var(--accent)] shadow-[0_0_15px_rgba(45,212,191,0.3)]" : "bg-white/5 border-white/10 text-white hover:bg-white/10"
            )}
          >
            {isListening ? <Volume2 size={18} /> : <Mic size={18} />}
          </button>
          <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">
            {isListening ? 'Enviando' : 'Hablar'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-1 relative group">
          <button 
            onClick={() => setShowChat(!showChat)}
            className={cn(
              "p-3 rounded-full transition-all border",
              showChat ? "bg-[var(--accent)]/20 border-[var(--accent)]/50 text-[var(--accent)]" : "bg-white/5 border-white/10 text-white"
            )}
          >
            <MessageSquare size={18} />
          </button>
          <span className="text-[8px] font-bold uppercase tracking-widest text-[var(--text-secondary)]">Chat</span>
        </div>
      </footer>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
