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
            // Find items for this specific diet in global result
            const productItems = ingredients
                .map(ing => {
                    const percentage = results[`${ing.id}_${assign.id}`] || 0;
                    if (percentage < 0.0001) return null;
                    const weight = (percentage / 100) * assign.batchSize;
                    const shadowPrice = results[`dual_${ing.id}_${assign.id}`] || 0;
                    return { 
                        name: ing.name,
                        percentage,
                        weight,
                        price: ing.price || 0,
                        shadowPrice
                    };
                })
                .filter(it => it !== null) as any[];

            const costOfItems = productItems.reduce((acc, item) => acc + (item.weight * item.price), 0);
            
            // Calculate Nutrients - All nutrients defining constraints should be shown
            const nutAnalysis = nutrients
                .filter(n => assign.product.constraints.some(c => c.nutrientId === n.id))
                .map(nut => {
                    const con = assign.product.constraints.find(c => c.nutrientId === nut.id) || { min: 0, max: 999 };
                    const actualValue = productItems.reduce((acc, item) => {
                        const ingDef = ingredients.find(i => i.name === item.name);
                        const nutVal = ingDef?.nutrients?.[nut.id] || 0;
                        return acc + (item.percentage / 100) * nutVal;
                    }, 0);
                    return {
                        name: nut.name,
                        unit: nut.unit,
                        requiredMin: con.min,
                        requiredMax: con.max,
                        actual: actualValue
                    };
                });

            newLocal[assign.id] = {
                id: assign.id,
                productId: assign.product.id,
                isSuccessful: productItems.length > 0,
                currentCost: costOfItems,
                prevCost: null, 
                totalBatch: assign.batchSize,
                items: productItems.sort((a,b) => b.percentage - a.percentage),
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
                        items: newItems.sort((a,b) => b.percentage - a.percentage),
                        nutrients: newNutAnalysis
                    }
                }
            });
            // Don't auto-close drawer to allow multi-adjust
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
            <div className="p-20 text-center text-red-400 font-bold uppercase tracking-widest bg-red-950/40 rounded-3xl border border-red-500/20 shadow-2xl">
                La optimización grupal falló: Solución Inviable.
            </div>
        );
    }

    const successfulCount = Object.values(localSolutions).filter(sol => sol.isSuccessful).length;
    const isTotalFailure = assignments.length > 0 && successfulCount === 0;
    const displayTotalCost = Object.values(localSolutions).reduce((acc, curr) => acc + (curr.isSuccessful ? curr.currentCost : 0), 0);

    const handleExportGroupCSV = () => {
        let csvContent = "\uFEFF";
        csvContent += `FEEDPRO - REPORTE DE OPTIMIZACION GRUPAL\n`;
        csvContent += `COSTO TOTAL LOTE:,${displayTotalCost.toFixed(2)} USD\n\n`;
        Object.values(localSolutions).forEach(sol => {
            const product = products.find(p => p.id === sol.productId);
            csvContent += `--- DIETA: ${product?.name || 'Desconocida'} ---\n`;
            csvContent += `INSUMO,INCLUSION(%),PESO(KG),PRECIO(USD)\n`;
            sol.items.forEach(item => {
                csvContent += `"${item.name}",${item.percentage.toFixed(3)}%,${item.weight.toFixed(3)},${item.price.toFixed(2)}\n`;
            });
            csvContent += `\n`;
        });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `Optimizacion_Grupal.csv`);
        link.click();
    };

    return (
        <div className="p-4 space-y-4 animate-fade-in flex flex-col h-full relative bg-gray-950 overflow-hidden">
            {/* Cabecera Maestra */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 shrink-0">
                <div className={`p-4 rounded-2xl border w-full md:w-auto shadow-xl ${isTotalFailure ? 'bg-red-950/40 border-red-500/40' : 'bg-emerald-900/10 border-emerald-500/20'}`}>
                    <h2 className={`text-[11px] uppercase tracking-[0.2em] font-black flex items-center gap-2 ${isTotalFailure ? 'text-red-200' : 'text-emerald-300'}`}>
                        <DatabaseIcon className="w-4 h-4"/> ESTATUS DE OPTIMIZACIÓN MULTI-LOTE
                    </h2>
                    <p className="text-2xl font-black text-white mt-1 leading-none">{successfulCount} <span className={isTotalFailure ? 'text-red-400' : 'text-emerald-400'}>Formulaciones Óptimas</span> <span className="text-gray-600">de {assignments.length}</span></p>
                </div>
                <div className="bg-gray-900 border border-gray-800 p-4 rounded-2xl shadow-xl w-full md:w-auto text-right">
                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest leading-none mb-2">Inversión Operativa Total</p>
                    <p className={`text-3xl font-black font-mono leading-none ${isTotalFailure ? 'text-gray-700' : 'text-cyan-400'}`}>${displayTotalCost.toLocaleString(undefined, {minimumFractionDigits:2})}</p>
                </div>
            </div>

            {/* Workplace: Pila de Tarjetas Expandibles */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-6 pb-28 pr-2">
                {assignments.map((assign) => {
                    const product = assign.product;
                    const solution = localSolutions[assign.id];
                    if (!product || !solution) return null;
                    const isSuccessful = solution.isSuccessful;
                    const deltaCost = solution.prevCost !== null ? (solution.currentCost - solution.prevCost) : 0;

                    return (
                        <div key={assign.id} className={`group rounded-2xl border transition-all duration-300 shadow-2xl overflow-hidden ${isSuccessful ? 'bg-gray-900/40 border-gray-800' : 'bg-red-950/10 border-red-500/30'}`}>
                            {/* Card Header */}
                            <div className={`p-4 flex justify-between items-center border-b border-gray-800 ${isSuccessful ? 'bg-indigo-500/5' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-3 h-3 rounded-full ${isSuccessful ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]' : 'bg-red-500 animate-pulse'}`}></div>
                                    <div>
                                        <h3 className="text-[16px] font-black text-white uppercase tracking-wider group-hover:text-indigo-400 transition-colors">{product.name}</h3>
                                        <div className="flex items-center gap-4 mt-1">
                                            <span className="text-[10px] text-gray-500 font-black uppercase">Batch: <span className="text-gray-300 font-mono">{assign.batchSize.toLocaleString()} kg</span></span>
                                            <div className="h-3 w-px bg-gray-800"></div>
                                            <span className="text-[10px] text-emerald-500/80 font-black uppercase">Rendimiento: <span className="font-mono text-emerald-400">100%</span></span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <div className="flex items-center gap-3 justify-end leading-none">
                                            {solution.prevCost !== null && deltaCost !== 0 && (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] text-gray-600 font-black uppercase">Previo</span>
                                                    <span className={`text-[11px] font-mono italic font-bold ${deltaCost > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                        ${solution.prevCost.toFixed(0)} {deltaCost > 0 ? '🔺' : '🔽'}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex flex-col items-end">
                                                <span className="text-[9px] text-gray-500 font-black uppercase mb-1">Costo Dieta</span>
                                                <span className="text-[24px] font-black text-white font-mono leading-none tracking-tighter">${solution.currentCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleLocalReoptimize(assign.id)}
                                        disabled={isOptimizingLocal}
                                        className="p-3 bg-gray-800 hover:bg-emerald-600 rounded-xl border border-gray-700 transition-all text-emerald-400 hover:text-white shadow-lg"
                                        title="Recalcular con ajustes"
                                    >
                                        <RefreshIcon className={`w-5 h-5 ${isOptimizingLocal ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                            </div>

                            {/* PERSPECTIVE GRID: 2 COLUMNS ALWAYS SHOWN */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-px bg-gray-800/30">
                                {/* Componentes de Fórmula */}
                                <div className="bg-gray-900/20 p-4">
                                    <div className="flex items-center gap-2 mb-4 border-l-2 border-indigo-500 pl-3">
                                        <CubeIcon className="w-4 h-4 text-indigo-400"/>
                                        <h5 className="text-[11px] font-black text-indigo-100 uppercase tracking-widest">Insumos y Participación</h5>
                                    </div>
                                    <div className="space-y-1 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                                        <table className="w-full">
                                            <thead className="text-[9px] text-gray-500 uppercase font-black border-b border-gray-800">
                                                <tr>
                                                    <th className="py-2 text-left">Insumo Seleccionado</th>
                                                    <th className="py-2 text-center text-indigo-400">Incl. %</th>
                                                    <th className="py-2 text-right">Peso (kg)</th>
                                                    <th className="py-2 text-right text-yellow-500">P. Sombra</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[12px]">
                                                {solution.items.map((item, idx) => (
                                                    <tr key={idx} className="border-b border-gray-800/40 hover:bg-white/5 transition-colors">
                                                        <td className="py-2 font-bold text-gray-300">{item.name}</td>
                                                        <td className="py-2 text-center font-black font-mono text-indigo-300">
                                                            {item.percentage.toFixed(3)}%
                                                            {item.prevPercentage !== undefined && item.percentage !== item.prevPercentage && (
                                                                <span className={`ml-1 text-[9px] ${item.percentage > item.prevPercentage ? 'text-emerald-500' : 'text-red-500'}`}>
                                                                    {item.percentage > item.prevPercentage ? '↑' : '↓'}
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="py-2 text-right font-mono text-cyan-500/80">{item.weight.toFixed(1)}</td>
                                                        <td className={`py-2 text-right font-mono font-bold ${item.shadowPrice > 0 ? 'text-amber-500' : 'text-gray-700'}`}>
                                                            {item.shadowPrice > 0 ? `+${item.shadowPrice.toFixed(1)}` : '0.0'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Balance Nutricional */}
                                <div className="bg-gray-950/20 p-4">
                                    <div className="flex items-center justify-between mb-4 border-l-2 border-cyan-500 pl-3">
                                        <div className="flex items-center gap-2">
                                            <BeakerIcon className="w-4 h-4 text-cyan-400"/>
                                            <h5 className="text-[11px] font-black text-cyan-100 uppercase tracking-widest">Aporte Nutricional Real</h5>
                                        </div>
                                        <button 
                                            onClick={() => setActiveAssignmentId(activeAssignmentId === assign.id ? null : assign.id)}
                                            className="text-[9px] font-black bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded shadow-lg transition-all"
                                        >
                                            AJUSTAR REQUERIMIENTOS
                                        </button>
                                    </div>
                                    <div className="space-y-1 max-h-[250px] overflow-y-auto custom-scrollbar pr-2">
                                        <table className="w-full">
                                            <thead className="text-[9px] text-gray-500 uppercase font-black border-b border-gray-800">
                                                <tr>
                                                    <th className="py-2 text-left">Nutriente</th>
                                                    <th className="py-2 text-center">Especificación</th>
                                                    <th className="py-2 text-right text-cyan-400">Resultado Final</th>
                                                </tr>
                                            </thead>
                                            <tbody className="text-[12px]">
                                                {solution.nutrients.map((nut, idx) => {
                                                    const isWithin = nut.actual >= nut.requiredMin - 0.001 && (nut.actual <= nut.requiredMax + 0.001 || nut.requiredMax === 999);
                                                    return (
                                                        <tr key={idx} className="border-b border-gray-800/40 hover:bg-white/5 transition-colors">
                                                            <td className="py-2 text-gray-400 font-bold">{nut.name} <span className="text-[9px] text-gray-600 font-normal">{nut.unit}</span></td>
                                                            <td className="py-2 text-center text-gray-600 font-mono text-[10px]">{nut.requiredMin}-{nut.requiredMax >= 999 ? 'MAX' : nut.requiredMax}</td>
                                                            <td className="py-2 text-right">
                                                                <div className="flex items-center justify-end gap-2">
                                                                    {nut.prevActual !== undefined && <span className="text-[9px] text-gray-600 italic">({nut.prevActual.toFixed(2)})</span>}
                                                                    <span className={`font-black font-mono ${!isWithin ? 'text-red-500 underline decoration-2' : (nut.prevActual && nut.actual !== nut.prevActual ? 'text-emerald-400' : 'text-white')}`}>
                                                                        {nut.actual.toFixed(3)}
                                                                    </span>
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

                            {/* Drawer de Ajuste Rápido */}
                            {activeAssignmentId === assign.id && (
                                <div className="p-4 bg-indigo-950/20 border-t border-indigo-500/40 animate-slide-down">
                                    <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
                                        {nutrients.filter(n => product.constraints.some(c => c.nutrientId === n.id)).map(nut => {
                                            const con = product.constraints.find(c => c.nutrientId === nut.id) || { min: 0, max: 999 };
                                            return (
                                                <div key={nut.id} className="bg-gray-900 border border-gray-800 p-2 rounded-xl">
                                                    <p className="text-[9px] font-black text-gray-500 uppercase truncate mb-1" title={nut.name}>{nut.name}</p>
                                                    <div className="flex items-center gap-1">
                                                        <SmartInput value={con.min} isMax={false} onChange={(v) => handleConstraintChange(product.id, nut.id, 'min', v)} />
                                                        <span className="text-gray-700">-</span>
                                                        <SmartInput value={con.max} isMax={true} onChange={(v) => handleConstraintChange(product.id, nut.id, 'max', v)} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <button onClick={() => handleLocalReoptimize(assign.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2 rounded-xl text-[11px] uppercase tracking-widest flex items-center gap-2 shadow-emerald-900/40 shadow-xl">
                                            <RefreshIcon className="w-4 h-4"/> Aplicar y Recalcular
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Global Guardar Todo Footer Toolbar */}
            <div className="absolute bottom-0 left-0 w-full bg-gray-950 border-t border-gray-800 p-4 shadow-[0_-30px_60px_rgba(0,0,0,0.9)] z-50 flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Panel de Finalización de Lote</p>
                   {successfulCount === assignments.length ? (
                       <p className="text-[14px] font-black text-emerald-400 flex items-center gap-2"><CheckIcon className="w-5 h-5"/> Todas las metas nutricionales cumplidas.</p>
                   ) : (
                       <p className="text-[14px] font-black text-red-500 flex items-center gap-2"><XCircleIcon className="w-5 h-5"/> Error en {assignments.length - successfulCount} fórmulas.</p>
                   )}
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleExportGroupCSV} className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-6 py-3 rounded-2xl uppercase tracking-widest text-[12px] border border-gray-700 flex items-center gap-3 transition-all">
                        <DownloadIcon className="w-5 h-5"/> EXPORTAR REPORTE
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
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-black px-10 py-3 rounded-2xl uppercase tracking-widest text-[12px] shadow-[0_0_20px_rgba(8,145,178,0.3)] transition-all flex items-center gap-3"
                    >
                        <DatabaseIcon className="w-5 h-5" /> APROBAR LOTE DEFINITIVO
                    </button>
                </div>
            </div>
        </div>
    );
};
