import React from 'react';
import { useTranslations } from '../lib/i18n/LangContext';
import { GlobeIcon, MonitorIcon, DatabaseIcon, ShieldCheckIcon, SaveIcon, PlusIcon, UserIcon, TrashIcon, SearchIcon } from './icons';
import { Client, ViewState } from '../types';
import { APP_NAME } from '../constants';

interface SettingsScreenProps {
    clients: Client[];
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    onNavigate: (view: ViewState) => void;
    uiScale: number;
    setUiScale: (scale: number) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ clients, setClients, onNavigate, uiScale, setUiScale }) => {
    const { t, language, setLanguage } = useTranslations();
    const [newClientName, setNewClientName] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);
    
    const handleAddClient = () => {
        if (!newClientName) return;
        const newClient = { id: `c${Date.now()}`, name: newClientName };
        setClients([...clients, newClient]);
        setNewClientName('');
    };

    const handleSave = () => {
        setIsSaving(true);
        // Simulate persistence
        setTimeout(() => {
            setIsSaving(false);
            onNavigate('DASHBOARD');
        }, 1200);
    };

    const handleUpdateLogo = (clientId: string, logo: string) => {
        setClients(prev => prev.map(c => c.id === clientId ? { ...c, logo } : c));
    };
    
    return (
        <div className="p-3 space-y-6 animate-fade-in max-w-5xl mx-auto h-full overflow-y-auto custom-scrollbar pb-24">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Panel de <span className="text-cyan-400">Configuración</span></h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Gestión Central de la Plataforma {APP_NAME}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Gestión de Perfiles y Logos (Dominante) */}
                <div className="lg:col-span-2 bg-gray-900 shadow-2xl border border-gray-800 p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400">
                                <DatabaseIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white leading-none uppercase tracking-tighter">Perfiles de Clientes</h3>
                                <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">Editar identidades y logotipos</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <input 
                                value={newClientName}
                                onChange={(e) => setNewClientName(e.target.value)}
                                placeholder="Nombre del nuevo cliente..."
                                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-xs text-white focus:border-cyan-500 outline-none w-48"
                             />
                             <button 
                                onClick={handleAddClient}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg text-xs"
                             >
                                 <PlusIcon className="w-4 h-4" /> Añadir
                             </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {clients.map(client => (
                            <div key={client.id} className="bg-gray-800/40 border border-gray-700 p-4 rounded-2xl flex items-center gap-4 group hover:border-cyan-500/30 transition-all">
                                <div className="relative w-16 h-16 bg-gray-900 rounded-xl border border-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                                    {client.logo ? (
                                        <img src={client.logo} alt={client.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <UserIcon className="w-6 h-6 text-gray-700" />
                                    )}
                                    <label className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <SearchIcon className="w-4 h-4 text-cyan-400" />
                                        <span className="text-[8px] text-white font-black uppercase mt-1">Cargar</span>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onload = (ev) => handleUpdateLogo(client.id, ev.target?.result as string);
                                                reader.readAsDataURL(file);
                                            }}
                                        />
                                    </label>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">{client.id}</p>
                                    <h4 className="text-white font-bold truncate">{client.name}</h4>
                                    <button 
                                        onClick={() => setClients(prev => prev.filter(c => c.id !== client.id))}
                                        className="mt-1 text-[10px] text-red-500/70 hover:text-red-400 font-bold uppercase tracking-tighter"
                                    >
                                        Eliminar Perfil
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* 2. Language Section */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl space-y-4">

                        <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                            <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-400">
                                <GlobeIcon className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none">Localización</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => setLanguage('es')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${language === 'es' ? 'bg-indigo-900/40 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                            >
                                <span className="text-2xl">🇪🇸</span>
                                <span className="font-black uppercase tracking-widest text-[10px]">Español</span>
                            </button>
                            <button 
                                onClick={() => setLanguage('en')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${language === 'en' ? 'bg-indigo-900/40 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                            >
                                <span className="text-2xl">🇺🇸</span>
                                <span className="font-black uppercase tracking-widest text-[10px]">English</span>
                            </button>
                        </div>
                    </div>

                    {/* 3. Display Section */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                            <div className="bg-cyan-500/20 p-2 rounded-xl text-cyan-400">
                                <MonitorIcon className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none">Interfaz</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                 <label className="block text-[10px] text-gray-600 font-black uppercase mb-1 tracking-widest">Escala del Motor</label>
                                 <select 
                                    value={uiScale}
                                    onChange={(e) => setUiScale(parseFloat(e.target.value))}
                                    className="w-full bg-gray-950 border border-gray-800 text-gray-400 p-3 rounded-xl outline-none focus:border-cyan-500 font-bold text-xs appearance-none"
                                 >
                                     <option value={0.9}>90% (Ultra Compacto)</option>
                                     <option value={1.0}>100% (Estándar)</option>
                                     <option value={1.1}>110% (Panel Grande)</option>
                                 </select>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-950 rounded-xl border border-gray-800">
                                <span className="text-[10px] text-gray-500 font-black uppercase">Modo de Alto Rendimiento</span>
                                <div className="w-8 h-4 bg-emerald-600 rounded-full relative">
                                    <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Floating Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/80 backdrop-blur-md border-t border-gray-800 flex justify-center items-center gap-6 z-50">
                <button 
                    onClick={() => {
                        if(window.confirm('¿Estás seguro de restaurar y borrar tu perfil local? Se cargarán los insumos maestros nuevamente.')) {
                            localStorage.clear();
                            window.location.reload();
                        }
                    }}
                    className="text-red-500 hover:text-red-400 font-bold px-6 py-4 rounded-2xl hover:bg-red-500/10 transition-all text-xs uppercase tracking-widest border border-transparent hover:border-red-500/30"
                >
                    Restaurar Valores de Fábrica
                </button>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-cyan-600 to-cyan-400 text-white font-black px-12 py-4 rounded-2xl shadow-2xl shadow-cyan-900/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-[0.2em] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <>Procesando...</>
                    ) : (
                        <>
                            <SaveIcon className="w-5 h-5" /> Guardar y Regresar
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
