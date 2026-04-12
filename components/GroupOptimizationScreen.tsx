import React, { useState, useEffect } from 'react';
import { Product, Ingredient, Nutrient } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { DatabaseIcon, CalculatorIcon, SparklesIcon, XCircleIcon, CubeIcon, RefreshIcon, BeakerIcon, RatiosIcon, SettingsIcon, CheckIcon, TrashIcon } from './icons';
import { solveGroupFormulation } from '../services/solver';
import { GroupResultsScreen } from './GroupResultsScreen';

interface GroupOptimizationScreenProps {
  products: Product[];
  ingredients: Ingredient[];
  nutrients: Nutrient[];
  isDynamicMatrix: boolean;
  selectedDietIds: string[];
  onOpenInNewWindow?: (data: any, name: string) => void;
  onUpdateProduct?: (p: Product) => void;
  setIsDirty?: (dirty: boolean) => void;
  savedFormulas?: any[]; 
  setSavedFormulas?: (val: any) => void;
  onRemoveDietFromSelection?: (id: string) => void;
  onClosePortal?: () => void;
}

export const GroupOptimizationScreen: React.FC<GroupOptimizationScreenProps> = ({ 
    products, 
    ingredients, 
    nutrients,
    isDynamicMatrix,
    selectedDietIds,
    onOpenInNewWindow,
    onUpdateProduct,
    setIsDirty,
    savedFormulas,
    setSavedFormulas,
    onRemoveDietFromSelection,
    onClosePortal
}) => {
    const { t } = useTranslations();
    const [isOptimizing, setIsOptimizing] = useState(false);
    
    // Global Parameters
    const [useStock, setUseStock] = useState(false);
    const [matrixMode, setMatrixMode] = useState<'general' | 'dynamic'>(isDynamicMatrix ? 'dynamic' : 'general');
    const [globalRelation, setGlobalRelation] = useState<string>('none');
    
    // Local State
    const [batchSizes, setBatchSizes] = useState<Record<string, number>>({});
    
    // Fullscreen Navigation State
    const [isFullScreenResults, setIsFullScreenResults] = useState(false);
    const [resultsData, setResultsData] = useState<{ result: any, assignments: any } | null>(null);
    const [showBulkPanel, setShowBulkPanel] = useState(false);
    
    // Multi-Selection Bulk State
    const [selectedNutrientIds, setSelectedNutrientIds] = useState<string[]>([]);
    const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
    const [bulkNutMin, setBulkNutMin] = useState<string>('');
    const [bulkNutMax, setBulkNutMax] = useState<string>('');
    const [bulkIngMin, setBulkIngMin] = useState<string>('');
    const [bulkIngMax, setBulkIngMax] = useState<string>('');
    
    // Category Color Map
    const getCategoryColor = (cat: string) => {
        const c = (cat || '').toLowerCase();
        if (c.includes('postura') || c.includes('huevo') || c.includes('color')) return 'amber';
        if (c.includes('blanca') || c.includes('iniciador')) return 'cyan';
        if (c.includes('crecimiento')) return 'emerald';
        if (c.includes('terminador') || c.includes('engorde')) return 'orange';
        if (c.includes('reproductor')) return 'purple';
        if (c.includes('cerdo')) return 'pink';
        return 'indigo';
    };

    const getColorClasses = (color: string) => {
        const maps: Record<string, any> = {
            amber: { text: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/30', badge: 'bg-amber-600', hover: 'hover:bg-amber-500/20', line: 'bg-amber-500' },
            cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/5', border: 'border-cyan-500/30', badge: 'bg-cyan-600', hover: 'hover:bg-cyan-500/20', line: 'bg-cyan-500' },
            emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/30', badge: 'bg-emerald-600', hover: 'hover:bg-emerald-500/20', line: 'bg-emerald-500' },
            orange: { text: 'text-orange-400', bg: 'bg-orange-500/5', border: 'border-orange-500/30', badge: 'bg-orange-600', hover: 'hover:bg-orange-500/20', line: 'bg-orange-500' },
            purple: { text: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-500/30', badge: 'bg-purple-600', hover: 'hover:bg-purple-500/20', line: 'bg-purple-500' },
            pink: { text: 'text-pink-400', bg: 'bg-pink-500/5', border: 'border-pink-500/30', badge: 'bg-pink-600', hover: 'hover:bg-pink-500/20', line: 'bg-pink-500' },
            indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/5', border: 'border-indigo-500/30', badge: 'bg-indigo-600', hover: 'hover:bg-indigo-500/20', line: 'bg-indigo-500' }
        };
        return maps[color] || maps.indigo;
    };

    const selectedProducts = products.filter(p => selectedDietIds.includes(p.id));

    useEffect(() => {
        setBatchSizes(prev => {
            const next = { ...prev };
            selectedProducts.forEach(p => { if (!next[p.id]) next[p.id] = 1000; });
            return next;
        });
    }, [selectedDietIds]);

    const handleRunOptimization = () => {
        if (selectedProducts.length === 0) return;
        setIsOptimizing(true);
        const assignments = selectedProducts.map(p => ({
            id: `as-${Date.now()}-${p.id}`,
            productId: p.id,
            product: p,
            batchSize: batchSizes[p.id] || 1000
        }));
        setTimeout(() => {
            const result = solveGroupFormulation(assignments, ingredients, nutrients, matrixMode === 'dynamic', useStock);
            setIsOptimizing(false);
            if (result.feasible || !result.feasible) {
                setResultsData({ result, assignments });
                setIsFullScreenResults(true);
                setIsDirty?.(true); 
            }
        }, 800);
    };

    const handleBulkApplyUnified = () => {
        if (!onUpdateProduct) return;
        if (selectedIngredientIds.length === 0 && selectedNutrientIds.length === 0) return;

        selectedProducts.forEach(p => {
            let newP = { ...p };
            
            // Apply Ingredients
            if (selectedIngredientIds.length > 0) {
                newP.ingredientConstraints = [...newP.ingredientConstraints];
                selectedIngredientIds.forEach(ingId => {
                    const idx = newP.ingredientConstraints.findIndex(c => c.ingredientId === ingId);
                    const min = bulkIngMin === '' ? 0 : parseFloat(bulkIngMin);
                    const max = bulkIngMax === '' ? 100 : parseFloat(bulkIngMax);
                    if (idx >= 0) newP.ingredientConstraints[idx] = { ...newP.ingredientConstraints[idx], min, max };
                    else newP.ingredientConstraints.push({ ingredientId: ingId, min, max });
                });
            }

            // Apply Nutrients
            if (selectedNutrientIds.length > 0) {
                newP.constraints = [...newP.constraints];
                selectedNutrientIds.forEach(nutId => {
                    const idx = newP.constraints.findIndex(c => c.nutrientId === nutId);
                    const min = bulkNutMin === '' ? 0 : parseFloat(bulkNutMin);
                    const max = bulkNutMax === '' ? 999 : parseFloat(bulkNutMax);
                    if (idx >= 0) newP.constraints[idx] = { ...newP.constraints[idx], min, max };
                    else newP.constraints.push({ nutrientId: nutId, min, max });
                });
            }

            onUpdateProduct(newP);
        });

        // Cleanup and close
        setSelectedIngredientIds([]);
        setSelectedNutrientIds([]);
        setBulkIngMin(''); setBulkIngMax('');
        setBulkNutMin(''); setBulkNutMax('');
        setShowBulkPanel(false);
    };

    const handleRemoveIngredientGlobally = (ingId: string) => {
        if (!onUpdateProduct) return;
        selectedProducts.forEach(p => onUpdateProduct({ ...p, ingredientConstraints: p.ingredientConstraints.filter(c => c.ingredientId !== ingId) }));
    };

    const handleRemoveNutrientGlobally = (nutId: string) => {
        if (!onUpdateProduct) return;
        selectedProducts.forEach(p => onUpdateProduct({ ...p, constraints: p.constraints.filter(c => c.nutrientId !== nutId) }));
    };

    const activeNutrientIds = Array.from(new Set(selectedProducts.flatMap(p => p.constraints.map(c => c.nutrientId))));
    const activeIngredientIds = Array.from(new Set(selectedProducts.flatMap(p => p.ingredientConstraints.map(c => c.ingredientId))));
    const activeRelationNames = Array.from(new Set(selectedProducts.flatMap(p => p.relationships.map(r => r.name))));

    return (
        <div className="flex flex-col h-full space-y-4 overflow-hidden animate-fade-in">
            {/* INJECTED PANTALLA COMPLETA: REGRESAR BOTON */}
            {isFullScreenResults && resultsData ? (
                <GroupResultsScreen 
                    results={resultsData.result} 
                    assignments={resultsData.assignments} 
                    products={products} 
                    ingredients={ingredients} 
                    nutrients={nutrients} 
                    isDynamicMatrix={matrixMode === 'dynamic'} 
                    onUpdateProduct={onUpdateProduct || (() => {})} 
                    onCloseDrawer={() => { setIsFullScreenResults(false); setResultsData(null); }} 
                    savedFormulas={savedFormulas} 
                    setSavedFormulas={setSavedFormulas} 
                />
            ) : (
                <>
                    {/* Header Operativo FullScreen */}
                    <div className="bg-gray-900 border border-gray-700/80 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4 shrink-0">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-cyan-500/10 p-2.5 rounded-xl border border-cyan-500/20"><CalculatorIcon className="w-6 h-6 text-cyan-400" /></div>
                                <div>
                                    <h2 className="text-[16px] font-black text-white uppercase tracking-[0.2em] leading-none">Matrix Command Center</h2>
                                    <p className="text-cyan-500/70 font-bold text-[10px] uppercase tracking-[0.3em] mt-2">Formulación de Alto Rendimiento</p>
                                </div>
                            </div>
                            <div className="h-10 w-px bg-gray-800"></div>
                            <div className="flex items-center gap-4 bg-gray-950/50 p-1.5 rounded-xl border border-gray-800">
                                <div className={`px-4 py-2 rounded-lg flex items-center gap-3 transition-all ${useStock ? 'bg-emerald-500/10 border-emerald-500/30' : 'opacity-40'}`}>
                                    <span className="text-[10px] font-black text-gray-200 uppercase">Stock</span>
                                    <button onClick={() => setUseStock(!useStock)} className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${useStock ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${useStock ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <div className={`px-4 py-2 rounded-lg flex items-center gap-3 transition-all ${matrixMode === 'dynamic' ? 'bg-indigo-500/10 border-indigo-500/30' : ''}`}>
                                    <span className="text-[10px] font-black text-gray-200 uppercase">Dinámica</span>
                                    <button onClick={() => setMatrixMode(matrixMode === 'dynamic' ? 'general' : 'dynamic')} className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${matrixMode === 'dynamic' ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${matrixMode === 'dynamic' ? 'translate-x-5' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button onClick={() => setShowBulkPanel(!showBulkPanel)} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-6 py-3 rounded-xl uppercase tracking-widest text-[11px] shadow-xl flex items-center gap-2 transition-all">
                                <SparklesIcon className="w-5 h-5"/> Inyectar Global
                            </button>
                            <button onClick={() => onClosePortal?.()} className="p-3 bg-gray-800 hover:bg-red-900 text-gray-400 hover:text-white rounded-xl border border-gray-700 transition-all" title="Salir de la Consola">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Unified Bulk Panel */}
                    <div className={`overflow-hidden transition-all duration-300 ${showBulkPanel ? 'max-h-[800px] mb-4' : 'max-h-0'}`}>
                        <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-3xl p-6 shadow-3xl backdrop-blur-md space-y-6">
                            <div className="flex items-center justify-between border-b border-indigo-500/20 pb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-indigo-500/20 rounded-xl"><SparklesIcon className="w-6 h-6 text-indigo-400" /></div>
                                    <div>
                                        <h3 className="text-[18px] font-black text-white uppercase tracking-widest">Inyección Unificada de Parámetros</h3>
                                        <p className="text-[10px] text-gray-500 uppercase font-black mt-1">Configura insumos y nutrición global para un solo clic</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowBulkPanel(false)} className="text-gray-500 hover:text-white transition-colors bg-gray-900 p-2 rounded-full"><XCircleIcon className="w-6 h-6"/></button>
                            </div>
                            
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-gray-950/50 rounded-2xl p-4 border border-gray-800">
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2"><CubeIcon className="w-4 h-4"/> Límites de Insumos</h4>
                                    <div className="h-44 overflow-y-auto mb-4 bg-black/40 rounded-xl border border-gray-800 p-3 grid grid-cols-3 gap-2 custom-scrollbar">
                                        {ingredients.map(i => (
                                            <button key={i.id} onClick={() => setSelectedIngredientIds(prev => prev.includes(i.id) ? prev.filter(id => id !== i.id) : [...prev, i.id])}
                                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedIngredientIds.includes(i.id) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-900/50 text-gray-500 hover:bg-gray-800'}`}>
                                                <span className="truncate pr-1">{i.name}</span>
                                                {selectedIngredientIds.includes(i.id) && <CheckIcon className="w-3.5 h-3.5" />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-4">
                                        <input type="number" value={bulkIngMin} onChange={e => setBulkIngMin(e.target.value)} placeholder="Mín %" className="flex-1 bg-gray-950 border border-gray-800 text-white rounded-xl p-3 text-[12px] font-mono outline-none" />
                                        <input type="number" value={bulkIngMax} onChange={e => setBulkIngMax(e.target.value)} placeholder="Máx %" className="flex-1 bg-gray-950 border border-gray-800 text-white rounded-xl p-3 text-[12px] font-mono outline-none" />
                                    </div>
                                </div>

                                <div className="bg-gray-950/50 rounded-2xl p-4 border border-gray-800">
                                    <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-4 flex items-center gap-2"><BeakerIcon className="w-4 h-4"/> Requerimientos Nutricionales</h4>
                                    <div className="h-44 overflow-y-auto mb-4 bg-black/40 rounded-xl border border-gray-800 p-3 grid grid-cols-3 gap-2 custom-scrollbar">
                                        {nutrients.map(n => (
                                            <button key={n.id} onClick={() => setSelectedNutrientIds(prev => prev.includes(n.id) ? prev.filter(id => id !== n.id) : [...prev, n.id])}
                                                className={`flex items-center justify-between px-3 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${selectedNutrientIds.includes(n.id) ? 'bg-cyan-600 text-white shadow-lg' : 'bg-gray-900/50 text-gray-500 hover:bg-gray-800'}`}>
                                                <span className="truncate pr-1">{n.name}</span>
                                                {selectedNutrientIds.includes(n.id) && <CheckIcon className="w-3.5 h-3.5" />}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-4">
                                        <input type="number" value={bulkNutMin} onChange={e => setBulkNutMin(e.target.value)} placeholder="Mín Global" className="flex-1 bg-gray-950 border border-gray-800 text-white rounded-xl p-3 text-[12px] font-mono outline-none" />
                                        <input type="number" value={bulkNutMax} onChange={e => setBulkNutMax(e.target.value)} placeholder="Máx Global" className="flex-1 bg-gray-950 border border-gray-800 text-white rounded-xl p-3 text-[12px] font-mono outline-none" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-center pt-4 border-t border-indigo-500/20">
                                <button onClick={handleBulkApplyUnified} className="bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black px-16 py-4 rounded-2xl uppercase tracking-widest text-[12px] shadow-3xl transition-all transform hover:scale-[1.02] flex items-center gap-3">
                                    <CheckIcon className="w-6 h-6"/> INYECTAR SELECCIÓN UNIFICADA AL LOTE
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* FullScreen Matrix Grid Area */}
                    <div className="flex-1 bg-gray-900/60 rounded-3xl border border-gray-800 shadow-3xl flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {selectedProducts.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center p-20 opacity-30">
                                    <DatabaseIcon className="w-24 h-24 mb-6 text-gray-700" />
                                    <p className="text-gray-500 font-black uppercase tracking-[0.5em] text-[20px]">Matrix Empty - Select Diets</p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse table-fixed">
                                    <thead className="sticky top-0 z-40 bg-gray-950">
                                        <tr>
                                            <th className="p-4 w-[280px] bg-gray-900 border-r border-gray-800 relative shadow-2xl">
                                                <div className="text-[12px] font-black text-gray-500 uppercase tracking-[0.3em] text-center">Protocolo de Nutrición</div>
                                            </th>
                                            {selectedProducts.map(p => {
                                                const styles = getColorClasses(getCategoryColor(p.category || ''));
                                                return (
                                                    <th key={p.id} className={`p-4 w-[200px] border-l border-gray-800/40 text-center ${styles.bg} group/item relative`}>
                                                        <button onClick={() => onRemoveDietFromSelection?.(p.id)} className="absolute -top-1 -right-1 opacity-100 bg-red-600 text-white rounded-full p-2 shadow-2xl transition-all hover:scale-110 z-50"><XCircleIcon className="w-4 h-4" /></button>
                                                        <div className="flex flex-col items-center gap-2">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase text-white shadow-xl ${styles.badge}`}>{p.category}</span>
                                                            <span className="text-[12px] font-black text-white uppercase truncate w-full">{p.name}</span>
                                                            <div className="mt-2 w-full max-w-[140px] flex bg-black/60 border border-white/10 rounded-xl overflow-hidden shadow-inner">
                                                                <div className="bg-gray-800 px-2 py-2 flex items-center justify-center border-r border-white/5"><SettingsIcon className="w-4 h-4 text-gray-400" /></div>
                                                                <input type="number" value={batchSizes[p.id] || 1000} onChange={e => setBatchSizes({...batchSizes, [p.id]: Number(e.target.value)})} className="w-full bg-transparent p-2 text-[12px] text-center text-white font-mono outline-none" />
                                                            </div>
                                                        </div>
                                                    </th>
                                                );
                                            })}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/30">
                                        <tr className="bg-indigo-500/5"><td colSpan={selectedProducts.length + 1} className="px-6 py-3 border-y border-gray-800"><div className="flex items-center gap-3"><CubeIcon className="w-4 h-4 text-indigo-400" /><span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.4em]">Inclusión de Insumos (%)</span></div></td></tr>
                                        {activeIngredientIds.map(ingId => (
                                            <tr key={ingId} className="hover:bg-gray-800/40 transition-colors group">
                                                <td className="p-3 pl-8 text-[11px] font-black text-gray-500 group-hover:text-white uppercase border-r border-gray-800 bg-gray-950/20 relative">
                                                    <div className="flex items-center justify-between">
                                                        <span>{ingredients.find(i => i.id === ingId)?.name}</span>
                                                        <button onClick={() => handleRemoveIngredientGlobally(ingId)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 px-2 transition-all"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                                {selectedProducts.map(p => {
                                                    const con = p.ingredientConstraints.find(c => c.ingredientId === ingId);
                                                    return (
                                                        <td key={p.id} className="p-2 border-l border-gray-800/10">
                                                            <div className="flex items-center bg-gray-950 border border-gray-800 rounded-xl overflow-hidden hover:border-indigo-500/40 transition-all shadow-inner">
                                                                <input type="number" step="0.1" value={con?.min ?? ''} placeholder="0" onChange={e => handleConstraintChange(p.id, ingId, 'min', parseFloat(e.target.value), 'ing')} className="w-1/2 bg-transparent text-[11px] text-gray-600 p-2 text-center font-mono outline-none border-r border-gray-800" />
                                                                <input type="number" step="0.1" value={con && con.max < 100 ? con.max : ''} placeholder="100" onChange={e => handleConstraintChange(p.id, ingId, 'max', parseFloat(e.target.value), 'ing')} className="w-1/2 bg-transparent text-[11px] text-indigo-400 font-black p-2 text-center font-mono outline-none" />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                        <tr className="bg-cyan-500/5"><td colSpan={selectedProducts.length + 1} className="px-6 py-3 border-y border-gray-800"><div className="flex items-center gap-3"><BeakerIcon className="w-4 h-4 text-cyan-400" /><span className="text-[10px] font-black text-cyan-300 uppercase tracking-[0.4em]">Propiedades Nutricionales</span></div></td></tr>
                                        {activeNutrientIds.map(nutId => (
                                            <tr key={nutId} className="hover:bg-gray-800/40 transition-colors group">
                                                <td className="p-3 pl-8 text-[11px] font-black text-gray-500 group-hover:text-white uppercase border-r border-gray-800 bg-gray-950/20 relative">
                                                    <div className="flex items-center justify-between">
                                                        <span>{nutrients.find(n => n.id === nutId)?.name}</span>
                                                        <button onClick={() => handleRemoveNutrientGlobally(nutId)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-400 px-2 transition-all"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                                {selectedProducts.map(p => {
                                                    const con = p.constraints.find(c => c.nutrientId === nutId);
                                                    return (
                                                        <td key={p.id} className="p-2 border-l border-gray-800/10">
                                                            <div className="flex items-center bg-gray-950 border border-gray-800 rounded-xl overflow-hidden hover:border-cyan-500/40 transition-all shadow-inner">
                                                                <input type="number" step="0.01" value={con?.min ?? ''} placeholder="min" onChange={e => handleConstraintChange(p.id, nutId, 'min', parseFloat(e.target.value), 'nut')} className="w-1/2 bg-transparent text-[11px] text-gray-600 p-2 text-center font-mono outline-none border-r border-gray-800" />
                                                                <input type="number" step="0.01" value={con && con.max < 999 ? con.max : ''} placeholder="max" onChange={e => handleConstraintChange(p.id, nutId, 'max', parseFloat(e.target.value), 'nut')} className="w-1/2 bg-transparent text-[11px] text-white font-black p-2 text-center font-mono outline-none" />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        {/* Footer Operativo */}
                        <div className="p-6 bg-gray-950 border-t border-gray-800 flex justify-between items-center shrink-0 shadow-[0_-20px_50px_rgba(0,0,0,0.8)]">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest leading-none">Masa de Lote Consolidada</span>
                                <span className="text-[28px] font-black font-mono text-cyan-400 mt-2 leading-none">{Object.values(batchSizes).reduce((a, b) => a + b, 0).toLocaleString()} <span className="text-sm text-gray-700">KG</span></span>
                            </div>
                            <button onClick={handleRunOptimization} disabled={isOptimizing} className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black px-24 py-5 rounded-3xl shadow-3xl transform transition-all hover:scale-[1.03] active:scale-95 flex items-center gap-4 text-[16px] uppercase tracking-[0.3em]">
                                {isOptimizing ? <RefreshIcon className="w-6 h-6 animate-spin" /> : <CalculatorIcon className="w-8 h-8"/>}
                                OPTIMIZAR LOTE COMPLETO
                            </button>
                            <div className="w-[100px]"></div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

    // Helper to generic constraint change
    function handleConstraintChange(productId: string, id: string, field: 'min' | 'max', val: number, type: 'ing' | 'nut') {
        const prod = products.find(p => p.id === productId);
        if(!prod || !onUpdateProduct) return;
        const value = isNaN(val) ? (field === 'max' ? (type === 'ing' ? 100 : 999) : 0) : val;
        let newP = { ...prod };
        if(type === 'ing') {
            const idx = newP.ingredientConstraints.findIndex(c => c.ingredientId === id);
            if(idx >= 0) newP.ingredientConstraints[idx] = { ...newP.ingredientConstraints[idx], [field]: value };
            else newP.ingredientConstraints.push({ ingredientId: id, min: field === 'min' ? value : 0, max: field === 'max' ? value : 100 });
        } else {
            const idx = newP.constraints.findIndex(c => c.nutrientId === id);
            if(idx >= 0) newP.constraints[idx] = { ...newP.constraints[idx], [field]: value };
            else newP.constraints.push({ nutrientId: id, min: field === 'min' ? value : 0, max: field === 'max' ? value : 999 });
        }
        onUpdateProduct(newP);
    }
};
