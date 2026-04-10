import React, { useState, useEffect } from 'react';
import { useTranslations } from '../lib/i18n/LangContext';
import { DatabaseIcon, CubeIcon, CalculatorIcon, TrendingUpIcon, XCircleIcon, SettingsIcon, CheckIcon, XIcon, RefreshIcon } from './icons';
import { Product, Ingredient, Nutrient } from '../types';
import { solveFeedFormulation } from '../services/solver';

interface GroupResultsScreenProps {
    results: any; // Global solver run
    assignments: { productId: string, batchSize: number }[];
    products: Product[];
    ingredients: Ingredient[];
    nutrients: Nutrient[];
    isDynamicMatrix?: boolean;
    onUpdateProduct: (p: Product) => void;
}

// -----------------------------------------------------
// Reusing SmartInput inline for rapid constraint editing
// -----------------------------------------------------
const SmartInput = ({ value, onChange, placeholder, className, isMax = false }: { value: number, onChange: (v: number) => void, placeholder?: string, className?: string, isMax?: boolean }) => {
    const defaultDisplay = isMax && value === 999 ? '' : (value === 0 && !isMax ? '' : value.toString());
    const [localVal, setLocalVal] = useState<string>(defaultDisplay);

    useEffect(() => {
        setLocalVal(isMax && value === 999 ? '' : (value === 0 && !isMax ? '' : value.toString()));
    }, [value, isMax]);

    const handleBlur = () => {
        let parsed = localVal.trim();
        parsed = parsed.replace(/,/g, '.');
        if (parsed.startsWith('.')) parsed = '0' + parsed;
        const num = parseFloat(parsed);

        if (isNaN(num)) {
            if (isMax) { onChange(999); setLocalVal(''); } 
            else { onChange(0); setLocalVal(''); }
        } else {
            onChange(num);
            setLocalVal(num.toString());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    return (
        <input
            type="text"
            inputMode="decimal"
            value={localVal}
            onChange={(e) => setLocalVal(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || (isMax ? 'Max' : 'Min')}
            className={`w-16 bg-gray-900 border border-gray-700 text-white font-mono text-[13px] text-center rounded-md px-1 py-1 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder-gray-600 ${className}`}
        />
    );
};


export const GroupResultsScreen: React.FC<GroupResultsScreenProps> = ({ results, assignments, products, ingredients, nutrients, isDynamicMatrix = false, onUpdateProduct }) => {
    const { t } = useTranslations();
    
    // Custom Local State for Tracking Re-Optimizations
    type LocalResult = {
        isSuccessful: boolean;
        currentCost: number;
        prevCost: number | null;
        totalBatch: number;
        items: { name: string, percentage: number, weight: number }[];
    };
    const [localSolutions, setLocalSolutions] = useState<Record<string, LocalResult>>({});
    
    // UI State
    const [drawerProduct, setDrawerProduct] = useState<Product | null>(null);
    const [isOptimizingLocal, setIsOptimizingLocal] = useState(false);

    // Initialize local states from the global `results` payload
    useEffect(() => {
        if (!results || !results.feasible) return;
        
        const newLocal: Record<string, LocalResult> = {};
        
        assignments.forEach(assign => {
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
            
            const costOfItems = productItems.reduce((acc, item) => {
                 const ing = ingredients.find(i => i.name === item.name);
                 return acc + ((item.weight) * (ing?.price || 0));
            }, 0);

            newLocal[assign.productId] = {
                isSuccessful: productItems.length > 0,
                currentCost: costOfItems,
                prevCost: null, // No prev cost strictly on first load
                totalBatch: assign.batchSize,
                items: productItems
            };
        });
        
        setLocalSolutions(newLocal);
    }, [results, assignments, ingredients]);


    const handleLocalReoptimize = async (productId: string) => {
        const prod = products.find(p => p.id === productId);
        const assign = assignments.find(a => a.productId === productId);
        if(!prod || !assign) return;

        setIsOptimizingLocal(true);
        try {
            // Simulamos pequeña carga para feedback visual
            await new Promise(r => setTimeout(r, 400));
            
            const individualResult = solveFeedFormulation(prod, ingredients, nutrients, assign.batchSize, isDynamicMatrix);
            
            setLocalSolutions(prev => {
                const oldState = prev[prod.id];
                const newCost = individualResult.totalCost;
                
                const newItems = individualResult.items.map(it => {
                    const ing = ingredients.find(i => i.id === it.ingredientId);
                    return {
                        name: ing?.name || 'Desc',
                        percentage: it.percentage,
                        weight: it.weight
                    };
                });

                return {
                    ...prev,
                    [prod.id]: {
                        isSuccessful: newItems.length > 0,
                        currentCost: newCost,
                        prevCost: oldState?.currentCost || null,
                        totalBatch: assign.batchSize,
                        items: newItems
                    }
                }
            });
            
        } catch(e) {
            console.error(e);
        }
        setIsOptimizingLocal(false);
    };


    const handleConstraintChange = (productId: string, nutrientId: string, minMax: 'min' | 'max', val: number) => {
        const prod = products.find(p => p.id === productId);
        if(!prod) return;
        const newProd = {...prod};
        const cIdx = newProd.constraints.findIndex(c => c.nutrientId === nutrientId);
        if(cIdx >= 0) {
            newProd.constraints[cIdx] = { ...newProd.constraints[cIdx], [minMax]: val };
        } else {
            newProd.constraints.push({ nutrientId, min: minMax === 'min' ? val : 0, max: minMax === 'max' ? val : 999 });
        }
        onUpdateProduct(newProd);
    };

    if (!results || !results.feasible) {
        return (
            <div className="p-20 text-center text-red-400 font-bold uppercase tracking-widest bg-red-950/20 rounded-3xl border border-red-500/20">
                La optimización grupal falló a nivel matricial: Solución Inviable.
            </div>
        );
    }

    const successfulCount = Object.values(localSolutions).filter(sol => sol.isSuccessful).length;
    const isTotalFailure = assignments.length > 0 && successfulCount === 0;
    
    const displayTotalCost = Object.values(localSolutions).reduce((acc, curr) => acc + (curr.isSuccessful ? curr.currentCost : 0), 0);

    return (
        <div className="p-3 space-y-3 animate-fade-in flex flex-col h-full relative">
            
            {/* Cabecera Maestra */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div className={`p-4 rounded-xl border shadow-lg w-full md:w-auto ${isTotalFailure ? 'bg-gradient-to-r from-red-900/60 to-orange-900/40 border-red-500/40 shadow-red-900/20' : 'bg-gradient-to-r from-emerald-900/60 to-cyan-900/40 border-emerald-500/40 shadow-emerald-900/20'}`}>
                    <h2 className={`text-[12px] uppercase tracking-[0.2em] font-black flex items-center gap-2 ${isTotalFailure ? 'text-red-200' : 'text-emerald-200'}`}>
                        <DatabaseIcon className="w-4 h-4"/> {isTotalFailure ? 'OPTIMIZACIÓN GRUPAL FALLIDA' : 'Lote Multi-Mezcla Terminado'}
                    </h2>
                    <p className="text-2xl font-black text-white mt-1 leading-none">{successfulCount} <span className={isTotalFailure ? 'text-red-400' : 'text-emerald-400'}>Productos Óptimos</span> de {assignments.length}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md w-full md:w-auto flex flex-col justify-center">
                    <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest">Costo Total del Grupo Operativo</p>
                    <p className={`text-3xl font-black font-mono mt-1 ${isTotalFailure ? 'text-gray-500' : 'text-cyan-400'}`}>${displayTotalCost.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                </div>
            </div>

            {/* Mosaico de Tarjetas */}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1 ${drawerProduct ? 'pr-[45%]' : ''} transition-all duration-500`}>
                {assignments.map((assign, i) => {
                    const product = products.find(p => p.id === assign.productId);
                    const solution = localSolutions[assign.productId];
                    
                    if (!product || !solution) return null;

                    const isSuccessful = solution.isSuccessful;
                    const deltaCost = solution.prevCost !== null ? (solution.currentCost - solution.prevCost) : 0;

                    return (
                        <div className="flex flex-col h-full min-h-[350px]" key={i}>
                            <div className={`border p-4 rounded-2xl shadow-xl flex flex-col h-full transition-all group overflow-hidden relative ${isSuccessful ? 'bg-gray-800/80 border-gray-700/80 hover:border-emerald-500/30' : 'bg-red-950/20 border-red-900/50 hover:border-red-500/50'}`}>
                                <div className={`absolute top-0 right-0 p-12 rounded-full -mr-10 -mt-10 blur-3xl transition-colors ${isSuccessful ? 'bg-emerald-500/5 group-hover:bg-cyan-500/10' : 'bg-red-500/10 group-hover:bg-red-500/20'}`}></div>
                                
                                {/* Targeta Header con KPI Financiero */}
                                <div className="flex justify-between items-start mb-2 z-10 relative">
                                    <div>
                                        <h4 className="font-black text-white uppercase text-lg leading-tight">{product?.name}</h4>
                                        <p className="text-xs text-gray-400 font-black uppercase tracking-widest mt-0.5">Vol: <span className={isSuccessful ? 'text-emerald-400' : 'text-red-400'}>{assign.batchSize.toLocaleString()} kg</span></p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-500 uppercase font-black">Costo Lote</p>
                                        <p className={`font-mono font-bold text-lg leading-none ${isSuccessful ? 'text-cyan-400' : 'text-gray-500'}`}>${solution.currentCost.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                                        {/* Delta Rendering */}
                                        {solution.prevCost !== null && deltaCost !== 0 && (
                                            <p className={`text-[10px] font-bold font-mono mt-0.5 flex justify-end items-center gap-0.5 ${deltaCost > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {deltaCost > 0 ? '🔺' : '🔽'} {deltaCost > 0 ? '+' : ''}${deltaCost.toLocaleString(undefined, {maximumFractionDigits:0})}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                
                                {/* Inner Table */}
                                <div className="flex-1 overflow-y-auto mb-3 pr-2 custom-scrollbar z-10 relative bg-gray-900/50 rounded-xl border border-gray-700/50 p-2 min-h-[140px] max-h-[300px]">
                                    <table className="w-full text-left">
                                        <thead className="text-[10px] uppercase font-black text-gray-300 border-b border-gray-600">
                                            <tr>
                                                <th className="pb-1.5">Ingrediente</th>
                                                <th className="pb-1.5 text-right">Inc %</th>
                                                <th className="pb-1.5 text-right">Vol</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-[12px] text-gray-200">
                                            {solution.items.map((item, idx) => (
                                                <tr key={idx} className="border-b border-gray-700/40 last:border-0 hover:bg-gray-700/60 transition-colors">
                                                    <td className="py-1.5 truncate max-w-[120px] font-bold text-white" title={item.name}>{item.name}</td>
                                                    <td className="py-1.5 text-right font-mono text-emerald-300 font-bold">{item.percentage.toFixed(2)}</td>
                                                    <td className="py-1.5 text-right font-mono text-cyan-300">{item.weight.toFixed(1)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {!isSuccessful && (
                                        <div className="flex flex-col items-center justify-center p-4 text-center mt-2">
                                            <XCircleIcon className="w-8 h-8 text-red-500/50 mb-2" />
                                            <p className="text-[12px] text-red-400 font-black uppercase tracking-wide">Fórmula Infactible</p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions Footer */}
                                <div className="z-10 relative mt-auto flex items-center justify-between gap-2">
                                    <div className={`flex-1 p-2 rounded-lg border flex items-center justify-center gap-1.5 ${isSuccessful ? 'bg-gray-900 border-emerald-900/30 text-emerald-400' : 'bg-red-950/40 border-red-900/50 text-red-400'}`}>
                                        <div className={`w-2 h-2 rounded-full ${isSuccessful ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div> 
                                        <span className="text-[10px] font-black uppercase tracking-widest">{isSuccessful ? 'ÓPTIMO' : 'FALLIDO'}</span>
                                    </div>
                                    <button 
                                        onClick={() => setDrawerProduct(product)}
                                        className="flex-1 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1 shadow-lg shadow-indigo-900/50">
                                        <SettingsIcon className="w-3 h-3" /> Ajustar 
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* OFF-CANVAS DRAWER para "Agile Optimization Workspace" */}
            {drawerProduct && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setDrawerProduct(null)}></div>
                    
                    {/* Right-Side Panel */}
                    <div className="fixed inset-y-4 right-4 w-full max-w-[45%] bg-gray-800 border border-gray-600 rounded-3xl shadow-2xl z-50 flex flex-col animate-slide-left overflow-hidden">
                        {/* Header */}
                        <div className="bg-gray-900 border-b border-gray-700 p-5 flex items-center justify-between shadow-md">
                            <div>
                                <h3 className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">Espacio de Iteración Ágil</h3>
                                <h2 className="text-2xl text-white font-black uppercase leading-none">{drawerProduct.name}</h2>
                            </div>
                            <button onClick={() => setDrawerProduct(null)} className="p-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 rounded-full transition-colors">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        {/* Body - Advanced Data Grid */}
                        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar bg-gray-800/50">
                            
                            <h4 className="text-[10px] text-gray-500 uppercase tracking-widest font-black mb-3 ml-1">Restricciones Nutricionales</h4>
                            <div className="bg-gray-900/60 rounded-xl border border-gray-700 overflow-hidden shadow-inner mb-6">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-800/80 text-[10px] text-indigo-300 font-black uppercase">
                                        <tr>
                                            <th className="py-2.5 px-3">Nutriente</th>
                                            <th className="py-2.5 px-2 text-center w-20">Mínimo</th>
                                            <th className="py-2.5 px-2 text-center w-20">Máximo</th>
                                            <th className="py-2.5 px-3 text-right bg-gray-950/30 text-amber-500/70" title="Coste Marginal (Shadow Price) no disponible en solver simple">P. Sombra</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-[13px] text-white">
                                        {nutrients.map(nut => {
                                            const con = drawerProduct.constraints.find(c => c.nutrientId === nut.id) || { min: 0, max: 999 };
                                            // Mock Shadow Price visual logic (normally returned by advanced solver)
                                            const isConstrained = con.min > 0 || con.max < 999;
                                            
                                            return (
                                                <tr key={nut.id} className="border-b border-gray-700/50 hover:bg-gray-800 transition-colors">
                                                    <td className="py-1.5 px-3 font-medium flex items-center justify-between">
                                                        <span>{nut.name}</span>
                                                        <span className="text-[9px] text-gray-600 font-mono ml-2">{nut.unit}</span>
                                                    </td>
                                                    <td className="py-1.5 px-2 text-center">
                                                        <SmartInput 
                                                            value={con.min} 
                                                            isMax={false} 
                                                            onChange={(v) => handleConstraintChange(drawerProduct.id, nut.id, 'min', v)} 
                                                        />
                                                    </td>
                                                    <td className="py-1.5 px-2 text-center">
                                                        <SmartInput 
                                                            value={con.max} 
                                                            isMax={true} 
                                                            onChange={(v) => handleConstraintChange(drawerProduct.id, nut.id, 'max', v)} 
                                                        />
                                                    </td>
                                                    <td className="py-1.5 px-3 text-right font-mono text-amber-500/50 text-[11px] bg-gray-950/20">
                                                        {isConstrained ? '-' : '0.00'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Footer Action */}
                        <div className="bg-gray-900 border-t border-gray-700 p-4 flex justify-between items-center shadow-[0_-10px_20px_rgba(0,0,0,0.2)]">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-gray-500 uppercase font-black">Costo (Pre-Iteración)</span>
                                <span className="text-lg font-mono font-bold text-gray-300">
                                    ${localSolutions[drawerProduct.id]?.currentCost.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2}) || "0.00"}
                                </span>
                            </div>
                            <button 
                                onClick={() => handleLocalReoptimize(drawerProduct.id)}
                                disabled={isOptimizingLocal}
                                className={`px-8 py-3 rounded-xl font-black uppercase tracking-widest text-[12px] flex items-center gap-2 transition-all shadow-lg ${isOptimizingLocal ? 'bg-indigo-900 text-indigo-400 cursor-not-allowed border border-indigo-800' : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-400 hover:shadow-indigo-500/30 hover:scale-[1.02]'}`}>
                                {isOptimizingLocal ? (
                                    <><RefreshIcon className="w-5 h-5 animate-spin" /> Procesando...</>
                                ) : (
                                    <><CalculatorIcon className="w-5 h-5" /> Re-Optimizar</>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}
            
        </div>
    );
};
