import React, { useState, useEffect } from 'react';
import { Product, Ingredient, Nutrient } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { DatabaseIcon, CalculatorIcon, SparklesIcon, XCircleIcon, CubeIcon, RefreshIcon, BeakerIcon, ShoppingCartIcon, RatiosIcon, SettingsIcon, CheckIcon } from './icons';
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
    setSavedFormulas
}) => {
    const { t } = useTranslations();
    const [isOptimizing, setIsOptimizing] = useState(false);
    
    // Global Parameters - STOCK DISABLED BY DEFAULT PER USER REQUEST
    const [useStock, setUseStock] = useState(false);
    const [matrixMode, setMatrixMode] = useState<'general' | 'dynamic'>(isDynamicMatrix ? 'dynamic' : 'general');
    const [globalRelation, setGlobalRelation] = useState<string>('none');
    
    // Local State
    const [batchSizes, setBatchSizes] = useState<Record<string, number>>({});
    
    // Drawer State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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

    // Initialize batch sizes for newly selected products
    useEffect(() => {
        setBatchSizes(prev => {
            const next = { ...prev };
            selectedProducts.forEach(p => {
                if (!next[p.id]) next[p.id] = 1000;
            });
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
                setIsDrawerOpen(true);
                setIsDirty?.(true); 
            }
        }, 800);
    };

    const handleAttemptCloseDrawer = () => {
        if (confirm("¿Estás seguro de cerrar el panel? Los resultados no guardados se perderán.")) {
            setIsDrawerOpen(false);
            setResultsData(null);
            setIsDirty?.(false);
        }
    };

    const handleBulkApplyNutrients = () => {
        if (!onUpdateProduct || selectedNutrientIds.length === 0) return;
        selectedProducts.forEach(p => {
            const newP = { ...p, constraints: [...p.constraints] };
            selectedNutrientIds.forEach(nutId => {
                const idx = newP.constraints.findIndex(c => c.nutrientId === nutId);
                const min = bulkNutMin === '' ? 0 : parseFloat(bulkNutMin);
                const max = bulkNutMax === '' ? 999 : parseFloat(bulkNutMax);
                if (idx >= 0) {
                    newP.constraints[idx] = { ...newP.constraints[idx], min, max };
                } else {
                    newP.constraints.push({ nutrientId: nutId, min, max });
                }
            });
            onUpdateProduct(newP);
        });
        setSelectedNutrientIds([]);
        setBulkNutMin('');
        setBulkNutMax('');
    };

    const handleBulkApplyIngredients = () => {
        if (!onUpdateProduct || selectedIngredientIds.length === 0) return;
        selectedProducts.forEach(p => {
            const newP = { ...p, ingredientConstraints: [...p.ingredientConstraints] };
            selectedIngredientIds.forEach(ingId => {
                const idx = newP.ingredientConstraints.findIndex(c => c.ingredientId === ingId);
                const min = bulkIngMin === '' ? 0 : parseFloat(bulkIngMin);
                const max = bulkIngMax === '' ? 100 : parseFloat(bulkIngMax);
                if (idx >= 0) {
                    newP.ingredientConstraints[idx] = { ...newP.ingredientConstraints[idx], min, max };
                } else {
                    newP.ingredientConstraints.push({ ingredientId: ingId, min, max });
                }
            });
            onUpdateProduct(newP);
        });
        setSelectedIngredientIds([]);
        setBulkIngMin('');
        setBulkIngMax('');
    };

    const activeNutrientIds = Array.from(new Set(selectedProducts.flatMap(p => p.constraints.map(c => c.nutrientId))));
    const activeIngredientIds = Array.from(new Set(selectedProducts.flatMap(p => p.ingredientConstraints.map(c => c.ingredientId))));
    const activeRelationNames = Array.from(new Set(selectedProducts.flatMap(p => p.relationships.map(r => r.name))));

    return (
        <div className="p-3 space-y-4 flex flex-col h-full relative">
            {/* Toolbar Parámetros Globales */}
            <div className="bg-gray-900 border border-gray-700/80 rounded-xl p-3 shadow-lg shadow-gray-950/50 flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20">
                        <CalculatorIcon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-[14px] font-black text-white uppercase tracking-wider leading-none">Centro de Optimización</h2>
                        <p className="text-cyan-500/70 font-bold text-[9px] uppercase tracking-widest mt-1 leading-none">Cálculo de Formulación Táctica</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 bg-gray-950/50 p-1.5 rounded-lg border border-gray-800">
                    <div className={`px-3 py-1.5 rounded flex items-center gap-2 transition-all ${useStock ? 'bg-emerald-500/10 border-emerald-500/30 border' : 'border border-transparent opacity-50'}`}>
                        <span className="text-[9px] font-black text-gray-300 uppercase leading-none">Restringir Stock</span>
                        <button onClick={() => { setUseStock(!useStock); setIsDirty?.(true); }} className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${useStock ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${useStock ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <div className="w-px h-6 bg-gray-700"></div>
                    <div className={`px-3 py-1.5 rounded flex items-center gap-2 transition-all ${matrixMode === 'dynamic' ? 'bg-indigo-500/10 border-indigo-500/30 border' : 'border border-transparent'}`}>
                        <span className="text-[9px] font-black text-gray-300 uppercase leading-none">Matriz Dinámica</span>
                        <button onClick={() => { setMatrixMode(matrixMode === 'dynamic' ? 'general' : 'dynamic'); setIsDirty?.(true); }} className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${matrixMode === 'dynamic' ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${matrixMode === 'dynamic' ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <div className="w-px h-6 bg-gray-700"></div>
                    <div className="px-2">
                        <select value={globalRelation} onChange={(e) => setGlobalRelation(e.target.value)} className="bg-gray-900 border border-gray-700 text-yellow-500 font-bold text-[10px] uppercase rounded px-2 py-1 outline-none focus:border-yellow-500">
                            <option value="none">Sin relaciones activas</option>
                            <option value="ca_p">Mínimo Global Ca:P</option>
                            <option value="na_cl">Mínimo Global Na:Cl</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Bulk Control Panel - REORDERED: Ingredients Left, Nutrients Right */}
            <div className={`overflow-hidden transition-all duration-300 ${showBulkPanel ? 'max-h-[800px] mb-6' : 'max-h-0'}`}>
                <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-sm space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-lg"><SparklesIcon className="w-5 h-5 text-indigo-400" /></div>
                            <div>
                                <h3 className="text-[14px] font-black text-white uppercase tracking-widest leading-none">Inyectar Parámetros al Lote</h3>
                                <p className="text-[9px] text-gray-500 uppercase font-bold mt-1 tracking-tighter">Selecciona múltiples ítems para agregar a todas las dietas</p>
                            </div>
                        </div>
                        <button onClick={() => setShowBulkPanel(false)} className="text-gray-500 hover:text-white transition-colors"><XCircleIcon className="w-6 h-6"/></button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Ingredients Multi Select (LEFT) */}
                        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
                            <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3">Límites de Inclusión (Insumos)</h4>
                            <div className="h-40 overflow-y-auto mb-4 bg-gray-950 rounded border border-gray-800 p-2 grid grid-cols-2 gap-2 custom-scrollbar">
                                {ingredients.map(i => (
                                    <button 
                                        key={i.id}
                                        onClick={() => setSelectedIngredientIds(prev => prev.includes(i.id) ? prev.filter(id => id !== i.id) : [...prev, i.id])}
                                        className={`flex items-center justify-between px-2 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${selectedIngredientIds.includes(i.id) ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}
                                    >
                                        <span className="truncate pr-2">{i.name}</span>
                                        {selectedIngredientIds.includes(i.id) && <CheckIcon className="w-3 h-3" />}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3 items-end">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[8px] font-black text-gray-500 uppercase">Min %</label>
                                    <input type="number" value={bulkIngMin} onChange={e => setBulkIngMin(e.target.value)} placeholder="0" className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg p-2 text-[11px] font-mono outline-none" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-[8px] font-black text-gray-500 uppercase">Max %</label>
                                    <input type="number" value={bulkIngMax} onChange={e => setBulkIngMax(e.target.value)} placeholder="100" className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg p-2 text-[11px] font-mono outline-none" />
                                </div>
                                <button onClick={handleBulkApplyIngredients} className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-4 py-2 rounded-lg text-[10px] uppercase transition-all shadow-lg shadow-indigo-900/20">Inyectar Insumos</button>
                            </div>
                        </div>

                        {/* Nutrients Multi Select (RIGHT) */}
                        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4">
                            <h4 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-3">Requerimientos Nutricionales</h4>
                            <div className="h-40 overflow-y-auto mb-4 bg-gray-950 rounded border border-gray-800 p-2 grid grid-cols-2 gap-2 custom-scrollbar">
                                {nutrients.map(n => (
                                    <button 
                                        key={n.id}
                                        onClick={() => setSelectedNutrientIds(prev => prev.includes(n.id) ? prev.filter(id => id !== n.id) : [...prev, n.id])}
                                        className={`flex items-center justify-between px-2 py-1.5 rounded text-[10px] font-bold uppercase transition-all ${selectedNutrientIds.includes(n.id) ? 'bg-cyan-600 text-white shadow-lg' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}
                                    >
                                        <span className="truncate pr-2">{n.name}</span>
                                        {selectedNutrientIds.includes(n.id) && <CheckIcon className="w-3 h-3" />}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-3 items-end">
                                <div className="flex-1 space-y-1">
                                    <label className="text-[8px] font-black text-gray-500 uppercase">Mín Global</label>
                                    <input type="number" value={bulkNutMin} onChange={e => setBulkNutMin(e.target.value)} placeholder="0.0" className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg p-2 text-[11px] font-mono outline-none" />
                                </div>
                                <div className="flex-1 space-y-1">
                                    <label className="text-[8px] font-black text-gray-500 uppercase">Máx Global</label>
                                    <input type="number" value={bulkNutMax} onChange={e => setBulkNutMax(e.target.value)} placeholder="99.9" className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg p-2 text-[11px] font-mono outline-none" />
                                </div>
                                <button onClick={handleBulkApplyNutrients} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black px-4 py-2 rounded-lg text-[10px] uppercase transition-all shadow-lg shadow-cyan-900/20">Inyectar Nutrientes</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* VERTICAL MATRIX (REORDERED: Ingredients Top, Nutrients Bottom) */}
            <div className="flex-1 bg-gray-900/50 rounded-2xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <h3 className="text-[12px] font-black text-white uppercase tracking-[0.2em]">Consola de Nutrición Vertical</h3>
                        <div className="h-4 w-px bg-gray-700"></div>
                        <button onClick={() => setShowBulkPanel(!showBulkPanel)} className="flex items-center gap-2 text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase transition-colors">
                            <SparklesIcon className="w-3.5 h-3.5" /> Inyectar Global
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    {selectedProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                            <DatabaseIcon className="w-12 h-12 mb-4 text-gray-600" />
                            <p className="text-gray-400 font-black uppercase tracking-widest text-[14px]">Sin Selección Activa</p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse table-fixed">
                            <thead className="sticky top-0 z-30 bg-gray-950">
                                <tr>
                                    <th className="p-3 w-[250px] bg-gray-900 border-r border-gray-800">
                                        <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest text-center">Insumos y Nutrición</div>
                                    </th>
                                    {selectedProducts.map(p => {
                                        const styles = getColorClasses(getCategoryColor(p.category || ''));
                                        return (
                                            <th key={p.id} className={`p-3 w-[160px] border-l border-gray-800/50 text-center ${styles.bg}`}>
                                                <div className="flex flex-col items-center gap-1">
                                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase text-white shadow ${styles.badge}`}>{p.category || 'Sin Cat'}</span>
                                                    <span className="text-[10px] font-black text-white uppercase truncate max-w-full">{p.name}</span>
                                                    <div className="mt-1 w-full max-w-[120px]">
                                                        <div className="flex bg-black/40 border border-white/10 rounded overflow-hidden">
                                                            <div className="bg-gray-800 px-1 py-1 flex items-center justify-center border-r border-white/5"><SettingsIcon className="w-2.5 h-2.5 text-gray-400" /></div>
                                                            <input type="number" value={batchSizes[p.id] || 1000} onChange={e => setBatchSizes({...batchSizes, [p.id]: Number(e.target.value)})} className="w-full bg-transparent p-1 text-[10px] text-center text-white font-mono outline-none focus:bg-indigo-500/10" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {/* SECTION: INGREDIENTS (NOW AT THE TOP) */}
                                <tr className="bg-gray-900 shadow-inner">
                                    <td colSpan={selectedProducts.length + 1} className="px-4 py-1.5 border-y border-gray-800 bg-indigo-500/10">
                                        <div className="flex items-center gap-2">
                                            <CubeIcon className="w-3.5 h-3.5 text-indigo-400" />
                                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Inclusión de Insumos (%)</span>
                                        </div>
                                    </td>
                                </tr>
                                {activeIngredientIds.map(ingId => {
                                    const ing = ingredients.find(i => i.id === ingId);
                                    return (
                                        <tr key={ingId} className="border-b border-gray-800/20 hover:bg-gray-800/20 transition-colors group">
                                            <td className="p-2 pl-6 text-[10px] font-bold text-gray-400 group-hover:text-white uppercase bg-gray-950/20 border-r border-gray-800">
                                                <div className="flex items-center gap-2 truncate">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600"></div>
                                                    {ing?.name}
                                                </div>
                                            </td>
                                            {selectedProducts.map(p => {
                                                const con = p.ingredientConstraints.find(c => c.ingredientId === ingId);
                                                return (
                                                    <td key={p.id} className="p-1 px-2 border-l border-gray-800/10">
                                                        <div className="flex items-center gap-1 bg-gray-900/50 rounded border border-transparent hover:border-indigo-500/30 overflow-hidden">
                                                            <input type="number" step="0.1" value={con?.min ?? ''} placeholder="0" onChange={e => {
                                                                if (!onUpdateProduct) return;
                                                                const val = parseFloat(e.target.value);
                                                                const newC = [...p.ingredientConstraints];
                                                                const idx = newC.findIndex(c => c.ingredientId === ingId);
                                                                if (idx >= 0) newC[idx].min = isNaN(val) ? 0 : val;
                                                                else newC.push({ ingredientId: ingId, min: isNaN(val) ? 0 : val, max: 100 });
                                                                onUpdateProduct({ ...p, ingredientConstraints: newC });
                                                            }} className="w-1/2 bg-transparent text-[10px] text-gray-500 rounded-none p-1 text-center font-mono outline-none border-r border-gray-800/50" />
                                                            <input type="number" step="0.1" value={con && con.max < 100 ? con.max : ''} placeholder="100" onChange={e => {
                                                                if (!onUpdateProduct) return;
                                                                const val = parseFloat(e.target.value);
                                                                const newC = [...p.ingredientConstraints];
                                                                const idx = newC.findIndex(c => c.ingredientId === ingId);
                                                                if (idx >= 0) newC[idx].max = isNaN(val) ? 100 : val;
                                                                else newC.push({ ingredientId: ingId, min: 0, max: isNaN(val) ? 100 : val });
                                                                onUpdateProduct({ ...p, ingredientConstraints: newC });
                                                            }} className="w-1/2 bg-transparent text-[10px] text-indigo-400 font-bold rounded-none p-1 text-center font-mono outline-none" />
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}

                                {/* SECTION: NUTRIENTS (NOW BELOW INGREDIENTS) */}
                                <tr className="bg-gray-900 shadow-inner">
                                    <td colSpan={selectedProducts.length + 1} className="px-4 py-1.5 border-y border-gray-800 bg-cyan-500/10">
                                        <div className="flex items-center gap-2">
                                            <BeakerIcon className="w-3.5 h-3.5 text-cyan-500" />
                                            <span className="text-[9px] font-black text-cyan-500 uppercase tracking-[0.3em]">Requerimientos Nutricionales</span>
                                        </div>
                                    </td>
                                </tr>
                                {activeNutrientIds.map(nutId => {
                                    const nut = nutrients.find(n => n.id === nutId);
                                    return (
                                        <tr key={nutId} className="border-b border-gray-800/20 hover:bg-gray-800/20 transition-colors group">
                                            <td className="p-2 pl-6 text-[10px] font-bold text-gray-400 group-hover:text-white uppercase bg-gray-950/20 border-r border-gray-800">
                                                <div className="flex items-center justify-between">
                                                    <span>{nut?.name}</span>
                                                    <span className="text-[7px] text-gray-600 font-mono pr-2">{nut?.unit}</span>
                                                </div>
                                            </td>
                                            {selectedProducts.map(p => {
                                                const con = p.constraints.find(c => c.nutrientId === nutId);
                                                return (
                                                    <td key={p.id} className="p-1 px-2 border-l border-gray-800/10">
                                                        <div className="flex items-center gap-1 bg-gray-900/50 rounded border border-transparent hover:border-cyan-500/30 overflow-hidden">
                                                            <input type="number" step="0.01" value={con?.min ?? ''} placeholder="min" onChange={e => {
                                                                if (!onUpdateProduct) return;
                                                                const val = parseFloat(e.target.value);
                                                                const newC = [...p.constraints];
                                                                const idx = newC.findIndex(c => c.nutrientId === nutId);
                                                                if (idx >= 0) newC[idx].min = isNaN(val) ? 0 : val;
                                                                else newC.push({ nutrientId: nutId, min: isNaN(val) ? 0 : val, max: 999 });
                                                                onUpdateProduct({ ...p, constraints: newC });
                                                            }} className="w-1/2 bg-transparent text-[10px] text-gray-500 rounded-none p-1 text-center font-mono outline-none border-r border-gray-800/50" />
                                                            <input type="number" step="0.01" value={con && con.max < 999 ? con.max : ''} placeholder="max" onChange={e => {
                                                                if (!onUpdateProduct) return;
                                                                const val = parseFloat(e.target.value);
                                                                const newC = [...p.constraints];
                                                                const idx = newC.findIndex(c => c.nutrientId === nutId);
                                                                if (idx >= 0) newC[idx].max = isNaN(val) ? 999 : val;
                                                                else newC.push({ nutrientId: nutId, min: 0, max: isNaN(val) ? 999 : val });
                                                                onUpdateProduct({ ...p, constraints: newC });
                                                            }} className="w-1/2 bg-transparent text-[10px] text-white font-black rounded-none p-1 text-center font-mono outline-none" />
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}

                                {/* SECTION: RATIOS */}
                                {activeRelationNames.length > 0 && (
                                    <>
                                        <tr className="bg-gray-900 shadow-inner">
                                            <td colSpan={selectedProducts.length + 1} className="px-4 py-1.5 border-y border-gray-800 bg-yellow-500/10">
                                                <div className="flex items-center gap-2">
                                                    <RatiosIcon className="w-3.5 h-3.5 text-yellow-500" />
                                                    <span className="text-[9px] font-black text-yellow-500 uppercase tracking-[0.3em]">Relaciones y Balances</span>
                                                </div>
                                            </td>
                                        </tr>
                                        {activeRelationNames.map(relName => (
                                            <tr key={relName} className="border-b border-gray-800/20 hover:bg-gray-800/20 transition-colors group">
                                                <td className="p-2 pl-6 text-[10px] font-bold text-yellow-500/80 group-hover:text-yellow-500 uppercase bg-gray-950/20 border-r border-gray-800">{relName}</td>
                                                {selectedProducts.map(p => {
                                                    const rel = p.relationships.find(r => r.name === relName);
                                                    return (
                                                        <td key={p.id} className="p-1 px-2 border-l border-gray-800/10">
                                                            <div className="flex items-center gap-1 bg-yellow-950/10 rounded border border-transparent hover:border-yellow-500/30 overflow-hidden">
                                                                <input type="number" step="0.01" value={rel?.min ?? ''} placeholder="min" onChange={e => {
                                                                    if (!onUpdateProduct) return;
                                                                    const val = parseFloat(e.target.value);
                                                                    const newR = [...p.relationships];
                                                                    const idx = newR.findIndex(r => r.name === relName);
                                                                    if (idx >= 0) { newR[idx].min = isNaN(val) ? 0 : val; onUpdateProduct({ ...p, relationships: newR }); }
                                                                }} className="w-1/2 bg-transparent text-[10px] text-yellow-600 rounded-none p-1 text-center font-mono outline-none border-r border-yellow-800/20" />
                                                                <input type="number" step="0.01" value={rel && rel.max < 999 ? rel.max : ''} placeholder="max" onChange={e => {
                                                                    if (!onUpdateProduct) return;
                                                                    const val = parseFloat(e.target.value);
                                                                    const newR = [...p.relationships];
                                                                    const idx = newR.findIndex(r => r.name === relName);
                                                                    if (idx >= 0) { newR[idx].max = isNaN(val) ? 999 : val; onUpdateProduct({ ...p, relationships: newR }); }
                                                                }} className="w-1/2 bg-transparent text-[10px] text-white font-black rounded-none p-1 text-center font-mono outline-none" />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </>
                                )}

                                {/* SECTION: OPERATIONAL SUMMARY */}
                                <tr className="sticky bottom-0 z-30 bg-amber-500 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
                                    <td className="p-2 px-4 bg-amber-600 border-r border-amber-400">
                                        <div className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                            <SettingsIcon className="w-3.5 h-3.5" /> Resumen Operativo (kg)
                                        </div>
                                    </td>
                                    {selectedProducts.map(p => (
                                        <td key={p.id} className="p-2 border-l border-amber-400 text-center font-black text-white bg-amber-500">
                                            <span className="text-[12px] font-mono tracking-tighter">{(batchSizes[p.id] || 1000).toLocaleString()}</span>
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Footer Optimizer Always Visible */}
                <div className="p-3 bg-gray-900 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                    <div className="flex gap-4">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Masa de Lote Global</span>
                            <span className="text-[16px] font-black font-mono text-cyan-400 leading-none">{Object.values(batchSizes).reduce((a, b) => a + b, 0).toLocaleString()} <span className="text-[9px] text-gray-500">kg</span></span>
                        </div>
                    </div>
                    <button 
                        onClick={handleRunOptimization}
                        disabled={isOptimizing}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-12 py-2.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all transform hover:scale-[1.02] flex items-center gap-3 text-[13px] uppercase tracking-[0.2em]"
                    >
                        {isOptimizing ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <CalculatorIcon className="w-5 h-5"/>}
                        OPTIMIZAR GRUPO
                    </button>
                    <div className="w-[120px] hidden md:block"></div>
                </div>
            </div>

            {/* Results Drawer */}
            {isDrawerOpen && resultsData && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" onClick={handleAttemptCloseDrawer} />
                    <div className="fixed inset-y-0 right-0 w-[85vw] bg-gray-950 border-l border-gray-800 z-[100] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col transform">
                        <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <SparklesIcon className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-[16px] font-black text-white uppercase tracking-wide">Resultados del Lote Consolidado</h2>
                            </div>
                            <button onClick={handleAttemptCloseDrawer} className="text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold text-[11px] uppercase">
                                Salir <XCircleIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-gray-900/30">
                            <GroupResultsScreen results={resultsData.result} assignments={resultsData.assignments} products={products} ingredients={ingredients} nutrients={nutrients} isDynamicMatrix={matrixMode === 'dynamic'} onUpdateProduct={onUpdateProduct || (() => {})} onCloseDrawer={() => { setIsDrawerOpen(false); setResultsData(null); setIsDirty?.(false); }} savedFormulas={savedFormulas} setSavedFormulas={setSavedFormulas} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
