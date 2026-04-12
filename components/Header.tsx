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
            <div className="absolute inset-0 pointer-events-none select-none bg-[#09152b]">
                {/* Logo A (Izquierda) */}
                <div 
                    className="absolute left-0 top-0 h-full w-[45%] z-0"
                    style={{
                        backgroundImage: 'url("/banner A.jpg")',
                        backgroundSize: 'cover',
                        backgroundPosition: 'left center',
                        backgroundRepeat: 'no-repeat',
                        WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)',
                        maskImage: 'linear-gradient(to right, black 85%, transparent 100%)'
                    }}
                />
                
                {/* Logo B (Derecha - Solución Distorsión y Línea Blanca) */}
                <div 
                    className="absolute right-0 top-0 h-[110%] w-[45%] z-0" 
                    style={{
                        backgroundImage: 'url("/banner B.jpg")',
                        backgroundSize: 'cover', /* Cover evita el aplastamiento horizontal y el estiramiento raro */
                        backgroundPosition: 'right 15%', /* Alineado para que muestre AVICULTURA 360 impecable */
                        backgroundRepeat: 'no-repeat',
                        WebkitMaskImage: 'linear-gradient(to left, black 75%, transparent 100%)',
                        maskImage: 'linear-gradient(to left, black 75%, transparent 100%)'
                    }}
                />

                {/* Capa Base C (Centro expandido) */}
                <div 
                    className="absolute inset-0 z-10"
                    style={{
                        backgroundImage: 'url("/banner C.jpg")',
                        backgroundSize: '100% 110%',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        WebkitMaskImage: 'linear-gradient(to right, transparent 20%, black 40%, black 60%, transparent 80%)',
                        maskImage: 'linear-gradient(to right, transparent 20%, black 40%, black 60%, transparent 80%)'
                    }}
                />
                
                {/* Parche difuminador para Ocultar el Logo blanco "FEEDPRO 360" grabado/quemado adentro de banner C.jpg */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 h-full w-[250px] z-[15] backdrop-blur-[6px] backdrop-brightness-50 bg-[#09152b]/40 rounded-[100%] scale-y-150 opacity-90 blur-xl"></div>

                {/* Logo FeedPro (A la Izquierda, Sin blend-screen para que no desaparezca, Celeste puro brillante) */}
                <div className="absolute left-[20%] lg:left-[18%] xl:left-[15%] top-1/2 -translate-y-1/2 z-20 overflow-visible">
                    <img 
                        src="/FeedPro-sinfondo.PNG" 
                        alt="FeedPro 360" 
                        className="w-[160px] max-w-[25vw] object-contain drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] opacity-100" 
                        style={{ filter: "brightness(0) saturate(100%) invert(75%) sepia(50%) saturate(6000%) hue-rotate(150deg) brightness(120%)" }}
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
