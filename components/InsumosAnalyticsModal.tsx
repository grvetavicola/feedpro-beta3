import React, { useState } from 'react';
import { 
    LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { XIcon, TrendingUpIcon, RefreshIcon, DatabaseIcon, FlaskIcon } from './icons';

// --- MOCK DATA ---
const PRICE_TREND_DATA = [
    { month: 'Oct', maiz: 180, soja: 450, trigo: 210 },
    { month: 'Nov', maiz: 185, soja: 460, trigo: 205 },
    { month: 'Dic', maiz: 195, soja: 480, trigo: 220 },
    { month: 'Ene', maiz: 190, soja: 470, trigo: 215 },
    { month: 'Feb', maiz: 200, soja: 490, trigo: 230 },
    { month: 'Mar', maiz: 210, soja: 510, trigo: 245 },
];

const BURN_DOWN_DATA = [
    { name: 'Maíz', days: 12, threshold: 15 },
    { name: 'Soja', days: 28, threshold: 15 },
    { name: 'Trigo', days: 8, threshold: 15 },
    { name: 'Sorgo', days: 45, threshold: 15 },
];

const CRITICAL_ITEMS = [
    { id: '1', name: 'Trigo', stock: '4,500 kg', dailyCons: '560 kg/día', daysLeft: 8, status: 'Crítico' },
    { id: '2', name: 'Maíz', stock: '12,000 kg', dailyCons: '1,000 kg/día', daysLeft: 12, status: 'Atención' },
];

interface InsumosAnalyticsModalProps {
    onClose: () => void;
}

export const InsumosAnalyticsModal: React.FC<InsumosAnalyticsModalProps> = ({ onClose }) => {
    
    // Quick action UI state
    const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

    const handleUpdate = (id: string) => {
        setUpdatingItemId(id);
        setTimeout(() => setUpdatingItemId(null), 1000);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center animate-fade-in p-4 sm:p-6 pb-20 pt-10">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
            
            {/* Modal Container */}
            <div className="relative w-full max-w-5xl bg-gray-950 border border-gray-700 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/80">
                    <div className="flex items-center gap-3">
                        <div className="bg-cyan-500/20 p-2 rounded-xl text-cyan-400">
                            <FlaskIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-widest leading-none">Análisis Táctico de Insumos</h2>
                            <p className="text-[11px] text-gray-400 font-bold tracking-[0.2em] uppercase mt-1">Intelligence Dashboard</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-800 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors text-gray-400">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    
                    {/* Fila 1: KPIs Rápidos */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-inner flex items-start gap-4 hover:border-emerald-500/30 transition-colors">
                            <div className="bg-emerald-900/40 p-3 rounded-xl text-emerald-400 mt-1"><DatabaseIcon className="w-6 h-6" /></div>
                            <div>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Valor de Inventario</p>
                                <p className="text-3xl font-mono font-black text-white mt-1">$450,200</p>
                                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest mt-1">🔺 +12% VS MES ANTERIOR</p>
                            </div>
                        </div>

                        <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-inner flex items-start gap-4 hover:border-cyan-500/30 transition-colors">
                            <div className="bg-cyan-900/40 p-3 rounded-xl text-cyan-400 mt-1"><TrendingUpIcon className="w-6 h-6" /></div>
                            <div>
                                <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Cobertura Promedio</p>
                                <p className="text-3xl font-mono font-black text-white mt-1">45 <span className="text-sm text-gray-500">Días</span></p>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">ÍNDICE DE ROTACIÓN NORMAL</p>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-red-900/20 to-orange-900/10 border border-red-900/50 p-4 rounded-2xl shadow-inner flex items-start gap-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 rounded-full bg-red-500/10 blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                            <div className="bg-red-500/20 p-3 rounded-xl text-red-500 mt-1 animate-pulse"><TrendingUpIcon className="w-6 h-6" /></div>
                            <div className="relative z-10">
                                <p className="text-[10px] text-red-400/80 font-black uppercase tracking-widest">Alertas de Agotamiento</p>
                                <p className="text-3xl font-mono font-black text-red-400 mt-1">2 <span className="text-sm text-red-400/50">Críticos</span></p>
                                <p className="text-[10px] text-red-300 font-bold uppercase tracking-widest mt-1">Requiere Compras Inmediatas</p>
                            </div>
                        </div>
                    </div>

                    {/* Fila 2: Visualizaciones de Recharts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[320px]">
                        
                        {/* CHART: Historico de Precios */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col p-4 shadow-lg hover:shadow-cyan-900/10 transition-shadow">
                            <div className="flex justify-between items-center mb-4 shrink-0">
                                <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Tendencia de Costos (6 Meses)</h3>
                                <span className="px-2 py-0.5 bg-gray-800 text-gray-400 border border-gray-700 rounded text-[9px] uppercase font-bold tracking-widest">USD / Tonelada</span>
                            </div>
                            <div className="flex-1 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={PRICE_TREND_DATA} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                        <XAxis dataKey="month" stroke="#6B7280" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#6B7280" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                                            itemStyle={{ textTransform: 'uppercase' }}
                                        />
                                        <Line type="monotone" dataKey="soja" name="Soja" stroke="#8b5cf6" strokeWidth={3} dot={{r:3}} activeDot={{r: 5}} />
                                        <Line type="monotone" dataKey="maiz" name="Maíz" stroke="#f59e0b" strokeWidth={3} dot={{r:3}} activeDot={{r: 5}} />
                                        <Line type="monotone" dataKey="trigo" name="Trigo" stroke="#10b981" strokeWidth={3} dot={{r:3}} activeDot={{r: 5}} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* CHART: Burn Down */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col p-4 shadow-lg hover:shadow-cyan-900/10 transition-shadow">
                            <div className="flex justify-between items-center mb-4 shrink-0">
                                <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Proyección de Agotamiento</h3>
                                <span className="px-2 py-0.5 bg-gray-800 text-gray-400 border border-gray-700 rounded text-[9px] uppercase font-bold tracking-widest">Días Restantes vs Límite</span>
                            </div>
                            <div className="flex-1 w-full relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={BURN_DOWN_DATA} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                        <XAxis type="number" stroke="#6B7280" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                                        <YAxis dataKey="name" type="category" stroke="#9CA3AF" tick={{fontSize: 11, fontWeight: 'bold'}} tickLine={false} axisLine={false} />
                                        <Tooltip 
                                            cursor={{fill: '#1f2937'}}
                                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                                        />
                                        {/* Reference vertical line for safety threshold could go here but using a bar fill strategy instead */}
                                        <Bar dataKey="days" name="Días Existencia" radius={[0, 4, 4, 0]} barSize={24}>
                                            {BURN_DOWN_DATA.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.days <= entry.threshold ? '#ef4444' : '#0ea5e9'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Fila 3: Tabla de Agilidad (Críticos) */}
                    <div>
                        <h3 className="text-[11px] font-black text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                             <TrendingUpIcon className="w-4 h-4 text-red-500" /> Detalle de Reabastecimiento Crítico
                        </h3>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-inner">
                            <table className="w-full text-left">
                                <thead className="bg-gray-950/50 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">Insumo Base</th>
                                        <th className="px-4 py-3">Estado</th>
                                        <th className="px-4 py-3">Stock Actual</th>
                                        <th className="px-4 py-3">Tasa C. Diaria</th>
                                        <th className="px-4 py-3">Días Restantes</th>
                                        <th className="px-4 py-3 text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 text-sm">
                                    {CRITICAL_ITEMS.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-800/50 transition-colors group">
                                            <td className="px-4 py-3 font-bold text-white uppercase tracking-wide">{item.name}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${item.status === 'Crítico' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-gray-300 font-bold">{item.stock}</td>
                                            <td className="px-4 py-3 font-mono text-gray-500">{item.dailyCons}</td>
                                            <td className="px-4 py-3 font-mono font-black text-xl text-white">{item.daysLeft}</td>
                                            <td className="px-4 py-3 text-right">
                                                <button 
                                                    onClick={() => handleUpdate(item.id)}
                                                    disabled={updatingItemId === item.id}
                                                    className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${updatingItemId === item.id ? 'bg-emerald-600 text-white border border-emerald-500 scale-95' : 'bg-gray-800 hover:bg-cyan-900 border border-gray-700 hover:border-cyan-500 text-gray-300 hover:text-cyan-400'}`}
                                                >
                                                    {updatingItemId === item.id ? 'Renovado' : 'Ajustar Inventario'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
