import React from 'react';
import { ViewState, User, ActiveTask, Client } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import {
    BeakerIcon, DatabaseIcon, CubeIcon, FlaskIcon, CalculatorIcon,
    TruckIcon, SparklesIcon, GlobeIcon, MenuIcon, StarIcon, UserIcon,
    ChevronDownIcon, NutrientsIcon, ProductsIcon, FormulateIcon, IngredientsIcon,
    SettingsIcon, UserIcon as GeneralUserIcon
} from './icons';
import { APP_NAME, APP_VERSION } from '../constants';

interface HeaderProps {
    activeView: ViewState;
    onViewChange: (view: ViewState) => void;
    user: User;
    activeTasks: ActiveTask[];
    activeTaskId: string | null;
    onSelectTask: (id: string | null) => void;
    onCloseTask: (id: string) => void;
    onManageProfile?: () => void;
    client?: Client;
    onToggleMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
    activeView,
    onViewChange,
    user,
    activeTasks,
    activeTaskId,
    onSelectTask,
    onCloseTask,
    onManageProfile,
    client,
    onToggleMenu
}) => {
    const { t } = useTranslations();

    return (
        <header className="shrink-0 h-14 border-b border-black/10 z-50 flex items-center px-4 gap-4 relative overflow-hidden bg-white">
            {/* Banner Unificado: Calce exacto sin perder resolución */}
            {/* Banner Unificado: Calce exacto sin perder resolución */}
            {/* --- BANNER TEMPORAL LIMPIO --- */}
            <div className="absolute inset-0 pointer-events-none select-none bg-[#09152b]">
                {/* Recuadro limpio del mismo fondo como marcador de posición */}
                <div className="absolute inset-0 bg-[#09152b]"></div>
                
                {/* Logo FeedPro (Mantener visibilidad mínima para navegación) */}
                <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20">
                    <img 
                        src="/FeedPro-sinfondo.PNG" 
                        alt="FeedPro 360" 
                        className="w-[120px] object-contain opacity-50 grayscale brightness-200"
                    />
                </div>
            </div>
            
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1 relative z-10 w-full pl-2">
                {onToggleMenu && (
                    <button 
                        onClick={onToggleMenu}
                        className="md:hidden p-1.5 rounded-lg bg-white/70 border border-gray-300 text-gray-800 hover:text-cyan-600 hover:bg-white transition-all shadow-sm z-20 flex-shrink-0 mr-1 backdrop-blur-sm"
                        aria-label="Abrir Menú"
                    >
                        <MenuIcon className="w-5 h-5" />
                    </button>
                )}
                {/* Active Tasks Section */}
                <div className="flex items-center gap-2">
                    {activeTasks.map(task => {
                        const isActive = activeTaskId === task.id;
                        return (
                            <div
                                key={task.id}
                                onClick={() => onSelectTask(task.id)}
                                className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap group ${isActive ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-white/50 border-gray-200 hover:border-gray-300'}`}
                            >
                                <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-cyan-600' : 'bg-gray-300'}`}></div>
                                <span className={`text-[11px] font-bold uppercase tracking-tight ${isActive ? 'text-gray-900' : 'text-gray-500 group-hover:text-cyan-700'}`}>{task.name}</span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onCloseTask(task.id); }}
                                    className="hover:text-red-500 opacity-20 hover:opacity-100 transition-all ml-1"
                                >
                                    <ChevronDownIcon className="w-3 h-3 rotate-45" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            </nav>
        </header>
    );
};
