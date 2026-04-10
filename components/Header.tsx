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
        <header className="shrink-0 h-14 bg-gray-950 border-b border-gray-800 z-50 flex items-center px-4 gap-6 relative">
            {/* Nav Title (Instead of logo) */}
            <div className="flex items-center shrink-0 pr-4 border-r border-gray-800 h-8">
                 <span className="text-xs font-black text-emerald-400 uppercase tracking-[0.2em]">Workflow</span>
            </div>
            
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1">


                {/* Divider if tasks exist */}
                {activeTasks.length > 0 && <div className="h-6 w-px bg-gray-800 mx-2 shrink-0"></div>}

                {/* Active Tasks (Multi-window equivalents) */}
                {activeTasks.map(task => {
                    const isActive = activeTaskId === task.id;
                    return (
                        <div 
                            key={task.id}
                            onClick={() => onSelectTask(task.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${isActive ? 'bg-cyan-900/30 border-cyan-500/50 text-cyan-300' : 'bg-gray-900/50 border-transparent text-gray-500 hover:border-gray-700'}`}
                        >
                            <span className="text-[10px] font-bold truncate max-w-[100px] uppercase tracking-tighter">{task.name}</span>
                            <button 
                                onClick={(e) => { e.stopPropagation(); onCloseTask(task.id); }}
                                className="hover:text-red-400 opacity-60 hover:opacity-100"
                            >
                                <ChevronDownIcon className="w-3 h-3 rotate-45" />
                            </button>
                        </div>
                    );
                })}
            </nav>

            {/* Profile */}
            <div className="flex items-center gap-3 shrink-0 ml-auto border-l border-gray-800 pl-6 h-8">
                <div className="text-right hidden lg:block">
                    <p className="text-[10px] font-black text-gray-300 uppercase leading-tight">{user.name}</p>
                    <p className="text-[9px] text-yellow-500 font-bold uppercase tracking-tighter">Pro Plan</p>
                </div>
                <button 
                    onClick={onManageProfile}
                    title="Gestión de Perfil e Intercambio"
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 hover:from-cyan-900 hover:to-indigo-900 border border-gray-700 hover:border-cyan-500 transition-all flex items-center justify-center cursor-pointer group shadow-lg"
                >
                    <UserIcon className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transition-colors" />
                </button>
            </div>
        </header>
    );
};
