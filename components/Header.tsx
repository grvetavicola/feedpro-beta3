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
    client
}) => {
    const { t } = useTranslations();

    return (
        <header className="shrink-0 h-20 border-b border-gray-800/60 z-50 flex items-center px-6 gap-6 relative overflow-hidden">
            {/* Banner FeedPro como fondo CSS controlado - ajustado a la derecha para mostrar la gallina completa */}
            <div
                className="absolute inset-0 pointer-events-none select-none"
                style={{
                    backgroundImage: 'url("/banner feedpro.jpg")',
                    backgroundSize: 'auto 100%',
                    backgroundPosition: 'right',
                    backgroundRepeat: 'no-repeat',
                }}
                aria-hidden="true"
            />
            {/* Overlays de oscurecimiento para legibilidad (más oscuro a la izquierda para el logo) */}
            <div className="absolute inset-0 bg-gray-950/60 pointer-events-none" />
            <div className="absolute top-0 left-0 w-80 h-full bg-gradient-to-r from-gray-950 to-transparent pointer-events-none" />

            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1 relative z-10 w-full pl-6">
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

            {/* Version Badge Top Right */}
            <div className="z-10 ml-auto bg-gray-900/70 backdrop-blur-sm border border-gray-700/60 py-1.5 px-3 rounded-xl flex items-center gap-2 shadow-inner shrink-0">
                <StarIcon className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] font-black uppercase tracking-widest text-gray-300">{APP_VERSION}</span>
            </div>
        </header>
    );
};
