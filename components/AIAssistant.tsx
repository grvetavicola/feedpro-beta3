import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
import { User, Ingredient, Nutrient, Product, ChatMessage } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { chatWithAssistant } from '../services/geminiService';
import { AIIcon, LockClosedIcon, UserIcon, PaperclipIcon, XCircleIcon, MicrophoneIcon, DuplicateIcon, DownloadIcon } from './icons';

interface AIAssistantProps {
  ingredients: Ingredient[];
  nutrients: Nutrient[];
  products: Product[];
  user?: User;
  onUpgradeRequest?: () => void;
  onUpdateIngredientPrice?: (prices: Record<string, number>) => void;
  onUpdateNutrientLimit?: (nutrientId: string, min?: number, max?: number) => void;
  onTriggerOptimization?: (applySafety: boolean) => void;
}

const LoadingBubble: React.FC = () => (
    <div className="flex items-center space-x-2">
        <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse"></div>
        <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse delay-200"></div>
        <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse delay-400"></div>
    </div>
);

const compressImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Maximum viewport constraint for AI reading (crushes 4k screenshots)
                const MAX_RESOLUTION = 1800;
                
                if (width > height && width > MAX_RESOLUTION) {
                    height *= MAX_RESOLUTION / width;
                    width = MAX_RESOLUTION;
                } else if (height > MAX_RESOLUTION) {
                    width *= MAX_RESOLUTION / height;
                    height = MAX_RESOLUTION;
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    // Compress to JPEG at 80% quality
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
                    resolve(compressedBase64);
                } else {
                    resolve((event.target?.result as string).split(',')[1]); // Fallback if no contexts
                }
            };
            img.onerror = (err) => reject(err);
            if (event.target?.result) {
                img.src = event.target.result as string;
            } else {
                reject(new Error("No file content"));
            }
        };
        reader.onerror = (error) => reject(error);
    });
};

