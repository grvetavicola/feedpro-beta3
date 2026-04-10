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
            <div className="flex justify-between items-end mb-3">
                <div className="bg-gray-800 px-4 py-2 rounded border border-gray-700 shadow-sm">
                    <h2 className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Lote Multi-Mezcla Terminado</h2>
                    <p className="text-lg font-black text-emerald-400 mt-0.5 leading-none">{assignments.length} Productos Óptimos</p>
                </div>
                <div className="bg-gray-800 px-4 py-2 rounded border border-gray-700 shadow-sm">
                    <p className="text-[10px] text-gray-500 font-black uppercase">Costo Total del Grupo</p>
                    <p className="text-lg font-black text-emerald-400 font-mono">${results.result.toLocaleString()}</p>
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
                            <div className="bg-gray-800/40 border border-gray-700/50 p-3 rounded relative overflow-hidden group h-full flex flex-col">
                                <div className="absolute top-0 right-0 p-8 bg-emerald-500/5 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                <h4 className="font-black text-white uppercase text-sm mb-1 z-10 relative">{product?.name}</h4>
                                <p className="text-xs text-gray-500 font-mono italic mb-3 z-10 relative">Lote: {assign.batchSize.toLocaleString()} kg</p>
                                
                                <div className="flex-1 overflow-y-auto mb-3 pr-1 custom-scrollbar z-10 relative min-h-[120px]">
                                    <table className="w-full text-left">
                                        <thead className="text-[9px] uppercase text-gray-500 border-b border-gray-700/50">
                                            <tr>
                                                <th className="pb-1">Ingrediente</th>
                                                <th className="pb-1 text-right">%</th>
                                                <th className="pb-1 text-right">Peso</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-[11px] text-gray-300">
                                            {productItems.map((item, idx) => (
                                                <tr key={idx} className="border-b border-gray-700/20 last:border-0 hover:bg-gray-700/20">
                                                    <td className="py-1 truncate max-w-[120px] font-medium" title={item.name}>{item.name}</td>
                                                    <td className="py-1 text-right font-mono text-emerald-400/80">{item.percentage.toFixed(2)}%</td>
                                                    <td className="py-1 text-right font-mono text-cyan-400">{item.weight.toFixed(2)} kg</td>
                                                </tr>
                                            ))}
                                            {productItems.length === 0 && (
                                                <tr><td colSpan={3} className="py-4 text-center text-gray-600 italic">No hay ingredientes asignados</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="space-y-2 border-t border-gray-700/50 pt-3 z-10 relative mt-auto">
                                    <p className="text-[10px] text-emerald-400/60 font-black uppercase tracking-widest flex items-center justify-between">
                                        <span>Estado: Óptimo</span>
                                        <span>{productItems.length} Elementos</span>
                                    </p>
                                    <div className="h-1 bg-gray-900 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500" style={{width: '100%'}}></div>
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
