import React, { useState, useEffect } from 'react';
import { useTranslations } from '../lib/i18n/LangContext';
import { DatabaseIcon, CubeIcon, CalculatorIcon, TrendingUpIcon, XCircleIcon, SettingsIcon, CheckIcon, XIcon, RefreshIcon, DownloadIcon, BeakerIcon } from './icons';
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
    onOpenDetail?: (id: string) => void;
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
            className={`w-14 bg-gray-900 border border-gray-700 text-white font-mono text-[11px] text-center rounded px-1 py-0.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all placeholder-gray-600 ${className}`}
        />
    );
};


export const GroupResultsScreen: React.FC<GroupResultsScreenProps> = ({ results, assignments, products, ingredients, nutrients, isDynamicMatrix = false, onUpdateProduct, onCloseDrawer, savedFormulas, setSavedFormulas, onOpenDetail }) => {
    const { t } = useTranslations();
    
    // Custom Local State for Tracking Re-Optimizations
    type LocalResult = {
        id: string; // Assignment ID
        productId: string; // Product ID
        isSuccessful: boolean;
        currentCost: number;
        prevCost: number | null;
        totalBatch: number;
        items: { name: string, percentage: number, weight: number, price: number, shadowPrice?: number, prevPercentage?: number }[];
        nutrients: { name: string, unit: string, requiredMin: number, requiredMax: number, actual: number, prevActual?: number }[];
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
                         weight,
                         price: ing?.price || 0,
                         shadowPrice: results[`dual_${ingId}_${assign.id}`] || 0
                     };
                })
                .sort((a,b) => b.percentage - a.percentage);
            
            const costOfItems = productItems.reduce((acc, item) => acc + (item.weight * item.price), 0);
            
            // Calculate Nutrients
            const nutAnalysis = nutrients.filter(n => assign.product.constraints.some(c => c.nutrientId === n.id)).map(nut => {
                const con = assign.product.constraints.find(c => c.nutrientId === nut.id) || { min: 0, max: 999 };
                const actual = productItems.reduce((acc, item) => {
                    const ing = ingredients.find(i => i.name === item.name);
                    const nutValue = ing?.nutrients?.[nut.id] || 0;
                    return acc + (item.percentage / 100) * nutValue;
                }, 0);
                return {
                    name: nut.name,
                    unit: nut.unit,
                    requiredMin: con.min,
                    requiredMax: con.max,
                    actual
                };
            });

            newLocal[assign.id] = {
                id: assign.id,
                productId: assign.product.id,
                isSuccessful: productItems.length > 0,
                currentCost: costOfItems,
                prevCost: null, 
                totalBatch: assign.batchSize,
                items: productItems,
                nutrients: nutAnalysis
            };
        });
        
        setLocalSolutions(newLocal);
    }, [results, assignments, ingredients, nutrients]);


    const handleLocalReoptimize = async (assignId: string) => {
        const assign = assignments.find(a => a.id === assignId);
        if(!assign) return;
        const prod = assign.product;

        setIsOptimizingLocal(true);
        try {
            await new Promise(r => setTimeout(r, 400));
            const individualResult = solveFeedFormulation(prod, ingredients, nutrients, assign.batchSize, isDynamicMatrix);
            
            setLocalSolutions(prev => {
                const oldState = prev[assignId];
                const newItems = individualResult.items.map(it => {
                    const ing = ingredients.find(i => i.id === it.ingredientId);
                    const oldItem = oldState?.items.find(oi => oi.name === ing?.name);
                    return {
                        name: ing?.name || 'Desc',
                        percentage: it.percentage,
                        weight: it.weight,
                        price: ing?.price || 0,
                        shadowPrice: individualResult.shadowPrices?.[it.ingredientId] || 0,
                        prevPercentage: oldItem?.percentage
                    };
                });
                
                const newNutAnalysis = individualResult.nutrientAnalysis.map(na => {
                    const oldNut = oldState?.nutrients.find(on => on.name === na.name);
                    return {
                        name: na.name,
                        unit: na.unit,
                        requiredMin: na.min,
                        requiredMax: na.max,
                        actual: na.actual,
                        prevActual: oldNut?.actual
                    };
                });

                return {
                    ...prev,
                    [assignId]: {
                        id: assignId,
                        productId: prod.id,
                        isSuccessful: individualResult.feasible,
                        currentCost: individualResult.totalCost,
                        prevCost: oldState?.currentCost || null,
                        totalBatch: assign.batchSize,
                        items: newItems,
                        nutrients: newNutAnalysis
                    }
                }
            });
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
            csvContent += `COSTO:,${sol.currentCost.toFixed(2)} USD\n\n`;
            csvContent += `INSUMO,INCLUSION(%),PESO(KG),PRECIO(USD),P.SOMBRA\n`;
            sol.items.forEach(item => {
                csvContent += `"${item.name}",${item.percentage.toFixed(3)}%,${item.weight.toFixed(3)},${item.price.toFixed(2)},${(item.shadowPrice || 0).toFixed(2)}\n`;
            });
            csvContent += `\nNUTRIENTE,REQUERIDO,ACTUAL,UNIDAD\n`;
            sol.nutrients.forEach(n => {
                csvContent += `"${n.name}","${n.requiredMin}-${n.requiredMax}",${n.actual.toFixed(3)},${n.unit}\n`;
            });
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-4">
                <div className={`p-3 rounded-xl border w-full md:w-auto ${isTotalFailure ? 'bg-red-950/40 border-red-500/40' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
                    <h2 className={`text-[10px] uppercase tracking-widest font-black flex items-center gap-2 ${isTotalFailure ? 'text-red-200' : 'text-emerald-200'}`}>
                        <DatabaseIcon className="w-3.5 h-3.5"/> Lote Multi-Mezcla Terminado
                    </h2>
                    <p className="text-xl font-black text-white mt-1 leading-none">{successfulCount} <span className={isTotalFailure ? 'text-red-400' : 'text-emerald-400'}>Óptimas</span> de {assignments.length}</p>
                </div>
                <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700 w-full md:w-auto">
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Inversión Total Lote</p>
                    <p className={`text-2xl font-black font-mono mt-1 ${isTotalFailure ? 'text-gray-500' : 'text-cyan-400'}`}>${displayTotalCost.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 pb-24 pr-1">
                {assignments.map((assign, i) => {
                    const product = assign.product;
                    const solution = localSolutions[assign.id];
                    if (!product || !solution) return null;
                    const isSuccessful = solution.isSuccessful;
                    const deltaCost = solution.prevCost !== null ? (solution.currentCost - solution.prevCost) : 0;

                    return (
                        <div key={assign.id} className={`border rounded-2xl overflow-hidden transition-all bg-gray-900/50 border-gray-800 shadow-2xl relative`}>
                            {/* Dieta Card Header */}
                            <div className={`p-3 border-b border-gray-800 flex justify-between items-center ${isSuccessful ? 'bg-indigo-500/5' : 'bg-red-500/5'}`}>
                                <div className="flex items-center gap-3">
                                    <div className={`w-2 h-2 rounded-full ${isSuccessful ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-red-500 animate-pulse'}`}></div>
                                    <div>
                                        <h4 className="text-[14px] font-black text-white uppercase tracking-wider">{product.name}</h4>
                                        <p className="text-[9px] text-gray-500 font-bold uppercase">Masa: {assign.batchSize.toLocaleString()} kg</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="flex items-center gap-2 justify-end">
                                            {solution.prevCost !== null && deltaCost !== 0 && (
                                                <span className={`text-[10px] font-mono italic font-bold ${deltaCost > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                    (${solution.prevCost.toFixed(0)}) {deltaCost > 0 ? '🔺' : '🔽'}
                                                </span>
                                            )}
                                            <span className="text-[18px] font-black text-white font-mono leading-none">${solution.currentCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                        </div>
                                        <p className="text-[8px] text-gray-600 font-black uppercase mt-1">Costo Final Dieta</p>
                                    </div>
                                    <button 
                                        onClick={() => handleLocalReoptimize(assign.id)}
                                        disabled={isOptimizingLocal}
                                        className="p-2 bg-gray-800 hover:bg-emerald-600 rounded-lg border border-gray-700 transition-all text-emerald-400 hover:text-white"
                                    >
                                        <RefreshIcon className={`w-4 h-4 ${isOptimizingLocal ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* PERSPECTIVE VIEW: INGREDIENTS & NUTRIENTS SIDE BY SIDE (High Density) */}
                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-0 p-0">
                                {/* Left: Ingredients & Matrix Data (Col 7/12) */}
                                <div className="xl:col-span-7 border-r border-gray-800 p-2">
                                    <h5 className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-1.5 px-1"><CubeIcon className="w-3 h-3"/> COMPONENTES DE FORMULA</h5>
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full">
                                            <thead className="text-[8px] text-gray-600 uppercase border-b border-gray-800">
                                                <tr>
                                                    <th className="py-1 pl-1 text-left">Insumo</th>
                                                    <th className="py-1 text-right">USD/t</th>
                                                    <th className="py-1 text-center">Incl. %</th>
                                                    <th className="py-1 text-right">kg</th>
                                                    <th className="py-1 text-right pr-1">P.Sombra</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[11px]">
                                                {solution.items.map((item, idx) => {
                                                    const isRising = item.prevPercentage !== undefined && item.percentage > item.prevPercentage;
                                                    const isFalling = item.prevPercentage !== undefined && item.percentage < item.prevPercentage;
                                                    return (
                                                        <tr key={idx} className="border-b border-gray-800/30 hover:bg-white/5 transition-colors group">
                                                            <td className="py-1 pl-1 font-bold text-gray-400 group-hover:text-white truncate max-w-[120px]">{item.name}</td>
                                                            <td className="py-1 text-right text-gray-500 font-mono">${item.price.toFixed(0)}</td>
                                                            <td className="py-1 text-center">
                                                                <div className="flex items-center justify-center gap-1.5">
                                                                    {item.prevPercentage !== undefined && <span className="text-[8px] text-gray-600 italic">({item.prevPercentage.toFixed(1)})</span>}
                                                                    <span className={`font-black font-mono ${isRising ? 'text-emerald-400' : isFalling ? 'text-red-400' : 'text-indigo-300'}`}>{item.percentage.toFixed(2)}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-1 text-right text-cyan-400/80 font-mono">{item.weight.toFixed(1)}</td>
                                                            <td className={`py-1 text-right pr-1 font-mono font-bold ${item.shadowPrice && item.shadowPrice > 0 ? 'text-yellow-500' : 'text-gray-700'}`}>
                                                                {item.shadowPrice && item.shadowPrice > 0 ? `+${item.shadowPrice.toFixed(0)}` : '0'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Right: Nutrient Real vs Request (Col 5/12) */}
                                <div className="xl:col-span-5 bg-gray-950/30 p-2">
                                    <div className="flex justify-between items-center mb-2 px-1">
                                        <h5 className="text-[9px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-1.5"><BeakerIcon className="w-3 h-3"/> BALANCE NUTRICIONAL</h5>
                                        <button onClick={() => setActiveAssignmentId(activeAssignmentId === assign.id ? null : assign.id)} className="text-[8px] font-black bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white px-2 py-0.5 rounded border border-gray-700 transition-all uppercase">Ajustar Req</button>
                                    </div>
                                    <div className="overflow-x-auto custom-scrollbar">
                                        <table className="w-full">
                                            <thead className="text-[8px] text-gray-600 uppercase border-b border-gray-800">
                                                <tr>
                                                    <th className="py-1 pl-1 text-left">Nutriente</th>
                                                    <th className="py-1 text-center">Rango Req</th>
                                                    <th className="py-1 text-right pr-1">Aporte Real</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[11px]">
                                                {solution.nutrients.map((nut, idx) => {
                                                    const isRising = nut.prevActual !== undefined && nut.actual > nut.prevActual;
                                                    const isFalling = nut.prevActual !== undefined && nut.actual < nut.prevActual;
                                                    const isWithin = nut.actual >= nut.requiredMin - 0.001 && (nut.actual <= nut.requiredMax + 0.001 || nut.requiredMax === 999);
                                                    return (
                                                        <tr key={idx} className="border-b border-gray-800/30 hover:bg-white/5 transition-colors">
                                                            <td className="py-1 pl-1 text-[10px] text-gray-500 font-bold truncate max-w-[100px]">{nut.name}</td>
                                                            <td className="py-1 text-center text-gray-600 font-mono text-[9px]">{nut.requiredMin === 0 ? '<' : nut.requiredMin}-{nut.requiredMax >= 999 ? 'MAX' : nut.requiredMax}</td>
                                                            <td className="py-1 text-right pr-1">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    {nut.prevActual !== undefined && <span className="text-[8px] text-gray-600 italic">({nut.prevActual.toFixed(2)})</span>}
                                                                    <span className={`font-black font-mono ${!isWithin ? 'text-red-500 underline' : (isRising ? 'text-emerald-400 underline underline-offset-2 decoration-emerald-500/30' : isFalling ? 'text-red-400' : 'text-white')}`}>{nut.actual.toFixed(3)}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Inline Micro-Ajuste Drawer */}
                            {activeAssignmentId === assign.id && (
                                <div className="p-3 bg-indigo-950/20 border-t border-indigo-500/30 animate-in slide-in-from-top duration-300">
                                    <div className="flex flex-wrap gap-3">
                                        {nutrients.filter(n => product.constraints.some(c => c.nutrientId === n.id)).map(nut => {
                                            const con = product.constraints.find(c => c.nutrientId === nut.id) || { min: 0, max: 999 };
                                            return (
                                                <div key={nut.id} className="bg-gray-900/80 p-1.5 rounded-lg border border-gray-800 flex items-center gap-2">
                                                    <span className="text-[9px] font-black text-gray-500 uppercase w-16 truncate" title={nut.name}>{nut.name}</span>
                                                    <SmartInput value={con.min} isMax={false} onChange={(v) => handleConstraintChange(product.id, nut.id, 'min', v)} />
                                                    <span className="text-gray-700 text-[10px]">-</span>
                                                    <SmartInput value={con.max} isMax={true} onChange={(v) => handleConstraintChange(product.id, nut.id, 'max', v)} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Global Guardar Todo Footer Toolbar */}
            <div className="absolute bottom-0 left-0 w-full bg-gray-950 border-t border-gray-800 p-3 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] z-50 flex items-center justify-between">
                <div>
                   <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Estatus del Lote Consolidado</p>
                   {successfulCount === assignments.length ? (
                       <p className="text-[13px] font-black text-emerald-400 flex items-center gap-2 animate-pulse"><CheckIcon className="w-4 h-4"/> 100% de dietas certificadas y listas.</p>
                   ) : (
                       <p className="text-[13px] font-black text-red-400 flex items-center gap-2"><XCircleIcon className="w-4 h-4"/> Inviabilidad detectada en {assignments.length - successfulCount} fórmulas.</p>
                   )}
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleExportGroupCSV} className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-4 py-2.5 rounded-xl uppercase tracking-widest text-[11px] border border-gray-700 flex items-center gap-2 transition-all">
                        <DownloadIcon className="w-4 h-4"/> CSV
                    </button>
                    <button
                        onClick={() => {
                            if (setSavedFormulas) {
                               Object.values(localSolutions).filter(sol => sol.isSuccessful).forEach(sol => {
                                   const theFormula = {
                                       id: `formula_${Date.now()}_${sol.productId}`,
                                       name: products.find(p => p.id === sol.productId)?.name || 'Dieta Modificada',
                                       date: Date.now(),
                                       result: { feasible: true, totalCost: sol.currentCost, items: sol.items.map(it => ({ ingredientId: ingredients.find(i => i.name === it.name)?.id || 'unknown', percentage: it.percentage, weight: it.weight })), nutrients: [], nutrientAnalysis: [] }
                                   };
                                   setSavedFormulas((prev: any) => [...prev, theFormula]);
                               });
                            }
                            if (onCloseDrawer) onCloseDrawer();
                        }}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-black px-6 py-2.5 rounded-xl uppercase tracking-widest text-[11px] shadow-lg transition-all flex items-center gap-2"
                    >
                        <DatabaseIcon className="w-4 h-4" /> Aprobar Lote Definitivo
                    </button>
                </div>
            </div>
        </div>
    );
};
