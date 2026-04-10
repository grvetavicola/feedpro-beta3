import React from 'react';
import { useTranslations } from '../lib/i18n/LangContext';
import { DatabaseIcon, CubeIcon, CalculatorIcon, TrendingUpIcon, XCircleIcon } from './icons';

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

    const parsedAssignments = assignments.map(assign => {
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

        return { product, assign, productItems, isSuccessful: productItems.length > 0 };
    });

    const successfulProductsCount = parsedAssignments.filter(p => p.isSuccessful).length;
    const isTotalFailure = successfulProductsCount === 0;
    const displayTotalCost = isTotalFailure ? 0 : results.result;

    return (
        <div className="p-3 space-y-3 animate-fade-in flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div className={`p-4 rounded-xl border shadow-lg w-full md:w-auto ${isTotalFailure ? 'bg-gradient-to-r from-red-900/60 to-orange-900/40 border-red-500/40 shadow-red-900/20' : 'bg-gradient-to-r from-emerald-900/60 to-cyan-900/40 border-emerald-500/40 shadow-emerald-900/20'}`}>
                    <h2 className={`text-[12px] uppercase tracking-[0.2em] font-black flex items-center gap-2 ${isTotalFailure ? 'text-red-200' : 'text-emerald-200'}`}>
                        <DatabaseIcon className="w-4 h-4"/> {isTotalFailure ? 'OPTIMIZACIÓN GRUPAL FALLIDA' : 'Lote Multi-Mezcla Terminado'}
                    </h2>
                    <p className="text-2xl font-black text-white mt-1 leading-none">{successfulProductsCount} <span className={isTotalFailure ? 'text-red-400' : 'text-emerald-400'}>Productos Óptimos</span> de {assignments.length}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md w-full md:w-auto flex flex-col justify-center">
                    <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest">Costo Total del Grupo Operativo</p>
                    <p className={`text-3xl font-black font-mono mt-1 ${isTotalFailure ? 'text-gray-500' : 'text-cyan-400'}`}>${displayTotalCost.toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
                {parsedAssignments.map(({ product, assign, productItems, isSuccessful }, i) => {
                    return (
                        <div className="flex flex-col h-full min-h-[350px]" key={i}>
                            <div className={`border p-5 rounded-2xl shadow-xl flex flex-col h-full transition-all group overflow-hidden relative ${isSuccessful ? 'bg-gray-800/80 border-gray-700/80 hover:border-emerald-500/30' : 'bg-red-950/20 border-red-900/50 hover:border-red-500/50'}`}>
                                <div className={`absolute top-0 right-0 p-12 rounded-full -mr-10 -mt-10 blur-3xl transition-colors ${isSuccessful ? 'bg-emerald-500/5 group-hover:bg-cyan-500/10' : 'bg-red-500/10 group-hover:bg-red-500/20'}`}></div>
                                <h4 className="font-black text-white uppercase text-lg mb-1 z-10 relative">{product?.name}</h4>
                                <p className="text-sm text-gray-400 font-black uppercase tracking-widest mb-4 z-10 relative">Lote: <span className={isSuccessful ? 'text-emerald-400' : 'text-red-400'}>{assign.batchSize.toLocaleString()} kg</span></p>
                                
                                <div className="flex-1 overflow-y-auto mb-4 pr-2 custom-scrollbar z-10 relative bg-gray-900/50 rounded-xl border border-gray-700/50 p-2 min-h-[140px] max-h-[300px]">
                                    <table className="w-full text-left">
                                        <thead className="text-[10px] uppercase font-black text-gray-300 border-b border-gray-600">
                                            <tr>
                                                <th className="pb-2">Ingrediente Asignado</th>
                                                <th className="pb-2 text-right">Inclusión %</th>
                                                <th className="pb-2 text-right">Volumen</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-[13px] text-gray-200">
                                            {productItems.map((item, idx) => (
                                                <tr key={idx} className="border-b border-gray-700/40 last:border-0 hover:bg-gray-700/60 transition-colors">
                                                    <td className="py-2.5 truncate max-w-[140px] font-bold text-white" title={item.name}>{item.name}</td>
                                                    <td className="py-2.5 text-right font-mono text-emerald-300 font-bold">{item.percentage.toFixed(2)}%</td>
                                                    <td className="py-2.5 text-right font-mono text-cyan-300 font-bold">{item.weight.toFixed(2)} kg</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {!isSuccessful && (
                                        <div className="flex flex-col items-center justify-center p-6 text-center mt-4">
                                            <XCircleIcon className="w-10 h-10 text-red-500/50 mb-3" />
                                            <p className="text-[14px] text-red-400 font-black uppercase tracking-wide">Fórmula Infactible</p>
                                            <p className="text-xs text-gray-500 mt-1">No se formularon ingredientes para esta dieta.</p>
                                        </div>
                                    )}
                                </div>

                                <div className={`space-y-3 z-10 relative mt-auto p-3 rounded-xl border ${isSuccessful ? 'bg-gray-900 border-emerald-900/30' : 'bg-red-950/40 border-red-900/50'}`}>
                                    <p className={`text-[11px] font-black uppercase tracking-widest flex items-center justify-between ${isSuccessful ? 'text-emerald-400' : 'text-red-400'}`}>
                                        <span className="flex items-center gap-1.5">
                                            <div className={`w-2 h-2 rounded-full ${isSuccessful ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div> 
                                            {isSuccessful ? 'ESTADO: ÓPTIMO' : 'ESTADO: FALLIDO'}
                                        </span>
                                        <span className="text-gray-400">{productItems.length} Elementos</span>
                                    </p>
                                    <div className="h-1.5 bg-gray-950 rounded-full overflow-hidden shadow-inner border border-gray-800">
                                        <div className={`h-full ${isSuccessful ? 'bg-gradient-to-r from-emerald-600 to-cyan-500' : 'bg-gray-700'}`} style={{width: isSuccessful ? '100%' : '0%'}}></div>
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
