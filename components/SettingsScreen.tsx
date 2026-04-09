import React from 'react';
import { useTranslations } from '../lib/i18n/LangContext';
import { GlobeIcon, MonitorIcon, DatabaseIcon, ShieldCheckIcon, SaveIcon } from './icons';

export const SettingsScreen: React.FC = () => {
    const { t, language, setLanguage } = useTranslations();
    
    return (
        <div className="p-3 space-y-4 animate-fade-in max-w-4xl mx-auto">
            <div>
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">Ajustes <span className="text-cyan-400">Globales</span></h2>
                <p className="text-gray-500 font-semibold uppercase tracking-widest text-[10px]">Configuración del Motor FeedPro 360</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Language Section */}
                <div className="bg-gray-800/40 border border-gray-700/50 p-4 rounded-xl space-y-4">
                    <div className="flex items-center gap-2 mb-4 border-b border-gray-700/50 pb-2">
                        <GlobeIcon className="w-5 h-5 text-indigo-400" />
                        <h3 className="text-lg font-bold text-white">Idioma / Localización</h3>
                    </div>
                    <div className="space-y-2">
                        <button 
                            onClick={() => setLanguage('es')}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${language === 'es' ? 'bg-indigo-900/30 border-indigo-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600'}`}
                        >
                            <span className="font-bold uppercase tracking-widest text-xs">Español (Latinoamérica)</span>
                            {language === 'es' && <ShieldCheckIcon className="w-5 h-5 text-indigo-400" />}
                        </button>
                        <button 
                            onClick={() => setLanguage('en')}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${language === 'en' ? 'bg-indigo-900/30 border-indigo-500 text-white' : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600'}`}
                        >
                            <span className="font-bold uppercase tracking-widest text-xs">English (US Standard)</span>
                            {language === 'en' && <ShieldCheckIcon className="w-5 h-5 text-indigo-400" />}
                        </button>
                    </div>
                </div>

                {/* Display Section */}
                <div className="bg-gray-800/40 border border-gray-700/50 p-6 rounded-3xl space-y-4">
                    <div className="flex items-center gap-3">
                        <MonitorIcon className="w-5 h-5 text-cyan-400" />
                        <h3 className="text-lg font-bold text-white">Resolución y Escala</h3>
                    </div>
                    <div className="space-y-4">
                        <div>
                             <label className="block text-[10px] text-gray-600 font-black uppercase mb-2">Escala de Interfaz (Zoom)</label>
                             <select className="w-full bg-gray-950 border border-gray-800 text-gray-300 p-3 rounded-xl outline-none focus:border-cyan-500">
                                 <option>Compacto (90%)</option>
                                 <option selected>Estándar (100%)</option>
                                 <option>Grande (110%)</option>
                                 <option>HD (125%)</option>
                             </select>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-950 rounded-xl border border-gray-800">
                            <span className="text-xs text-gray-400 font-bold uppercase">Aceleración por Hardware</span>
                            <div className="w-10 h-5 bg-cyan-600 rounded-full relative">
                                <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Actions */}
            <div className="pt-8 border-t border-gray-800 flex justify-end">
                <button className="bg-gradient-to-r from-cyan-600 to-cyan-400 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-cyan-900/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-widest text-sm">
                    <SaveIcon className="w-5 h-5" /> Guardar Preferencias
                </button>
            </div>
        </div>
    );
};
