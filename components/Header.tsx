import React from 'react';
import { ViewState, User, ActiveTask } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import {
    BeakerIcon, DatabaseIcon, CubeIcon, FlaskIcon, CalculatorIcon,
    TruckIcon, SparklesIcon, GlobeIcon, MenuIcon, StarIcon, UserIcon,
    ChevronDownIcon, NutrientsIcon, ProductsIcon, FormulateIcon, IngredientsIcon
} from './icons';
import { APP_NAME } from '../constants';

interface HeaderProps {
    activeView: ViewState;
    onViewChange: (view: ViewState) => void;
    user: User;
    activeTasks: ActiveTask[];
    activeTaskId: string | null;
    onSelectTask: (id: string | null) => void;
    onCloseTask: (id: string) => void;
    onManageProfile?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    activeView,
    onViewChange,
    user,
    activeTasks,
    activeTaskId,
    onSelectTask,
    onCloseTask,
    onManageProfile
}) => {
    const { t } = useTranslations();

    return (
        <header className="shrink-0 h-20 bg-gray-950 border-b border-gray-800 z-50 flex items-center px-6 gap-8 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-[500px] h-full bg-gradient-to-r from-cyan-900/10 via-transparent to-transparent pointer-events-none"></div>

            {/* Unified Profile & Task Area */}
            <div className="flex items-center gap-6 shrink-0 relative z-10 mr-4">
                {/* Profile Avatar */}
                <button
                    onClick={onManageProfile}
                    className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-cyan-600 p-0.5 shadow-lg shadow-cyan-900/40 hover:scale-105 transition-transform active:scale-95 group"
                >
                    <div className="w-full h-full rounded-[10px] bg-gray-900 flex items-center justify-center overflow-hidden border border-white/10">
                        <UserIcon className="w-6 h-6 text-cyan-400 group-hover:text-white transition-colors" />
                    </div>
                    {/* Status Indicator */}
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-gray-950 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
                </button>
            </div>

            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1 relative z-10 pr-20">
                {/* Active Tasks Section */}
                <div className="flex items-center gap-2">
                    {activeTasks.map(task => {
                        const isActive = activeTaskId === task.id;
                        return (
                            <div
                                key={task.id}
                                onClick={() => onSelectTask(task.id)}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all cursor-pointer whitespace-nowrap group ${isActive ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-950/20' : 'bg-gray-900/40 border-gray-800/50 hover:border-gray-700/80 hover:bg-gray-800/60'}`}
                            >
                                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)] animate-pulse' : 'bg-gray-700'}`}></div>
                                <span className={`text-[12px] font-black uppercase tracking-tight transition-colors ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>{task.name}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onCloseTask(task.id); }}
                                    className="hover:text-red-400 opacity-30 hover:opacity-100 transition-all ml-1 p-0.5"
                                >
                                    <ChevronDownIcon className="w-3.5 h-3.5 rotate-45" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </nav>

            {/* Version & Info Tooltip Section (Far Right) */}
            <div className="flex items-center gap-4 relative z-10 shrink-0">
                <div className="group relative">
                    <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-900/80 border border-gray-800 rounded-full hover:border-cyan-500/50 transition-all cursor-help overflow-hidden">
                        <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                        <span className="text-[10px] font-black text-gray-400 group-hover:text-cyan-400 transition-colors uppercase tracking-[0.1em]">{APP_NAME} v1.1.0</span>
                    </button>
                    
                    {/* Popover content (Show on hover) */}
                    <div className="absolute top-full right-0 mt-3 w-72 bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 overflow-hidden z-[100] p-5">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-600 via-indigo-600 to-cyan-600"></div>
                        <div className="flex flex-col gap-4">
                            <div>
                                <h4 className="text-[14px] font-black text-white italic tracking-tight mb-1">{APP_NAME} EXECUTIVE</h4>
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none">Enterprise Resource Planning</p>
                            </div>
                            <div className="space-y-2 py-4 border-y border-gray-900">
                                <p className="text-[10px] text-gray-400 leading-relaxed italic">"Optimización de matrices nutricionales con algoritmos de programación lineal de alta precisión."</p>
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-cyan-500 uppercase tracking-widest leading-none">Titularidad Intelectual</p>
                                    <p className="text-[11px] font-bold text-gray-100 italic">Gabriel Rivera Chamy</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none">Contacto & Soporte</p>
                                    <p className="text-[11px] font-bold text-gray-100">grvet.avicola@gmail.com</p>
                                </div>
                                <div className="pt-2">
                                    <p className="text-[8px] text-gray-600 font-medium">© 2026 AVICULTURA 360. Todos los derechos reservados. El uso no autorizado de este software está sujeto a acciones legales.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="h-8 w-px bg-gray-800 mx-1"></div>

                <button 
                  onClick={onManageProfile}
                  className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center hover:border-cyan-500 transition-all group shadow-inner"
                >
                    <UserIcon className="w-5 h-5 text-gray-500 group-hover:text-cyan-400 transition-colors" />
                </button>
            </div>
        </header>
    );
};
