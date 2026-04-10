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
    onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    activeView, 
    onViewChange, 
    user,
    activeTasks,
    activeTaskId,
    onSelectTask,
    onCloseTask,
    onLogout
}) => {
    const { t } = useTranslations();

    const navItems: { id: ViewState; label: string; icon: any; color: string }[] = [
        { id: 'DASHBOARD', label: 'Inicio', icon: BeakerIcon, color: 'text-blue-400' },
        { id: 'INGREDIENTS', label: 'Insumos', icon: IngredientsIcon, color: 'text-green-400' },
        { id: 'NUTRIENTS', label: 'Nutrientes', icon: NutrientsIcon, color: 'text-purple-400' },
        { id: 'PRODUCTS', label: 'Productos', icon: ProductsIcon, color: 'text-indigo-400' },
        { id: 'OPTIMIZATION', label: 'Formular', icon: FormulateIcon, color: 'text-cyan-400' },
        { id: 'GROUP_OPTIMIZATION', label: 'Opt. Grupal', icon: DatabaseIcon, color: 'text-emerald-400' },
        { id: 'SIMULATION', label: 'Simular', icon: TruckIcon, color: 'text-yellow-400' },
        { id: 'SETTINGS', label: 'Ajustes', icon: GlobeIcon, color: 'text-gray-400' },
    ];

    return (
        <header className="shrink-0 h-14 bg-gray-950 border-b border-gray-800 z-50 flex items-center px-4 gap-6 relative">
            {/* Logo */}
            <div className="flex items-center shrink-0 pr-4">
                <img src="/feedpro.png" alt="FeedPro 360" className="h-10 object-contain drop-shadow-md hidden sm:block" />
                <img src="/feedpro.png" alt="FeedPro 360" className="h-10 object-cover w-10 drop-shadow-md sm:hidden object-left" />
            </div>

            {/* Main Navigation */}
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth flex-1">
                {navItems.map(item => {
                    const isActive = activeView === item.id && !activeTaskId;
                    return (
                        <button
                            key={item.id}
                            onClick={() => { onSelectTask(null); onViewChange(item.id); }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${isActive ? 'bg-gray-800 text-cyan-400 border border-gray-700' : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'}`}
                        >
                            <item.icon className={`w-4 h-4 ${isActive ? item.color : 'text-gray-500'}`} />
                            <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
                        </button>
                    );
                })}

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
                    onClick={onLogout}
                    title="Cerrar sesión"
                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-red-900 border border-gray-700 hover:border-red-500 transition-colors flex items-center justify-center cursor-pointer group"
                >
                    <UserIcon className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                </button>
            </div>
        </header>
    );
};