export const AIAssistant: React.FC<AIAssistantProps> = ({ 
    user = { name: 'Admin', subscription: 'pro' }, 
    ingredients, 
    nutrients, 
    products, 
    onUpgradeRequest = () => {},
    onUpdateIngredientPrice,
    onUpdateNutrientLimit,
    onTriggerOptimization
}) => {
  const { t, language } = useTranslations();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: t('assistant.welcomeMessage') }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speak = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'en' ? 'en-US' : 'es-ES';
      utterance.pitch = 1.0; 
      utterance.rate = 1.0;  

      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.lang.startsWith(language === 'en' ? 'en' : 'es') && 
        (v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google'))
      );
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = language === 'en' ? 'en-US' : 'es-ES';

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e: any) => {
        console.error("Speech recognition error:", e.error);
        setIsListening(false);
      };
      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) setUserInput(prev => prev + (prev ? ' ' : '') + transcript);
      };
      
      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
        alert(t('common.error') || "Dictado por voz no soportado en este navegador. Usa Chrome o Edge.");
        return;
    }
    if (isListening) {
        recognitionRef.current.stop();
    } else {
        recognitionRef.current.start();
    }
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
  };

  const handleDownloadPDF = async () => {
        if (!chatContainerRef.current) return;
        setIsLoading(true);
        try {
            const canvas = await html2canvas(chatContainerRef.current, {
                scale: 1.5,
                backgroundColor: '#1f2937', 
                windowWidth: chatContainerRef.current.scrollWidth,
                windowHeight: chatContainerRef.current.scrollHeight
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
            
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('Conversacion_VetIA.pdf');
        } catch (error) {
            console.error("PDF generation failed", error);
            alert("Hubo un error al generar el PDF de la conversación.");
        }
        setIsLoading(false);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      if (file.type.startsWith('image/')) {
          setFilePreview(URL.createObjectURL(file));
      } else {
          // It's a document, just show the filename later
          setFilePreview(file.name);
      }
    }
    if(event.target) {
      event.target.value = '';
    }
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if(filePreview) {
        URL.revokeObjectURL(filePreview);
        setFilePreview(null);
    }
  };

  const [pendingActions, setPendingActions] = useState<any[]>([]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!userInput.trim() && !attachedFile) || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: userInput,
      image: filePreview || undefined,
    };
    
    const newMessages: ChatMessage[] = [...messages, userMessage];
    setMessages(newMessages);
    const sentInput = userInput;
    setUserInput('');
    setIsLoading(true);

    let imagePayload;
    if (attachedFile) {
        try {
            if (attachedFile.type.startsWith('image/')) {
                const base64Data = await compressImageToBase64(attachedFile);
                imagePayload = { mimeType: 'image/jpeg', data: base64Data };
            } else {
                const reader = new FileReader();
                const base64Data = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(attachedFile);
                });
                imagePayload = { mimeType: attachedFile.type || 'text/plain', data: base64Data };
            }
        } catch (error) {
            console.error("Error converting file to base64:", error);
            setIsLoading(false);
            return;
        }
    }
    
    removeAttachment();

    try {
        const response = await chatWithAssistant(
            newMessages, 
            sentInput, 
            { ingredients, nutrients, products }, 
            language,
            imagePayload
        );

        const assistantMsg: ChatMessage = { role: 'assistant', content: response.text };
        setMessages(prev => [...prev, assistantMsg]);
        
        // Voz: Hablar la respuesta
        speak(response.text);

        if (response.toolCalls && response.toolCalls.length > 0) {
            setPendingActions(prev => [...prev, ...response.toolCalls!]);
        }
    } catch (err) {
        console.error("Chat Error:", err);
    } finally {
        setIsLoading(false);
    }
  };

  const executeAction = (action: any) => {
    console.log("Ejecutando acción confirmada:", action);
    if (action.name === 'set_ingredient_price' && onUpdateIngredientPrice) {
        onUpdateIngredientPrice({ [action.args.id]: action.args.price });
    } else if (action.name === 'adjust_nutrient_limit' && onUpdateNutrientLimit) {
        onUpdateNutrientLimit(action.args.nutrientId, action.args.min, action.args.max);
    } else if (action.name === 'run_optimization' && onTriggerOptimization) {
        onTriggerOptimization(action.args.applySafety ?? true);
    }
    setPendingActions(prev => prev.filter(a => a !== action));
  };
  
  if (user.subscription !== 'pro') {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <AIIcon className="w-16 h-16 text-cyan-400 mb-4"/>
            <h2 className="text-2xl font-bold text-yellow-300 mb-2">{t('assistant.upgradeTitle')}</h2>
            <p className="text-gray-400 max-w-md mb-6">{t('assistant.upgradeMessage')}</p>
            <button 
                onClick={onUpgradeRequest}
                className="bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold py-3 px-6 rounded-lg flex items-center gap-2 transition-transform transform hover:scale-105"
            >
                <LockClosedIcon /> {t('results.upgradeButton')}
            </button>
        </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col relative overflow-hidden bg-gray-950/20">
        {/* Animated Background Presence (Aura Premium) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none z-0">
            <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-emerald-500/10 rounded-full blur-[150px] transition-all duration-[2000ms] ${isSpeaking ? 'scale-150 opacity-60 animate-pulse' : 'scale-100 opacity-20'}`} />
            <div className={`absolute inset-1/4 bg-cyan-400/5 rounded-full blur-[100px] transition-all duration-[3000ms] ${isListening ? 'scale-110 opacity-50 bg-emerald-500/10' : 'scale-100 opacity-10'}`} />
            {isSpeaking && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-60 h-60 border-2 border-cyan-400/20 rounded-full animate-[ping_3s_linear_infinite]" />
                    <div className="w-80 h-80 border border-cyan-400/10 rounded-full animate-[ping_4s_linear_infinite] delay-1000" />
                </div>
            )}
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2 z-10">
            <div className="flex items-center gap-4">
                <div className="relative">
                    <div className={`w-4 h-4 rounded-full shadow-[0_0_15px_rgba(34,211,238,0.8)] transition-colors duration-500 ${isSpeaking ? 'bg-emerald-400' : isListening ? 'bg-red-400' : 'bg-cyan-500'}`} />
                    <div className={`absolute -inset-1 rounded-full border border-cyan-500/30 animate-ping ${!isSpeaking && !isListening ? 'hidden' : ''}`} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">VetIA Interactive Assistant</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Nutritional Intelligence Engine</p>
                </div>
            </div>
            <button 
                onClick={handleDownloadPDF} 
                disabled={isLoading}
                className="flex items-center gap-2 text-[11px] text-cyan-400 hover:text-cyan-300 bg-cyan-900/30 px-3 py-1.5 rounded-lg border border-cyan-700/50 transition-colors shadow focus:outline-none"
            >
                <DownloadIcon className="w-4 h-4" /> Exportar PDF
            </button>
        </div>
        <div className="flex-1 overflow-hidden relative border border-white/5 bg-gray-900/40 backdrop-blur-md rounded-2xl shadow-2xl z-10">
            <div ref={chatContainerRef} className="absolute inset-0 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    {msg.role === 'assistant' && <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 shadow-lg backdrop-blur-sm"><AIIcon className="w-6 h-6 text-cyan-400" /></div>}
                    <div className={`max-w-xl p-4 rounded-2xl relative group transition-all duration-300 ${msg.role === 'user' ? 'bg-gradient-to-br from-cyan-600 to-blue-700 text-white rounded-tr-none shadow-xl border border-white/10' : 'bg-gray-800/80 backdrop-blur-md text-gray-200 rounded-tl-none border border-white/5 shadow-lg'}`}>
                        {msg.image && <img src={msg.image} alt="Attachment" className="max-w-xs max-h-48 rounded-lg mb-2" />}
                        {msg.content && <div className="text-sm markdown-body [&_table]:w-full [&_table]:my-3 [&_table]:text-xs [&_table]:text-left [&_table]:border-collapse [&_table]:border [&_table]:border-gray-700 [&_th]:bg-gray-900 [&_th]:border [&_th]:border-gray-700/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-cyan-400 [&_th]:font-bold [&_th]:uppercase [&_td]:px-3 [&_td]:py-2 [&_td]:border [&_td]:border-gray-700/30 [&_strong]:text-cyan-300 [&_strong]:font-bold [&_ul]:list-disc [&_ul]:ml-5 [&_ul]:space-y-1 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:ml-5 [&_ol]:space-y-1 [&_ol]:mb-2 [&_p]:mb-2 leading-relaxed" dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }} />}
                        {msg.role === 'assistant' && (
                            <button 
                                onClick={() => copyToClipboard(msg.content)} 
                                className="absolute -right-8 top-1 p-1 bg-gray-800 border border-gray-600 rounded-md text-gray-400 hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                title="Copiar mensaje"
                            >
                                <DuplicateIcon className="w-4 h-4" />
                            </button>
                        )}
                        
                        {/* Confirmation Cards for this message's actions (if it's the last assistant message) */}
                        {msg.role === 'assistant' && index === messages.length - 1 && pendingActions.length > 0 && (
                            <div className="mt-4 space-y-3 border-t border-gray-600 pt-3 animate-fade-in">
                                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Acciones Sugeridas:</p>
                                {pendingActions.map((action, ai) => (
                                    <div key={ai} className="bg-gray-900/50 border border-cyan-500/30 rounded-xl p-3 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div className="text-[11px] font-bold text-gray-100">
                                                {action.name === 'set_ingredient_price' && `Actualizar precio: ${ingredients.find(i => i.id === action.args.id)?.name || action.args.id} → $${action.args.price}`}
                                                {action.name === 'adjust_nutrient_limit' && `Ajustar límite: ${nutrients.find(n => n.id === action.args.nutrientId)?.name || action.args.nutrientId} (${action.args.min || '-'} a ${action.args.max || '-'})`}
                                                {action.name === 'run_optimization' && `Ejecutar Optimización ${action.args.applySafety ? '(Con Escudo)' : ''}`}
                                            </div>
                                            <AIIcon className="w-3 h-3 text-cyan-400" />
                                        </div>
                                        <div className="flex gap-2 mt-1">
                                            <button 
                                                onClick={() => executeAction(action)}
                                                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold py-1.5 rounded-lg transition-colors"
                                            >
                                                Confirmar y Guardar
                                            </button>
                                            <button 
                                                onClick={() => setPendingActions(prev => prev.filter(a => a !== action))}
                                                className="px-3 bg-gray-800 hover:bg-gray-700 text-gray-400 text-[10px] font-bold py-1.5 rounded-lg transition-colors"
                                            >
                                                Descartar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                     {msg.role === 'user' && <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0"><UserIcon className="w-5 h-5 text-gray-300" /></div>}
                </div>
            ))}
            {isLoading && (
                <div className="flex items-end gap-3 justify-start">
                    <div className="w-8 h-8 rounded-full bg-cyan-500/50 flex items-center justify-center flex-shrink-0"><AIIcon className="w-5 h-5 text-cyan-200" /></div>
                    <div className="max-w-xl p-3 rounded-2xl bg-gray-700 text-gray-300 rounded-bl-none">
                        <LoadingBubble />
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
            </div>
        </div>
        <div className="mt-4">
            {attachedFile && (
                <div className="relative inline-block mb-2">
                    {attachedFile.type.startsWith('image/') && filePreview?.startsWith('blob:') ? (
                        <img src={filePreview} alt="Preview" className="h-20 w-20 object-cover rounded-lg border-2 border-gray-600"/>
                    ) : (
                        <div className="h-20 max-w-[200px] bg-gray-900 border-2 border-cyan-500/50 rounded-lg p-2 flex items-center justify-center text-[10px] text-gray-300 break-words flex-col">
                           <PaperclipIcon className="w-6 h-6 mb-1 text-cyan-400" />
                           <span className="truncate w-full text-center">{attachedFile.name}</span>
                        </div>
                    )}
                    <button 
                        onClick={removeAttachment} 
                        className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-0.5 hover:bg-red-500 shadow-lg"
                        aria-label="Remove attachment"
                    >
                        <XCircleIcon className="w-5 h-5"/>
                    </button>
                </div>
            )}
            <form onSubmit={handleSendMessage} className="flex items-center gap-4">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*, application/pdf, .csv, .xlsx, text/*"
                />
                <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    className="p-2 text-gray-400 hover:text-cyan-400 bg-gray-700 rounded-lg transition-colors shadow-sm"
                    aria-label="Attach file"
                >
                    <PaperclipIcon />
                </button>
                <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-2 rounded-lg transition-all shadow-sm flex-shrink-0 ${isListening ? 'bg-red-500/20 text-red-500 border border-red-500/50 animate-pulse' : 'bg-gray-700 text-gray-400 hover:text-emerald-400'}`}
                    aria-label="Dictate"
                >
                    <MicrophoneIcon />
                </button>
                <input
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder={t('assistant.inputPlaceholder')}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    disabled={isLoading}
                />
                <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-5 rounded-lg disabled:bg-gray-600" disabled={isLoading}>
                    {t('assistant.sendButton')}
                </button>
            </form>
        </div>
    </div>
  );
};
