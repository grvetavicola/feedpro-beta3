import React from 'react';
import { ViewState, User, ActiveTask } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { 
    BeakerIcon, DatabaseIcon, CubeIcon, FlaskIcon, CalculatorIcon, 
    TruckIcon, SparklesIcon, GlobeIcon, MenuIcon, StarIcon, UserIcon,
    ChevronDownIcon, NutrientsIcon, ProductsIcon, FormulateIcon, IngredientsIcon
} from './icons';

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

            {/* Unified Branding & Profile Area */}
            <div className="flex items-center gap-6 shrink-0 relative z-10">
                {/* Branding Block */}
                <div className="relative flex items-center gap-4 py-2 px-4 bg-gray-900 border border-gray-700/50 rounded-2xl shadow-2xl backdrop-blur-md">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent rounded-2xl"></div>
                    
                    {/* Profile Avatar (Integrated into Brand) */}
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

                    <div className="h-10 w-px bg-gray-800 mx-1"></div>

                    {/* Logo with Soft Edges */}
                    <div className="flex flex-col">
                        <img 
                            src="/feedpro.png" 
                            alt="FeedPro" 
                            className="h-7 object-contain brightness-0 invert opacity-90 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]" 
                        />
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] opacity-80">Executive</span>
                            <div className="h-0.5 w-8 bg-cyan-500/30 rounded-full"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1 relative z-10">
                {/* Divider if tasks exist */}
                {activeTasks.length > 0 && <div className="h-10 w-px bg-gray-800 mx-4 shrink-0"></div>}

                {/* Active Tasks Section */}
                <div className="flex items-center gap-2">
                    {activeTasks.map(task => {
                        const isActive = activeTaskId === task.id;
                        return (
                            <div 
                                key={task.id}
                                onClick={() => onSelectTask(task.id)}
                                className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap group ${isActive ? 'bg-cyan-900/30 border-cyan-500/50 shadow-lg shadow-cyan-950/20' : 'bg-gray-900/50 border-transparent hover:border-gray-700/50'}`}
                            >
                                <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-cyan-400 animate-pulse' : 'bg-gray-700'}`}></div>
                                <span className={`text-[11px] font-black uppercase tracking-tight ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>{task.name}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onCloseTask(task.id); }}
                                    className="hover:text-red-400 opacity-40 hover:opacity-100 transition-opacity"
                                >
                                    <ChevronDownIcon className="w-4 h-4 rotate-45" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </nav>

            {/* Account Status Badge */}
            <div className="flex items-center gap-4 shrink-0 relative z-10 bg-gray-950/50 py-2 px-4 rounded-2xl border border-gray-800">
                <div className="text-right">
                    <p className="text-[11px] font-black text-white uppercase leading-none">{user.name}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-1">
                        <StarIcon className="w-3 h-3 text-yellow-500" />
                        <p className="text-[9px] text-yellow-500 font-bold uppercase tracking-wider">Premium Account</p>
                    </div>
                </div>
            </div>
        </header>
    );
};
