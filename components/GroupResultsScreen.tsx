import React, { useState, useEffect } from 'react';
import { useTranslations } from '../lib/i18n/LangContext';
import { DatabaseIcon, CubeIcon, CalculatorIcon, TrendingUpIcon, XCircleIcon, SettingsIcon, CheckIcon, XIcon, RefreshIcon, DownloadIcon } from './icons';
import { Product, Ingredient, Nutrient } from '../types';
import { solveFeedFormulation } from '../services/solver';

interface GroupResultsScreenProps {
    results: any; // Global solver run
    assignments: { id: string, product: Product, batchSize: number }[];
    products: Product[];
    ingredients: Ingredient[];
    nutrients: Nutrient[];
    isDynamicMatrix?: boolean;
    onUpdateProduct: (p: Product) => void;
    onCloseDrawer?: () => void;
    savedFormulas?: any[];
    setSavedFormulas?: (val: any) => void;
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


export const GroupResultsScreen: React.FC<GroupResultsScreenProps> = ({ results, assignments, products, ingredients, nutrients, isDynamicMatrix = false, onUpdateProduct, onCloseDrawer, savedFormulas, setSavedFormulas }) => {
    const { t } = useTranslations();
    
    // Custom Local State for Tracking Re-Optimizations
    type LocalResult = {
        id: string; // Assignment ID
        productId: string; // Product ID
        isSuccessful: boolean;
        currentCost: number;
        prevCost: number | null;
        totalBatch: number;
        items: { name: string, percentage: number, weight: number }[];
    };
    const [localSolutions, setLocalSolutions] = useState<Record<string, LocalResult>>({});
    
    // UI State
    const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
    const [isOptimizingLocal, setIsOptimizingLocal] = useState(false);

    // Initialize local states from the global `results` payload
    useEffect(() => {
        if (!results || !results.feasible) return;
        
        const newLocal: Record<string, LocalResult> = {};
        
        assignments.forEach(assign => {
            const productItems = Object.entries(results || {})
                .filter(([key, val]) => key.endsWith(`_${assign.id}`) && typeof val === 'number' && val > 0.0001)
                .map(([key, val]) => {
                     const ingId = key.split('_')[0];
                     const percentage = val as number;
                     const weight = (percentage / 100) * assign.batchSize;
                     const ing = ingredients.find(i => i.id === ingId);
                     return { 
                         name: ing?.name || 'Insumo Desconocido',
                         percentage,
                         weight
                     };
                })
                .sort((a,b) => b.percentage - a.percentage);
            
            const costOfItems = productItems.reduce((acc, item) => {
                 const ing = ingredients.find(i => i.name === item.name);
                 return acc + ((item.weight) * (ing?.price || 0));
            }, 0);

            newLocal[assign.id] = {
                id: assign.id,
                productId: assign.product.id,
                isSuccessful: productItems.length > 0,
                currentCost: costOfItems,
                prevCost: null, 
                totalBatch: assign.batchSize,
                items: productItems
            };
        });
        
        setLocalSolutions(newLocal);
    }, [results, assignments, ingredients]);


    const handleLocalReoptimize = async (assignId: string) => {
        const assign = assignments.find(a => a.id === assignId);
        if(!assign) return;
        const prod = assign.product;

        setIsOptimizingLocal(true);
        try {
            // Simulamos pequeña carga para feedback visual
            await new Promise(r => setTimeout(r, 400));
            
            const individualResult = solveFeedFormulation(prod, ingredients, nutrients, assign.batchSize, isDynamicMatrix);
            
            setLocalSolutions(prev => {
                const oldState = prev[assignId];
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
                    [assignId]: {
                        id: assignId,
                        productId: prod.id,
                        isSuccessful: newItems.length > 0,
                        currentCost: newCost,
                        prevCost: oldState?.currentCost || null,
                        totalBatch: assign.batchSize,
                        items: newItems
                    }
                }
            });
            
            // Auto-close drawer on success as requested
            setActiveAssignmentId(null);
            
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

    const handleExportGroupCSV = () => {
        let csvContent = "\uFEFF";
        csvContent += `FEEDPRO - REPORTE DE OPTIMIZACION GRUPAL\n`;
        csvContent += `FECHA:,${new Date().toLocaleDateString()}\n`;
        csvContent += `COSTO TOTAL LOTE:,${displayTotalCost.toFixed(2)} USD\n\n`;

        Object.values(localSolutions).forEach(sol => {
            const product = products.find(p => p.id === sol.productId);
            csvContent += `--- DIETA: ${product?.name || 'Desconocida'} ---\n`;
            csvContent += `ESTADO:,${sol.isSuccessful ? 'OPTIMO' : 'FALLIDO'}\n`;
            csvContent += `COSTO PARCIAL:,${sol.currentCost.toFixed(2)} USD\n`;
            csvContent += `VOLUMEN BATCH:,${sol.totalBatch.toFixed(2)} KG\n\n`;

            if (sol.isSuccessful) {
                csvContent += `INSUMO,INCLUSION(%),PESO(KG)\n`;
                sol.items.forEach(item => {
                    csvContent += `"${item.name}",${item.percentage.toFixed(3)}%,${item.weight.toFixed(3)}\n`;
                });
            } else {
                csvContent += `Fórmula infactible matemáticamente.\n`;
            }
            csvContent += `\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Optimizacion_Grupal_${new Date().toISOString().slice(0,10)}.csv`);
        link.click();
    };

    return (
        <div className="p-3 space-y-3 animate-fade-in flex flex-col h-full relative">
            
            {/* Cabecera Maestra */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                <div className={`p-4 rounded-xl border shadow-lg w-full md:w-auto ${isTotalFailure ? 'bg-gradient-to-r from-red-900/60 to-orange-900/40 border-red-500/40 shadow-red-900/20' : 'bg-gradient-to-r from-emerald-900/60 to-cyan-900/40 border-emerald-500/40 shadow-emerald-900/20'}`}>
                    <h2 className={`text-[12px] uppercase tracking-[0.2em] font-black flex items-center gap-2 ${isTotalFailure ? 'text-red-200' : 'text-emerald-200'}`}>
                        <DatabaseIcon className="w-4 h-4"/> {isTotalFailure ? 'OPTIMIZACIÓN GRUPAL FALLIDA' : 'Lote Multi-Mezcla Terminado'}
                    </h2>
                    <p className="text-2xl font-black text-white mt-1 leading-none">{successfulCount} <span className={isTotalFailure ? 'text-red-400' : 'text-emerald-400'}>Dietas Óptimas</span> de {assignments.length}</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-md w-full md:w-auto flex flex-col justify-center">
                    <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest">Costo Total del Grupo Operativo</p>
                    <p className={`text-3xl font-black font-mono mt-1 ${isTotalFailure ? 'text-gray-500' : 'text-cyan-400'}`}>${displayTotalCost.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</p>
                </div>
            </div>

            {/* Agile Vertical Workspace - Pila de Tarjetas */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-4 pb-20">
                {assignments.map((assign, i) => {
                    const product = assign.product;
                    const solution = localSolutions[assign.id];
                    
                    if (!product || !solution) return null;

                    const isSuccessful = solution.isSuccessful;
                    const deltaCost = solution.prevCost !== null ? (solution.currentCost - solution.prevCost) : 0;

                    return (
                        <div className="flex flex-col" key={i}>
                            <div className={`border p-4 rounded-2xl shadow-xl flex flex-col transition-all group overflow-hidden relative ${isSuccessful ? 'bg-gray-800/80 border-emerald-500/30' : 'bg-red-950/20 border-red-500/50'}`}>
                                <div className={`absolute top-0 right-0 p-12 rounded-full -mr-10 -mt-10 blur-3xl transition-colors pointer-events-none ${isSuccessful ? 'bg-emerald-500/5 group-hover:bg-cyan-500/10' : 'bg-red-500/10 group-hover:bg-red-500/20'}`}></div>
                                
                                {/* Targeta Header con KPI Financiero */}
                                <div className="flex justify-between items-start mb-3 z-10 relative">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className={`w-2.5 h-2.5 rounded-full ${isSuccessful ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`}></div>
                                            <h4 className="font-black text-white uppercase text-xl leading-none">{product?.name}</h4>
                                        </div>
                                        <p className="text-xs text-gray-400 font-black uppercase tracking-widest pl-4">Volomen: <span className={isSuccessful ? 'text-emerald-400' : 'text-red-400'}>{assign.batchSize.toLocaleString()} kg</span></p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-right flex flex-col justify-center">
                                            <p className="text-[10px] text-gray-500 uppercase font-black">Costo Final</p>
                                            <p className={`font-mono font-black text-xl leading-none ${isSuccessful ? 'text-cyan-400' : 'text-gray-500'}`}>${solution.currentCost.toLocaleString(undefined, {maximumFractionDigits:0})}</p>
                                            {/* Delta Rendering */}
                                            {solution.prevCost !== null && deltaCost !== 0 && (
                                                <p className={`text-[10px] font-bold font-mono mt-0.5 flex justify-end items-center gap-0.5 ${deltaCost > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    {deltaCost > 0 ? '🔺' : '🔽'} {deltaCost > 0 ? '+' : ''}${deltaCost.toLocaleString(undefined, {maximumFractionDigits:0})}
                                                </p>
                                            )}
                                        </div>
                                        
                                        <div className="flex flex-col gap-1 ml-2">
                                            <button 
                                                onClick={() => handleLocalReoptimize(assign.id)}
                                                disabled={isOptimizingLocal}
                                                className={`p-2 rounded hover:bg-cyan-900 border border-transparent transition-colors shadow-lg ${isOptimizingLocal ? 'opacity-50 cursor-not-allowed' : 'hover:border-cyan-500 bg-gray-900'}`} title="Re-optimizar"
                                            >
                                                {isOptimizingLocal ? <RefreshIcon className="w-4 h-4 animate-spin text-cyan-400" /> : <RefreshIcon className="w-4 h-4 text-cyan-400" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="flex flex-col xl:flex-row gap-4 relative z-10 w-full mb-3">
                                    {/* Inner Table */}
                                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar bg-gray-900/60 rounded-xl border border-gray-700/50 p-2 max-h-[160px]">
                                        <table className="w-full text-left">
                                            <thead className="text-[10px] uppercase font-black text-gray-400 border-b border-gray-600/50">
                                                <tr>
                                                    <th className="pb-1.5 pl-2">Insumo</th>
                                                    <th className="pb-1.5 text-right px-2">Incl. %</th>
                                                    <th className="pb-1.5 text-right px-2">Peso (kg)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[12px] text-gray-200">
                                                {solution.items.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-gray-700/30 last:border-0 hover:bg-gray-700/60 transition-colors">
                                                        <td className="py-1.5 pl-2 truncate font-bold text-white px-1" title={item.name}>{item.name}</td>
                                                        <td className="py-1.5 text-right font-mono text-emerald-300 font-bold px-2">{item.percentage.toFixed(2)}</td>
                                                        <td className="py-1.5 text-right font-mono text-cyan-300 px-2">{item.weight.toFixed(1)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {!isSuccessful && (
                                            <div className="flex flex-col items-center justify-center p-3 text-center h-full">
                                                <XCircleIcon className="w-6 h-6 text-red-500/50 mb-1" />
                                                <p className="text-[11px] text-red-400 font-black uppercase tracking-wide">Dieta Infactible</p>
                                                <p className="text-[9px] text-red-300 mt-1">Revisa los límites de nutrientes o insumos.</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Inline Ajuste Rápido (Micro-Form) */}
                                    {activeAssignmentId === assign.id && (
                                        <div className="w-[300px] shrink-0 bg-gray-950/80 rounded-xl border border-indigo-500/50 p-3 shadow-inner overflow-hidden animate-fade-in flex flex-col max-h-[160px]">
                                            <div className="flex justify-between items-center mb-2">
                                                <h5 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Límites Nutricionales</h5>
                                                <button onClick={() => setActiveAssignmentId(null)} className="text-gray-500 hover:text-white"><XIcon className="w-3 h-3" /></button>
                                            </div>
                                            <div className="overflow-y-auto custom-scrollbar pr-1 flex-1">
                                                <table className="w-full text-left">
                                                    <thead className="text-[9px] uppercase font-black text-gray-500 border-b border-gray-700">
                                                        <tr>
                                                            <th className="pb-1">Nutr</th>
                                                            <th className="pb-1 text-center">Mín</th>
                                                            <th className="pb-1 text-center">Máx</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {nutrients.map(nut => {
                                                            const con = product.constraints.find(c => c.nutrientId === nut.id) || { min: 0, max: 999 };
                                                            const isConstrained = con.min > 0 || con.max < 999;
                                                            return (
                                                                <tr key={nut.id} className="border-b border-gray-800/50">
                                                                    <td className="py-1 text-[10px] font-bold text-gray-300 truncate max-w-[80px]" title={nut.name}>{nut.name}</td>
                                                                    <td className="py-1 text-center"><SmartInput className="!w-12 !text-[11px]" value={con.min} isMax={false} onChange={(v) => handleConstraintChange(product.id, nut.id, 'min', v)} /></td>
                                                                    <td className="py-1 text-center"><SmartInput className="!w-12 !text-[11px]" value={con.max} isMax={true} onChange={(v) => handleConstraintChange(product.id, nut.id, 'max', v)} /></td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Actions Footer */}
                                <div className="z-10 relative mt-auto flex items-center justify-between gap-2 border-t border-gray-700/50 pt-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${isSuccessful ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/20' : 'bg-red-900/30 text-red-400 border border-red-500/20'}`}>
                                            Estado: {isSuccessful ? 'Solucionado' : 'Fallido'}
                                        </span>
                                        {!isSuccessful && <span className="text-[9px] text-amber-500 uppercase tracking-widest">Revisa P. Sombra al ajustar</span>}
                                    </div>
                                    
                                    <button 
                                        onClick={() => setActiveAssignmentId(activeAssignmentId === assign.id ? null : assign.id)}
                                        className={`px-3 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5 ${activeAssignmentId === assign.id ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-600'}`}>
                                        <SettingsIcon className="w-3 h-3" /> {activeAssignmentId === assign.id ? 'Cerrar Ajustes' : 'Ajuste Rápido'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Global Guardar Todo Footer Toolbar */}
            <div className="absolute bottom-0 left-0 w-full bg-gray-950 border-t border-gray-800 p-4 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] z-50 flex items-center justify-between">
                <div>
                   <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest">Resumen del Lote Operacional</p>
                   {successfulCount === assignments.length ? (
                       <p className="text-sm font-black text-emerald-400">100% de dietas optimizadas con éxito. Listo para guardar.</p>
                   ) : (
                       <p className="text-sm font-black text-red-400">Existen fórmulas infactibles pendientes de corrección.</p>
                   )}
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleExportGroupCSV}
                        className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-6 py-3 rounded-xl uppercase tracking-widest text-[13px] border border-gray-600 shadow-lg flex items-center gap-2 transition-all"
                    >
                        <DownloadIcon className="w-5 h-5"/> EXPORTAR CSV
                    </button>
                    <button
                        onClick={() => {
                            if (setSavedFormulas) {
                               // Persist global results here
                               const successResults = Object.values(localSolutions).filter(sol => sol.isSuccessful);
                               successResults.forEach(sol => {
                                   const theFormula = {
                                       id: `formula_${Date.now()}_${sol.productId}`,
                                       name: products.find(p => p.id === sol.productId)?.name || 'Dieta Modificada',
                                       date: Date.now(),
                                       result: {
                                            feasible: true,
                                            totalCost: sol.currentCost,
                                            items: sol.items.map(it => {
                                                const ingrDef = ingredients.find(i => i.name === it.name);
                                                return {
                                                    ingredientId: ingrDef ? ingrDef.id : 'unknown',
                                                    percentage: it.percentage,
                                                    weight: it.weight
                                                }
                                            }),
                                            // Empty structure to satisfy SavedFormula
                                            nutrients: [],
                                            nutrientAnalysis: []
                                       }
                                   };
                                   setSavedFormulas((prev: any) => [...prev, theFormula]);
                               });
                            }
                            if (onCloseDrawer) onCloseDrawer();
                        }}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-black px-8 py-3 rounded-xl uppercase tracking-widest text-[13px] shadow-[0_0_15px_rgba(8,145,178,0.4)] hover:shadow-cyan-500/50 transition-all flex items-center gap-2"
                    >
                        <DatabaseIcon className="w-5 h-5" /> Aprobar y Guardar como Definitivo
                    </button>
                </div>
            </div>
            
        </div>
    );
};
