import React from 'react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { XIcon, FlaskIcon, DatabaseIcon } from './icons';

// --- MOCK DATA ---
const CATEGORY_SUMMARY = [
    { id: '1', name: 'Crianza', count: 12, avgCost: 345.50, dominant: 'Maíz Grano - 55%' },
    { id: '2', name: 'Desarrollo', count: 8, avgCost: 310.20, dominant: 'Maíz Grano - 62%' },
    { id: '3', name: 'Engorde final', count: 15, avgCost: 290.80, dominant: 'Sorgo - 45%' },
    { id: '4', name: 'Reproductoras', count: 4, avgCost: 405.10, dominant: 'Harina de Soja - 38%' },
    { id: '5', name: 'Sin Categoría', count: 2, avgCost: 350.00, dominant: 'Trigo - 50%' },
];

const INCLUSION_MATRIX_DATA = [
    { category: 'Crianza', maiz: 55, soja: 25, trigo: 5, aceite: 3, micros: 12 },
    { category: 'Desarrollo', maiz: 62, soja: 20, trigo: 8, aceite: 2, micros: 8 },
    { category: 'Engorde', maiz: 45, soja: 15, trigo: 25, aceite: 5, micros: 10 },
    { category: 'Reprod.', maiz: 40, soja: 38, trigo: 5, aceite: 2, micros: 15 },
    { category: 'Sin Cat.', maiz: 30, soja: 20, trigo: 40, aceite: 1, micros: 9 },
];

interface DietStructureModalProps {
    onClose: () => void;
}

export const DietStructureModal: React.FC<DietStructureModalProps> = ({ onClose }) => {
    
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center animate-fade-in p-4 sm:p-6 pb-20 pt-10">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
            
            {/* Modal Container */}
            <div className="relative w-full max-w-5xl bg-gray-950 border border-indigo-900/50 rounded-3xl shadow-[0_0_50px_rgba(49,46,129,0.3)] flex flex-col overflow-hidden max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/80">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-400">
                            <FlaskIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-widest leading-none">Estructura Nutricional de Dietas</h2>
                            <p className="text-[11px] text-gray-400 font-bold tracking-[0.2em] uppercase mt-1">Intelligence Dashboard</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-800 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors text-gray-400">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    
                    {/* Fila 1: Resumen de Agrupación (Tabla) */}
                    <div>
                        <h3 className="text-[11px] font-black text-indigo-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                             <DatabaseIcon className="w-4 h-4 text-indigo-400" /> Resumen de Familias de Formulación
                        </h3>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-inner hidden md:block">
                            <table className="w-full text-left">
                                <thead className="bg-gray-950/50 text-[10px] text-gray-400 font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-gray-800">Categoría Operativa</th>
                                        <th className="px-4 py-3 border-b border-gray-800 text-center">Fórmulas Definidas</th>
                                        <th className="px-4 py-3 border-b border-gray-800 text-right">Costo Lote (Medio)</th>
                                        <th className="px-4 py-3 border-b border-gray-800">Insumo Dominante (Inclusión Media)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/60 text-sm">
                                    {CATEGORY_SUMMARY.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-3 font-black text-indigo-100 uppercase tracking-wide">{item.name}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="bg-indigo-500/20 text-indigo-300 font-mono font-bold px-2 py-0.5 rounded text-[12px]">{item.count}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-emerald-400 font-bold tracking-tight">${item.avgCost.toFixed(2)}</td>
                                            <td className="px-4 py-3 font-bold text-gray-300">
                                                <span className="text-gray-400 border border-gray-700 bg-gray-950/50 px-2 py-1 rounded-md text-[10px] uppercase font-black tracking-wider">
                                                    {item.dominant}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Fila 2: Visualizaciones Stacked de Recharts */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col p-5 shadow-lg hover:shadow-indigo-900/20 transition-shadow min-h-[400px]">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <div>
                                <h3 className="text-[14px] font-black text-white uppercase tracking-widest">Matriz de Inclusión por Grupo</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Porcentaje Acumulativo de Insumos Base (Formulación 100%)</p>
                            </div>
                        </div>
                        
                        <div className="flex-1 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={INCLUSION_MATRIX_DATA} margin={{ top: 20, right: 30, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                    <XAxis dataKey="category" stroke="#9ca3af" tick={{fontSize: 11, fontWeight: 'bold'}} tickLine={false} axisLine={false} />
                                    <YAxis 
                                        stroke="#6b7280" 
                                        tick={{fontSize: 10}} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        domain={[0, 100]} 
                                        tickFormatter={(val) => `${val}%`}
                                    />
                                    <Tooltip 
                                        formatter={(value, name) => [`${value}%`, name.toString().toUpperCase()]}
                                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold' }}
                                        itemStyle={{ textTransform: 'uppercase', paddingBottom: '4px' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                                    
                                    <Bar dataKey="maiz" name="Maíz" stackId="a" fill="#fcd34d" radius={[0, 0, 4, 4]} />
                                    <Bar dataKey="soja" name="Soya / H.Soya" stackId="a" fill="#8b5cf6" />
                                    <Bar dataKey="trigo" name="Sorgo / Trigo" stackId="a" fill="#34d399" />
                                    <Bar dataKey="aceite" name="Aceites Vegetales" stackId="a" fill="#f472b6" />
                                    <Bar dataKey="micros" name="Premezcla / Otros" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
