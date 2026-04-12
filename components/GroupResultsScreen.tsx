import React, { useState, useEffect } from 'react';
import { useTranslations } from '../lib/i18n/LangContext';
import { DatabaseIcon, CubeIcon, CalculatorIcon, TrendingUpIcon, XCircleIcon, SettingsIcon, CheckIcon, XIcon, RefreshIcon, DownloadIcon, BeakerIcon } from './icons';
import { Product, Ingredient, Nutrient } from '../types';
import { solveFeedFormulation } from '../services/solver';

interface GroupResultsScreenProps {
    results: any; 
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

const SmartInput = ({ value, onChange, placeholder, className, isMax = false }: { value: number, onChange: (v: number) => void, placeholder?: string, className?: string, isMax?: boolean }) => {
    const defaultDisplay = isMax && value === 999 ? '' : (value === 0 && !isMax ? '' : value.toString());
    const [localVal, setLocalVal] = useState<string>(defaultDisplay);
    useEffect(() => { setLocalVal(isMax && value === 999 ? '' : (value === 0 && !isMax ? '' : value.toString())); }, [value, isMax]);
    const handleBlur = () => {
        let parsed = localVal.trim().replace(/,/g, '.');
        if (parsed.startsWith('.')) parsed = '0' + parsed;
        const num = parseFloat(parsed);
        if (isNaN(num)) { if (isMax) { onChange(999); setLocalVal(''); } else { onChange(0); setLocalVal(''); } } 
        else { onChange(num); setLocalVal(num.toString()); }
    };
    return (
        <input type="text" inputMode="decimal" value={localVal} onChange={(e) => setLocalVal(e.target.value)} onBlur={handleBlur} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} placeholder={placeholder || (isMax ? 'Max' : 'Min')}
            className={`w-14 bg-gray-950 border border-gray-800 text-white font-mono text-[11px] text-center rounded px-1 py-1 focus:ring-1 focus:ring-emerald-500 outline-none ${className}`} />
    );
};

