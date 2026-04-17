import React, { useState, useRef, useEffect } from 'react';
import { User, Ingredient, Nutrient, Product, ChatMessage } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { chatWithAssistant } from '../services/geminiService';
import { AIIcon, LockClosedIcon, UserIcon, PaperclipIcon, XCircleIcon } from './icons';

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

export const AIAssistant: React.FC<AIAssistantProps> = ({ user = { name: 'Admin', subscription: 'pro' }, ingredients, nutrients, products, onUpgradeRequest = () => {} }) => {
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

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!userInput.trim() && !attachedFile) || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: userInput,
      image: filePreview || undefined,
    };
    
    const newMessages: ChatMessage[] = [...messages, userMessage];
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    let imagePayload;
    if (attachedFile) {
        try {
            if (attachedFile.type.startsWith('image/')) {
                const base64Data = await compressImageToBase64(attachedFile);
                imagePayload = {
                    mimeType: 'image/jpeg',
                    data: base64Data,
                };
            } else {
                // Read as generic DataURL (PDF, CSV, etc)
                const reader = new FileReader();
                const base64Data = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.onerror = error => reject(error);
                    reader.readAsDataURL(attachedFile);
                });
                imagePayload = {
                    mimeType: attachedFile.type || 'text/plain',
                    data: base64Data,
                };
            }
        } catch (error) {
            console.error("Error converting file to base64:", error);
            setIsLoading(false);
            return;
        }
    }
    
    removeAttachment();

    const assistantResponse = await chatWithAssistant(
        messages, 
        userInput, 
        { ingredients, nutrients, products }, 
        language,
        imagePayload
    );

    setMessages([...newMessages, { role: 'assistant', content: assistantResponse.text }]);
    setIsLoading(false);
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
    <div className="p-4 md:p-6 h-full flex flex-col">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">{t('assistant.title')}</h2>
        <div className="flex-1 overflow-y-auto bg-gray-800/50 p-4 rounded-lg border border-gray-700 space-y-4">
            {messages.map((msg, index) => (
                <div key={index} className={`flex items-end gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-cyan-500/50 flex items-center justify-center flex-shrink-0"><AIIcon className="w-5 h-5 text-cyan-200" /></div>}
                    <div className={`max-w-xl p-3 rounded-2xl ${msg.role === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-300 rounded-bl-none'}`}>
                        {msg.image && <img src={msg.image} alt="Attachment" className="max-w-xs max-h-48 rounded-lg mb-2" />}
                        {msg.content && <p className="text-sm" dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />}
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
                    className="p-2 text-gray-400 hover:text-cyan-400 bg-gray-700 rounded-lg"
                    aria-label="Attach file"
                >
                    <PaperclipIcon />
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
