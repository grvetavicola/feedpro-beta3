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
            <div className="absolute inset-0 pointer-events-none select-none">
                {/* Capa Base C (Centro expandido) */}
                <div 
                    className="absolute inset-0"
                    style={{
                        backgroundImage: 'url("/banner C.jpg")',
                        backgroundSize: '100% 100%',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat'
                    }}
                />
                {/* Logo FeedPro (Centro Absoluto encima de Banners) */}
                <div className="absolute inset-0 flex items-center justify-center z-10 mix-blend-screen opacity-90 pr-6">
                    <img src="/FeedPro-sinfondo.PNG" alt="FeedPro 360" className="max-h-[38px] object-contain drop-shadow-xl" />
                </div>
                {/* Logo A (Izquierda) */}
                <div 
                    className="absolute left-0 top-0 h-full w-[40%]"
                    style={{
                        backgroundImage: 'url("/banner A.jpg")',
                        backgroundSize: 'auto 105%',
                        backgroundPosition: 'left center',
                        backgroundRepeat: 'no-repeat',
                        WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
                        maskImage: 'linear-gradient(to right, black 80%, transparent 100%)'
                    }}
                />
                {/* Logo B (Derecha) */}
                <div 
                    className="absolute right-0 top-0 h-full w-[40%]"
                    style={{
                        backgroundImage: 'url("/banner B.jpg")',
                        backgroundSize: 'auto 105%',
                        backgroundPosition: 'right center',
                        backgroundRepeat: 'no-repeat',
                        WebkitMaskImage: 'linear-gradient(to left, black 80%, transparent 100%)',
                        maskImage: 'linear-gradient(to left, black 80%, transparent 100%)'
                    }}
                />
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