export const GroupResultsScreen: React.FC<GroupResultsScreenProps> = ({ results, assignments, products, ingredients, nutrients, isDynamicMatrix = false, onUpdateProduct, onCloseDrawer, savedFormulas, setSavedFormulas, onOpenDetail }) => {
    const { t } = useTranslations();
    type LocalResult = {
        id: string; productId: string; isSuccessful: boolean; currentCost: number; prevCost: number | null; totalBatch: number;
        items: { name: string, percentage: number, weight: number, price: number, shadowPrice?: number, prevPercentage?: number }[];
        nutrients: { name: string, unit: string, requiredMin: number, requiredMax: number, actual: number, prevActual?: number }[];
    };
    const [localSolutions, setLocalSolutions] = useState<Record<string, LocalResult>>({});
    const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
    const [isOptimizingLocal, setIsOptimizingLocal] = useState(false);

    useEffect(() => {
        if (!results || !results.feasible) return;
        const newLocal: Record<string, LocalResult> = {};
        assignments.forEach(assign => {
            const productItems = ingredients.map(ing => {
                const percentage = results[`${ing.id}_${assign.id}`] || 0;
                if (percentage < 0.0001) return null;
                return { name: ing.name, percentage, weight: (percentage/100)*assign.batchSize, price: ing.price || 0, shadowPrice: results[`dual_${ing.id}_${assign.id}`] || 0 };
            }).filter(it => it !== null) as any[];
            const costOfItems = productItems.reduce((acc, item) => acc + (item.weight * item.price), 0);
            const nutAnalysis = nutrients.filter(n => assign.product.constraints.some(c => c.nutrientId === n.id)).map(nut => {
                const con = assign.product.constraints.find(c => c.nutrientId === nut.id) || { min: 0, max: 999 };
                const actual = productItems.reduce((acc, item) => {
                    const ingDef = ingredients.find(i => i.name === item.name);
                    return acc + (item.percentage / 100) * (ingDef?.nutrients?.[nut.id] || 0);
                }, 0);
                return { name: nut.name, unit: nut.unit, requiredMin: con.min, requiredMax: con.max, actual };
            });
            newLocal[assign.id] = { id: assign.id, productId: assign.product.id, isSuccessful: productItems.length > 0, currentCost: costOfItems, prevCost: null, totalBatch: assign.batchSize, items: productItems.sort((a,b) => b.percentage - a.percentage), nutrients: nutAnalysis };
        });
        setLocalSolutions(newLocal);
    }, [results, assignments, ingredients, nutrients]);

    const handleLocalReoptimize = async (assignId: string) => {
        const assign = assignments.find(a => a.id === assignId);
        if(!assign) return;
        setIsOptimizingLocal(true);
        try {
            await new Promise(r => setTimeout(r, 400));
            const individualResult = solveFeedFormulation(assign.product, ingredients, nutrients, assign.batchSize, isDynamicMatrix);
            setLocalSolutions(prev => {
                const old = prev[assignId];
                const newItems = individualResult.items.map(it => {
                    const ing = ingredients.find(i => i.id === it.ingredientId);
                    const oldIt = old?.items.find(oi => oi.name === ing?.name);
                    return { name: ing?.name || 'Desc', percentage: it.percentage, weight: it.weight, price: ing?.price || 0, shadowPrice: individualResult.shadowPrices?.[it.ingredientId] || 0, prevPercentage: oldIt?.percentage };
                });
                const newNutAnalysis = individualResult.nutrientAnalysis.map(na => {
                    const oldNut = old?.nutrients.find(on => on.name === na.name);
                    return { name: na.name, unit: na.unit, requiredMin: na.min, requiredMax: na.max, actual: na.actual, prevActual: oldNut?.actual };
                });
                return { ...prev, [assignId]: { ...old, isSuccessful: individualResult.feasible, currentCost: individualResult.totalCost, prevCost: old?.currentCost || null, items: newItems.sort((a,b) => b.percentage - a.percentage), nutrients: newNutAnalysis } };
            });
        } catch(e) { console.error(e); }
        setIsOptimizingLocal(false);
    };

    const handleConstraintChange = (productId: string, nutId: string, minMax: 'min' | 'max', val: number) => {
        const prod = products.find(p => p.id === productId);
        if(!prod) return;
        const newProd = {...prod, constraints: [...prod.constraints]};
        const idx = newProd.constraints.findIndex(c => c.nutrientId === nutId);
        if(idx >= 0) newProd.constraints[idx] = { ...newProd.constraints[idx], [minMax]: val };
        else newProd.constraints.push({ nutrientId: nutId, min: minMax === 'min' ? val : 0, max: minMax === 'max' ? val : 999 });
        onUpdateProduct(newProd);
    };

    const successfulCount = Object.values(localSolutions).filter(sol => sol.isSuccessful).length;
    const isTotalFailure = assignments.length > 0 && successfulCount === 0;
    const displayTotalCost = Object.values(localSolutions).reduce((acc, curr) => acc + (curr.isSuccessful ? curr.currentCost : 0), 0);

    return (
        <div className="fixed inset-0 bg-black z-[9999] flex flex-col animate-fade-in overflow-hidden">
            {/* Fullscreen Header */}
            <div className="h-20 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-8 shrink-0">
                <div className="flex items-center gap-6">
                    <button onClick={onCloseDrawer} className="bg-gray-800 hover:bg-gray-700 text-white p-3 rounded-full transition-all group scale-110 shadow-lg">
                        <ArrowLeftIcon className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="h-10 w-px bg-gray-700"></div>
                    <div>
                        <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] leading-none mb-2">Certificación Técnica de Lote</h2>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl font-black text-white leading-none">{successfulCount} Óptimas</span>
                            <span className="text-xl font-bold text-gray-500">/ {assignments.length} Dietas</span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-gray-950/80 border border-gray-800 py-3 px-8 rounded-2xl flex flex-col items-end shadow-2xl">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Inversión Final del Grupo</span>
                    <span className="text-4xl font-black text-cyan-400 font-mono tracking-tighter">${displayTotalCost.toLocaleString(undefined, {minimumFractionDigits:2})}</span>
                </div>
            </div>

            {/* Expanded Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8 pb-32 space-y-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
                {assignments.map((assign) => {
                    const sol = localSolutions[assign.id];
                    if (!sol) return null;
                    const deltaCost = sol.prevCost !== null ? (sol.currentCost - sol.prevCost) : 0;

                    return (
                        <div key={assign.id} className="bg-gray-900/50 border border-gray-800 rounded-[2rem] overflow-hidden shadow-3xl hover:border-gray-700 transition-all">
                            {/* Card Top Strip */}
                            <div className={`p-6 flex justify-between items-center border-b border-gray-800/50 ${sol.isSuccessful ? 'bg-emerald-500/5' : 'bg-red-500/5'}`}>
                                <div className="flex items-center gap-6">
                                    <div className={`w-4 h-4 rounded-full ${sol.isSuccessful ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.8)]' : 'bg-red-500 animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.8)]'}`}></div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">{assign.product.name}</h3>
                                        <div className="flex items-center gap-4 mt-1 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                                            <span>Masa: <span className="text-emerald-400 font-mono">{assign.batchSize.toLocaleString()} KG</span></span>
                                            <span className="flex items-center gap-1.5"><CheckIcon className="w-3.5 h-3.5 text-emerald-500"/> Solución Verificada</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <div className="flex items-end gap-3 leading-none justify-end">
                                            {sol.prevCost !== null && deltaCost !== 0 && (
                                                <div className="text-[12px] font-black font-mono italic flex items-center gap-1 mb-1">
                                                    <span className="text-gray-500">${sol.prevCost.toFixed(0)}</span>
                                                    <span className={deltaCost > 0 ? 'text-red-400' : 'text-emerald-400'}>{deltaCost > 0 ? '🔺' : '🔽'}</span>
                                                </div>
                                            )}
                                            <span className="text-4xl font-black text-white font-mono tracking-tighter">${sol.currentCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                        </div>
                                        <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mt-1">Precio Final Optimizado</p>
                                    </div>
                                    <button onClick={() => handleLocalReoptimize(assign.id)} className="p-4 bg-gray-800 hover:bg-emerald-600 rounded-2xl border border-gray-700 transition-all text-emerald-400 hover:text-white shadow-xl hover:scale-105 transform active:scale-95"><RefreshIcon className={`w-6 h-6 ${isOptimizingLocal ? 'animate-spin' : ''}`} /></button>
                                </div>
                            </div>

                            {/* PERSPECTIVE GRID: MAX DIMENSIONS */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 min-h-[400px]">
                                {/* Insumos */}
                                <div className="p-8 border-r border-gray-800/50">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="bg-indigo-500/10 p-2 rounded-lg"><CubeIcon className="w-5 h-5 text-indigo-400"/></div>
                                        <h5 className="text-[12px] font-black text-white uppercase tracking-[0.2em]">Fórmula Maestra de Insumos</h5>
                                    </div>
                                    <table className="w-full">
                                        <thead className="text-[10px] text-gray-500 uppercase font-black border-b border-gray-800">
                                            <tr>
                                                <th className="py-3 text-left">Ingrediente</th>
                                                <th className="py-3 text-center text-indigo-400">Inclusión %</th>
                                                <th className="py-3 text-right">Peso (kg)</th>
                                                <th className="py-3 text-right text-yellow-500">P. Sombra (USD/t)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-[13px]">
                                            {sol.items.map((item, idx) => (
                                                <tr key={idx} className="border-b border-gray-800/30 hover:bg-white/[0.02] transition-colors group">
                                                    <td className="py-3 font-bold text-gray-400 group-hover:text-white">{item.name}</td>
                                                    <td className="py-3 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {item.prevPercentage !== undefined && <span className="text-[10px] text-gray-600 italic">({item.prevPercentage.toFixed(1)})</span>}
                                                            <span className="font-black font-mono text-indigo-300 text-[14px]">{item.percentage.toFixed(3)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-right font-mono text-cyan-500/80">{item.weight.toFixed(1)}</td>
                                                    <td className={`py-3 text-right font-mono font-bold ${item.shadowPrice > 0 ? 'text-amber-500' : 'text-gray-800'}`}>{item.shadowPrice > 0 ? `+${item.shadowPrice.toFixed(2)}` : '0.00'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Nutrientes */}
                                <div className="p-8 bg-gray-950/20">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-cyan-500/10 p-2 rounded-lg"><BeakerIcon className="w-5 h-5 text-cyan-400"/></div>
                                            <h5 className="text-[12px] font-black text-white uppercase tracking-[0.2em]">Balance de requerimientos</h5>
                                        </div>
                                        <button onClick={() => setActiveAssignmentId(activeAssignmentId === assign.id ? null : assign.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase shadow-xl transition-all hover:scale-105">Ajustar Límites</button>
                                    </div>
                                    <table className="w-full">
                                        <thead className="text-[10px] text-gray-500 uppercase font-black border-b border-gray-800">
                                            <tr>
                                                <th className="py-3 text-left">Nutriente</th>
                                                <th className="py-3 text-center">Requerido (Min-Max)</th>
                                                <th className="py-3 text-right text-cyan-400">Entrega Real</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-[13px]">
                                            {sol.nutrients.map((nut, idx) => {
                                                const isWithin = nut.actual >= nut.requiredMin - 0.001 && (nut.actual <= nut.requiredMax + 0.001 || nut.requiredMax === 999);
                                                return (
                                                    <tr key={idx} className="border-b border-gray-800/30 hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-3 text-gray-400 font-bold">{nut.name} <span className="text-[10px] text-gray-700 font-normal uppercase">{nut.unit}</span></td>
                                                        <td className="py-3 text-center text-gray-600 font-mono text-[11px]">{nut.requiredMin}-{nut.requiredMax >= 999 ? 'MAX' : nut.requiredMax}</td>
                                                        <td className="py-3 text-right">
                                                            <div className="flex items-center justify-end gap-3">
                                                                {nut.prevActual !== undefined && <span className="text-[11px] text-gray-600 italic">({nut.prevActual.toFixed(2)})</span>}
                                                                <span className={`font-black font-mono text-[15px] ${!isWithin ? 'text-red-500 underline decoration-2' : (nut.prevActual && nut.actual !== nut.prevActual ? 'text-emerald-400' : 'text-white')}`}>{nut.actual.toFixed(4)}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Ajuste Rápido Panel */}
                            {activeAssignmentId === assign.id && (
                                <div className="p-8 bg-indigo-950/30 border-t border-indigo-500/20">
                                    <h6 className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mb-4">Panel de Modificación de Nutrientes</h6>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                                        {nutrients.filter(n => assign.product.constraints.some(c => c.nutrientId === n.id)).map(nut => {
                                            const con = assign.product.constraints.find(c => c.nutrientId === nut.id) || { min: 0, max: 999 };
                                            return (
                                                <div key={nut.id} className="bg-gray-950/80 p-3 rounded-2xl border border-gray-800">
                                                    <p className="text-[10px] font-black text-gray-500 uppercase truncate mb-2" title={nut.name}>{nut.name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <SmartInput value={con.min} isMax={false} onChange={(v) => handleConstraintChange(assign.product.id, nut.id, 'min', v)} />
                                                        <span className="text-gray-700">-</span>
                                                        <SmartInput value={con.max} isMax={true} onChange={(v) => handleConstraintChange(assign.product.id, nut.id, 'max', v)} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="mt-8 flex justify-end gap-4">
                                        <button onClick={() => setActiveAssignmentId(null)} className="px-6 py-2 text-[11px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors">Cancelar</button>
                                        <button onClick={() => handleLocalReoptimize(assign.id)} className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-8 py-3 rounded-2xl text-[11px] uppercase tracking-widest shadow-2xl flex items-center gap-3">
                                            <RefreshIcon className="w-5 h-5"/> Aplicar y Recalcular Dieta
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Global Toolbar */}
            <div className="h-24 bg-gray-950 border-t border-gray-800 px-8 flex items-center justify-between shadow-[0_-10px_50px_rgba(0,0,0,0.8)] z-50">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <CheckIcon className="w-6 h-6 text-emerald-500"/>
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Estatus Final de Certificación de Lote</p>
                        <p className={`text-lg font-black ${successfulCount === assignments.length ? 'text-emerald-400' : 'text-red-400'}`}>
                            {successfulCount === assignments.length ? 'Todas las formulaciones están validadas y certificadas.' : 'Se requieren ajustes en fórmulas inviables.'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <button onClick={handleExportGroupCSV} className="bg-gray-800 hover:bg-gray-700 text-white font-black px-8 py-4 rounded-2xl border border-gray-700 uppercase tracking-widest text-[13px] flex items-center gap-3 transition-all hover:scale-105 active:scale-95 shadow-xl">
                        <DownloadIcon className="w-6 h-6"/> Exportar Reporte
                    </button>
                    <button onClick={() => { 
                        Object.values(localSolutions).filter(sol => sol.isSuccessful).forEach(sol => {
                            const f = { id: `f_${Date.now()}_${sol.productId}`, name: products.find(p => p.id === sol.productId)?.name || 'Dieta', date: Date.now(), result: { feasible: true, totalCost: sol.currentCost, items: sol.items.map(it => ({ ingredientId: ingredients.find(i => i.name === it.name)?.id || 'unknown', percentage: it.percentage, weight: it.weight })), nutrients: [], nutrientAnalysis: [] } };
                            setSavedFormulas?.((prev: any) => [...prev, f]);
                        });
                        onCloseDrawer?.(); 
                    }} className="bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black px-12 py-4 rounded-2xl uppercase tracking-[0.2em] text-[13px] shadow-[0_0_30px_rgba(30,58,138,0.5)] transition-all hover:scale-[1.03] active:scale-95 flex items-center gap-3">
                        <DatabaseIcon className="w-6 h-6" /> Aprobar y Guardar Lote
                    </button>
                </div>
            </div>
        </div>
    );
};
