import React from 'react';
import { useTranslations } from '../lib/i18n/LangContext';
import { DatabaseIcon, CubeIcon, CalculatorIcon, TrendingUpIcon } from './icons';

interface GroupResultsScreenProps {
    results: any; // Result from solveGroupFormulation
    assignments: { productId: string, batchSize: number }[];
    products: any[];
    ingredients: any[];
}

export const GroupResultsScreen: React.FC<GroupResultsScreenProps> = ({ results, assignments, products, ingredients }) => {
    const { t } = useTranslations();

    if (!results || !results.feasible) {
        return (
            <div className="p-20 text-center text-red-400 font-bold uppercase tracking-widest bg-red-950/20 rounded-3xl border border-red-500/20">
                La optimización grupal falló: Solución Inviable.
            </div>
        );
    }

    return (
        <div className="p-3 space-y-3 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div className="bg-gradient-to-r from-emerald-900/60 to-cyan-900/40 p-4 rounded-xl border border-emerald-500/40 shadow-lg shadow-emerald-900/20 w-full md:w-auto">
                    <h2 className="text-[12px] text-emerald-200 uppercase tracking-[0.2em] font-black flex items-center gap-2"><DatabaseIcon className="w-4 h-4"/> Lote Multi-Mezcla Terminado</h2>
                    <p className="text-2xl font-black text-white mt-1 leading-none">{assignments.length} <span className="text-emerald-400">Productos Óptimos</span></p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md w-full md:w-auto flex flex-col justify-center">
                    <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest">Costo Total del Grupo Operativo</p>
                    <p className="text-3xl font-black text-cyan-400 font-mono mt-1">${results.result.toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {assignments.map((assign, i) => {
                    const product = products.find(p => p.id === assign.productId);
                    const productItems = Object.entries(results || {})
                        .filter(([key, val]) => key.endsWith(`_${assign.productId}`) && typeof val === 'number' && val > 0.0001)
                        .map(([key, val]) => {
                             const ingId = key.split('_')[0];
                             const percentage = val as number;
                             const weight = (percentage / 100) * assign.batchSize;
                             const ing = ingredients.find(i => i.id === ingId);
                             return { 
                                 name: ing?.name || 'Ingrediente Desconocido',
                                 percentage,
                                 weight
                             };
                        })
                        .sort((a,b) => b.percentage - a.percentage);

                    return (
                        <div className="flex flex-col h-full" key={i}>
                            <div className="bg-gray-800/80 border border-gray-700/80 p-5 rounded-2xl shadow-xl flex flex-col h-full hover:border-emerald-500/30 transition-all group overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-12 bg-emerald-500/5 rounded-full -mr-10 -mt-10 blur-3xl group-hover:bg-cyan-500/10 transition-colors"></div>
                                <h4 className="font-black text-white uppercase text-lg mb-1 z-10 relative">{product?.name}</h4>
                                <p className="text-sm text-gray-400 font-black uppercase tracking-widest mb-4 z-10 relative">Lote: <span className="text-emerald-400">{assign.batchSize.toLocaleString()} kg</span></p>
                                
                                <div className="flex-1 overflow-y-auto mb-4 pr-2 custom-scrollbar z-10 relative bg-gray-900/50 rounded-xl border border-gray-700/50 p-2">
                                    <table className="w-full text-left">
                                        <thead className="text-[10px] uppercase font-black text-gray-500 border-b border-gray-700">
                                            <tr>
                                                <th className="pb-2">Ingrediente Asignado</th>
                                                <th className="pb-2 text-right">Inclusión %</th>
                                                <th className="pb-2 text-right">Volumen</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-[13px] text-gray-300">
                                            {productItems.map((item, idx) => (
                                                <tr key={idx} className="border-b border-gray-700/20 last:border-0 hover:bg-gray-700/40">
                                                    <td className="py-2.5 truncate max-w-[140px] font-bold text-gray-100" title={item.name}>{item.name}</td>
                                                    <td className="py-2.5 text-right font-mono text-emerald-400 font-bold">{item.percentage.toFixed(2)}%</td>
                                                    <td className="py-2.5 text-right font-mono text-cyan-400 font-bold">{item.weight.toFixed(2)} kg</td>
                                                </tr>
                                            ))}
                                            {productItems.length === 0 && (
                                                <tr><td colSpan={3} className="py-6 text-center text-gray-500 italic bg-gray-900/50 rounded-lg mt-2">No se formularon ingredientes para esta dieta</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="space-y-3 z-10 relative mt-auto bg-gray-900 p-3 rounded-xl border border-emerald-900/30">
                                    <p className="text-[11px] text-emerald-400 font-black uppercase tracking-widest flex items-center justify-between">
                                        <span className="flex items-center gap-1.5"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> ESTADO: ÓPTIMO</span>
                                        <span className="text-gray-400">{productItems.length} Elementos</span>
                                    </p>
                                    <div className="h-1.5 bg-gray-950 rounded-full overflow-hidden shadow-inner border border-gray-800">
                                        <div className="h-full bg-gradient-to-r from-emerald-600 to-cyan-500" style={{width: '100%'}}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="bg-gray-900/50 border border-gray-800 p-3 rounded text-center">
                <p className="text-gray-500 italic text-[11px]">Este reporte beta demuestra la factibilidad de manufactura combinada.</p>
            </div>
        </div>
    );
};
