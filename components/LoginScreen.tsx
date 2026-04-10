import React, { useState } from 'react';
import { User } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { DatabaseIcon, UserIcon, LockClosedIcon, RefreshIcon } from './icons';
import { AUTHORIZED_ACCOUNTS } from '../constants';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { t } = useTranslations();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(isAuthenticating) return;
    setErrorMsg('');
    setIsAuthenticating(true);
    
    // Simular un retraso en la red para una experiencia de usuario mas premium
    setTimeout(() => {
        const account = AUTHORIZED_ACCOUNTS.find(a => a.username === username && a.password === password);
        
        if (account) {
            onLogin({
                name: account.username,
                subscription: 'pro',
                email: account.email,
                assignedClientId: account.assignedClientId,
                trialEndsAt: account.trialEndsAt
            });
        } else {
            setErrorMsg('Credenciales inválidas. Por favor verifique el usuario y contraseña.');
            setIsAuthenticating(false);
        }
    }, 1200);
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-gray-200">
      <div className="text-center p-8 bg-gray-800/50 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
        {/* Background Accent */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-600 to-blue-600"></div>
        
        <div className="flex flex-col items-center justify-center mb-8 mt-4">
          <div className="mb-6 animate-pulse flex flex-col items-center">
            <img src="/feedpro.png" alt="FeedPro 360" className="h-14 object-contain drop-shadow-md mb-2" />
            <p className="text-cyan-400/80 text-xs font-bold uppercase tracking-[0.2em] font-mono">Formulation Engine v5.2</p>
          </div>
        </div>

        <p className="text-gray-400 mb-8 text-sm italic">
          {t('login.tagline')}
        </p>
        
        <form onSubmit={handleLoginSubmit} className="space-y-5 text-left">
            <div>
                <label className="block text-xs text-gray-400 mb-1.5 ml-1 uppercase font-bold tracking-wider">Usuario (Opcional)</label>
                <div className="relative group">
                    <UserIcon className="absolute left-3 top-3 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                        type="text" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Nombre de usuario"
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-gray-600"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs text-gray-400 mb-1.5 ml-1 uppercase font-bold tracking-wider">Contraseña (Opcional)</label>
                <div className="relative group">
                    <LockClosedIcon className="absolute left-3 top-3 w-5 h-5 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••"
                        className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all placeholder-gray-600"
                    />
                </div>
            </div>

            {errorMsg && (
                <div className="text-red-400/80 text-xs bg-red-900/20 p-2.5 rounded border border-red-500/30 text-center animate-pulse">
                    {errorMsg}
                </div>
            )}

            <button
                type="submit"
                disabled={isAuthenticating}
                className={`w-full font-bold py-3 px-6 rounded-lg flex items-center justify-center gap-3 transition-all transform shadow-lg mt-2 ${isAuthenticating ? 'bg-cyan-900 text-cyan-400 cursor-not-allowed border border-cyan-800' : 'bg-gradient-to-r from-cyan-700 to-cyan-600 hover:from-cyan-600 hover:to-cyan-500 text-white hover:scale-[1.02] shadow-cyan-900/30'}`}
            >
                {isAuthenticating ? (
                     <><RefreshIcon className="w-5 h-5 animate-spin" /> <span>AUTENTICANDO...</span></>
                ) : (
                     <span>INGRESAR Y CONTINUAR</span>
                )}
            </button>
        </form>
        
        <div className="mt-6 text-[10px] text-gray-600">
            Feed Pro System &copy; 2024
        </div>
      </div>
    </div>
  );
};
