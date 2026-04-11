import React from 'react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { XIcon, TrendingUpIcon, FormulateIcon, ClockIcon } from './icons';

// --- MOCK DATA PARA LA LINEA DE TIEMPO HISTORICA ---
const HISTORY_CHART_DATA = [
    { date: 'Gen 15', pollos: 345, cerdos: 290, vacuno: 180 },
    { date: 'Gen 30', pollos: 350, cerdos: 285, vacuno: 185 },
    { date: 'Feb 15', pollos: 360, cerdos: 295, vacuno: 190 },
    { date: 'Feb 28', pollos: 355, cerdos: 300, vacuno: 195 },
    { date: 'Mar 15', pollos: 370, cerdos: 310, vacuno: 192 },
    { date: 'Mar 30', pollos: 365, cerdos: 315, vacuno: 198 },
];

const HISTORY_LOG_TABLE = [
    { id: 'h1', date: '2026-03-30 14:15', name: 'Iniciador Pollos (Beta)', cost: 365.20, variance: -1.35, isUp: false },
    { id: 'h2', date: '2026-03-30 10:20', name: 'Engorde Cerdos Plus', cost: 315.40, variance: +1.61, isUp: true },
    { id: 'h3', date: '2026-03-15 09:30', name: 'Iniciador Pollos (Beta)', cost: 370.00, variance: +4.22, isUp: true },
    { id: 'h4', date: '2026-03-15 08:45', name: 'Engorde Cerdos Plus', cost: 310.40, variance: +3.46, isUp: true },
    { id: 'h5', date: '2026-02-28 16:50', name: 'Lechero Alta Prod.', cost: 195.10, variance: +2.63, isUp: true },
];

interface FormulationHistoryModalProps {
    onClose: () => void;
}

export const FormulationHistoryModal: React.FC<FormulationHistoryModalProps> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center animate-fade-in p-4 sm:p-6 pb-20 pt-10">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
            
            {/* Modal Container */}
            <div className="relative w-full max-w-5xl bg-gray-950 border border-cyan-900/50 rounded-3xl shadow-[0_0_50px_rgba(8,145,178,0.2)] flex flex-col overflow-hidden max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/80">
                    <div className="flex items-center gap-3">
                        <div className="bg-cyan-500/20 p-2 rounded-xl text-cyan-400">
                            <ClockIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-widest leading-none">Registro Histórico Definitivo</h2>
                            <p className="text-[11px] text-gray-400 font-bold tracking-[0.2em] uppercase mt-1">Línea temporal de optimizaciones</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-800 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors text-gray-400">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    
                    {/* Visualización Recharts - LineChart Histórico Dieta */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col p-5 shadow-lg hover:shadow-cyan-900/10 transition-shadow min-h-[350px]">
                        <div className="flex justify-between items-center mb-6 shrink-0">
                            <div>
                                <h3 className="text-[14px] font-black text-white uppercase tracking-widest">Fluctuación Global de Costos de Formulas</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Evolución de costo operativo de dietas base ($/TON) a 3 meses</p>
                            </div>
                            <span className="bg-gray-800 text-gray-400 border border-gray-700 px-3 py-1 rounded text-[10px] font-black tracking-widest uppercase">
                                Simulador Ignorado
                            </span>
                        </div>
                        
                        <div className="flex-1 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={HISTORY_CHART_DATA} margin={{ top: 10, right: 30, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                                    <XAxis dataKey="date" stroke="#9ca3af" tick={{fontSize: 11, fontWeight: 'bold'}} tickLine={false} axisLine={false} />
                                    <YAxis 
                                        stroke="#6b7280" 
                                        tick={{fontSize: 10, fontWeight: 'bold'}} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        domain={['auto', 'auto']}
                                    />
                                    <Tooltip 
                                        formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name.toString().toUpperCase()]}
                                        contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}
                                        itemStyle={{ textTransform: 'uppercase', paddingBottom: '4px' }}
                                        labelStyle={{ color: '#9ca3af', marginBottom: '8px' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} />
                                    
                                    <Line type="monotone" dataKey="pollos" name="Dietas Aves" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                                    <Line type="monotone" dataKey="cerdos" name="Dietas Porcinos" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                                    <Line type="monotone" dataKey="vacuno" name="Dietas Rumiantes" stroke="#f59e0b" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Fila 2: Tabla de Registros Paginada */}
                    <div>
                        <h3 className="text-[11px] font-black text-cyan-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                             <TrendingUpIcon className="w-4 h-4 text-cyan-500" /> Log de Optimizaciones Definitivas Autorizadas
                        </h3>
                        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-inner">
                            <table className="w-full text-left">
                                <thead className="bg-gray-950/50 text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3 border-b border-gray-800">Timestamp Registro</th>
                                        <th className="px-4 py-3 border-b border-gray-800">Nombre de Venta</th>
                                        <th className="px-4 py-3 border-b border-gray-800 text-right">Costo Autorizado</th>
                                        <th className="px-4 py-3 border-b border-gray-800 text-right">Variación Estándar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/60 text-sm">
                                    {HISTORY_LOG_TABLE.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-800/50 transition-colors">
                                            <td className="px-4 py-3 text-gray-300 font-mono font-bold tracking-tight text-[12px] whitespace-nowrap">
                                                {log.date} <span className="ml-1 px-1 py-0.5 bg-gray-800 text-[9px] rounded text-gray-500 uppercase">Rev.</span>
                                            </td>
                                            <td className="px-4 py-3 font-black text-white uppercase tracking-wide">{log.name}</td>
                                            <td className="px-4 py-3 text-right font-mono text-cyan-400 font-bold tracking-tight text-[15px]">
                                                ${parseFloat(log.cost.toString()).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded text-[11px] uppercase tracking-wider ${log.isUp ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                    {log.isUp ? '🔺' : '🔻'} {Math.abs(log.variance)}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                       <div className="mt-2 flex justify-end">
                             <button className="text-[10px] text-cyan-500 hover:text-cyan-300 font-bold tracking-widest uppercase hover:underline transition-colors">Cargar Historial Anterior</button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
