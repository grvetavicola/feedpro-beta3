import React, { useState, useEffect, useMemo } from 'react';
import { Product, Ingredient, Nutrient } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { DatabaseIcon, CalculatorIcon, SparklesIcon, XCircleIcon, CubeIcon, RefreshIcon, BeakerIcon, SettingsIcon, CheckIcon, TrashIcon } from './icons';
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

// ─── Chip Component for injected params ───────────────────────────────────────
const Chip = ({ label, sublabel, color, onRemove }: { label: string; sublabel?: string; color: 'indigo' | 'cyan'; onRemove: () => void }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${color === 'indigo' ? 'bg-indigo-900/40 border-indigo-500/30 text-indigo-300' : 'bg-cyan-900/40 border-cyan-500/30 text-cyan-300'} whitespace-nowrap`}>
        {label}{sublabel && <span className="opacity-60 ml-0.5">{sublabel}</span>}
        <button onClick={onRemove} className="ml-0.5 opacity-50 hover:opacity-100 transition-opacity"><svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></button>
    </span>
);

// ─── Toggle Switch ─────────────────────────────────────────────────────────────
const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) => (
    <label className="flex items-center gap-2 cursor-pointer select-none">
        <span className={`text-[10px] font-black uppercase tracking-wider transition-colors ${value ? 'text-emerald-400' : 'text-gray-600'}`}>{label}</span>
        <button onClick={onChange} className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${value ? 'bg-emerald-500' : 'bg-gray-700'}`}>
            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
    </label>
);

export const GroupOptimizationScreen: React.FC<GroupOptimizationScreenProps> = ({
    products, ingredients, nutrients, isDynamicMatrix,
    selectedDietIds, onOpenInNewWindow, onUpdateProduct,
    setIsDirty, savedFormulas, setSavedFormulas, onRemoveDietFromSelection, onClosePortal
}) => {
    // ── Core State ──────────────────────────────────────────────────────────────
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [useStock, setUseStock] = useState(false);
    const [matrixMode, setMatrixMode] = useState<'general' | 'dynamic'>(isDynamicMatrix ? 'dynamic' : 'general');
    const [batchSizes, setBatchSizes] = useState<Record<string, number>>({});

    // ── Results Navigation ───────────────────────────────────────────────────────
    const [isFullScreenResults, setIsFullScreenResults] = useState(false);
    const [resultsData, setResultsData] = useState<{ result: any; assignments: any } | null>(null);

    // ── Accordion State ──────────────────────────────────────────────────────────
    const [isPanelExpanded, setIsPanelExpanded] = useState(true);

    // ── Injector State (single-row form) ─────────────────────────────────────────
    const [injectorMode, setInjectorMode] = useState<'ing' | 'nut'>('ing');
    const [injectorSearch, setInjectorSearch] = useState('');
    const [injectorMin, setInjectorMin] = useState('');
    const [injectorMax, setInjectorMax] = useState('');

    // ── Active injected params (chips) ───────────────────────────────────────────
    const activeIngredientIds = useMemo(() =>
        Array.from(new Set(products.filter(p => selectedDietIds.includes(p.id)).flatMap(p => p.ingredientConstraints.map(c => c.ingredientId)))),
        [products, selectedDietIds]);

    const activeNutrientIds = useMemo(() =>
        Array.from(new Set(products.filter(p => selectedDietIds.includes(p.id)).flatMap(p => p.constraints.map(c => c.nutrientId)))),
        [products, selectedDietIds]);

    // ── Track which IDs were injected via bulk (for highlight in results) ─────────
    const [injectedIngIds, setInjectedIngIds] = useState<Set<string>>(new Set());
    const [injectedNutIds, setInjectedNutIds] = useState<Set<string>>(new Set());

    // ── Local diet selection (embedded tree) ─────────────────────────────────────
    const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedDietIds);
    useEffect(() => { setLocalSelectedIds(selectedDietIds); }, [selectedDietIds]);

    // ── Batch sizes init ─────────────────────────────────────────────────────────
    const selectedProducts = products.filter(p => localSelectedIds.includes(p.id));
    useEffect(() => {
        setBatchSizes(prev => {
            const next = { ...prev };
            selectedProducts.forEach(p => { if (!next[p.id]) next[p.id] = 1000; });
            return next;
        });
    }, [localSelectedIds]);

    // ── Diet Tree (grouped by category) ─────────────────────────────────────────
    const dietsByCategory = useMemo(() => {
        const map: Record<string, Product[]> = {};
        products.forEach(p => {
            const cat = p.category || 'General';
            if (!map[cat]) map[cat] = [];
            map[cat].push(p);
        });
        return map;
    }, [products]);

    const toggleDiet = (id: string) => {
        setLocalSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleCategory = (prods: Product[]) => {
        const ids = prods.map(p => p.id);
        const allSelected = ids.every(id => localSelectedIds.includes(id));
        setLocalSelectedIds(prev =>
            allSelected ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))
        );
    };

    // ── Injector filtered options ─────────────────────────────────────────────────
    const injectorOptions = useMemo(() => {
        const term = injectorSearch.toLowerCase();
        if (injectorMode === 'ing') return ingredients.filter(i => i.name.toLowerCase().includes(term));
        return nutrients.filter(n => n.name.toLowerCase().includes(term));
    }, [injectorMode, injectorSearch, ingredients, nutrients]);

    const handleQuickInject = (id: string, name: string) => {
        if (!onUpdateProduct) return;
        const min = injectorMin === '' ? 0 : parseFloat(injectorMin);
        const max = injectorMax === '' ? (injectorMode === 'ing' ? 100 : 999) : parseFloat(injectorMax);
        selectedProducts.forEach(p => {
            const newP = { ...p };
            if (injectorMode === 'ing') {
                const idx = newP.ingredientConstraints.findIndex(c => c.ingredientId === id);
                if (idx >= 0) newP.ingredientConstraints = newP.ingredientConstraints.map((c, i) => i === idx ? { ...c, min, max } : c);
                else newP.ingredientConstraints = [...newP.ingredientConstraints, { ingredientId: id, min, max }];
            } else {
                const idx = newP.constraints.findIndex(c => c.nutrientId === id);
                if (idx >= 0) newP.constraints = newP.constraints.map((c, i) => i === idx ? { ...c, min, max } : c);
                else newP.constraints = [...newP.constraints, { nutrientId: id, min, max }];
            }
            onUpdateProduct(newP);
        });
        // Track injected IDs and auto-collapse
        if (injectorMode === 'ing') setInjectedIngIds(prev => new Set([...prev, id]));
        else setInjectedNutIds(prev => new Set([...prev, id]));
        setInjectorSearch('');
        setInjectorMin('');
        setInjectorMax('');
        setIsPanelExpanded(false); // AUTO-COLAPSO
    };

    const handleRemoveChip = (id: string, type: 'ing' | 'nut') => {
        if (!onUpdateProduct) return;
        selectedProducts.forEach(p => {
            if (type === 'ing') onUpdateProduct({ ...p, ingredientConstraints: p.ingredientConstraints.filter(c => c.ingredientId !== id) });
            else onUpdateProduct({ ...p, constraints: p.constraints.filter(c => c.nutrientId !== id) });
        });
        // Remove from injected tracking
        if (type === 'ing') setInjectedIngIds(prev => { const s = new Set(prev); s.delete(id); return s; });
        else setInjectedNutIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    };

    // ── Optimization ─────────────────────────────────────────────────────────────
    const handleRunOptimization = () => {
        if (selectedProducts.length === 0) return;
        setIsOptimizing(true);
        const assignments = selectedProducts.map(p => ({
            id: `as-${Date.now()}-${p.id}`, productId: p.id, product: p,
            batchSize: batchSizes[p.id] || 1000
        }));
        setTimeout(() => {
            const result = solveGroupFormulation(assignments, ingredients, nutrients, matrixMode === 'dynamic', useStock);
            setIsOptimizing(false);
            setResultsData({ result, assignments });
            setIsFullScreenResults(true);
            setIsDirty?.(true);
        }, 800);
    };

    // ── Constraint helper ─────────────────────────────────────────────────────────
    const handleConstraintChange = (productId: string, id: string, field: 'min' | 'max', val: number, type: 'ing' | 'nut') => {
        const prod = products.find(p => p.id === productId);
        if (!prod || !onUpdateProduct) return;
        const value = isNaN(val) ? (field === 'max' ? (type === 'ing' ? 100 : 999) : 0) : val;
        const newP = { ...prod };
        if (type === 'ing') {
            const idx = newP.ingredientConstraints.findIndex(c => c.ingredientId === id);
            if (idx >= 0) newP.ingredientConstraints[idx] = { ...newP.ingredientConstraints[idx], [field]: value };
            else newP.ingredientConstraints.push({ ingredientId: id, min: field === 'min' ? value : 0, max: field === 'max' ? value : 100 });
        } else {
            const idx = newP.constraints.findIndex(c => c.nutrientId === id);
            if (idx >= 0) newP.constraints[idx] = { ...newP.constraints[idx], [field]: value };
            else newP.constraints.push({ nutrientId: id, min: field === 'min' ? value : 0, max: field === 'max' ? value : 999 });
        }
        onUpdateProduct(newP);
    };

    const totalBatch = Object.entries(batchSizes).filter(([id]) => localSelectedIds.includes(id)).reduce((a, [, b]) => a + b, 0);

    // ── Show results fullscreen ────────────────────────────────────────────────────
    if (isFullScreenResults && resultsData) {
        return (
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
                injectedIngIds={injectedIngIds}
                injectedNutIds={injectedNutIds}
            />
        );
    }

    return (
        <div className="flex flex-col h-full overflow-hidden animate-fade-in text-[12px]">

            {/* ═══════════════════════════════════════════════════════════════════
                BLOQUE SUPERIOR COLAPSABLE — máx 30vh
            ══════════════════════════════════════════════════════════════════════ */}
            <div className="shrink-0 border border-gray-700 rounded-xl bg-gray-900/80 overflow-hidden shadow-2xl mb-2">

                {/* ─── Barra de resumen (siempre visible) ─── */}
                <div className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-800/50">
                    {/* Toggles */}
                    <Toggle label="Stock" value={useStock} onChange={() => setUseStock(!useStock)} />
                    <div className="w-px h-4 bg-gray-800"/>
                    <Toggle label="Dinámica" value={matrixMode === 'dynamic'} onChange={() => setMatrixMode(matrixMode === 'dynamic' ? 'general' : 'dynamic')} />
                    <div className="w-px h-4 bg-gray-800"/>

                    {/* Chips inline cuando colapsado */}
                    {!isPanelExpanded && (activeIngredientIds.length > 0 || activeNutrientIds.length > 0) && (
                        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto custom-scrollbar py-0.5">
                            {activeIngredientIds.map(id => {
                                const ing = ingredients.find(i => i.id === id);
                                return ing ? (
                                    <Chip key={id} label={ing.name} color="indigo" onRemove={() => handleRemoveChip(id, 'ing')}
                                        sublabel={injectedIngIds.has(id) ? ' ★' : ''} />
                                ) : null;
                            })}
                            {activeNutrientIds.map(id => {
                                const nut = nutrients.find(n => n.id === id);
                                return nut ? (
                                    <Chip key={id} label={nut.name} color="cyan" onRemove={() => handleRemoveChip(id, 'nut')}
                                        sublabel={injectedNutIds.has(id) ? ' ★' : ''} />
                                ) : null;
                            })}
                        </div>
                    )}
                    {!isPanelExpanded && activeIngredientIds.length === 0 && activeNutrientIds.length === 0 && (
                        <span className="text-[10px] text-gray-700 flex-1 font-bold uppercase tracking-widest">{localSelectedIds.length} dietas · Sin inyecciones</span>
                    )}

                    <div className="flex-1"/>

                    {/* Botón colapsar/expandir */}
                    <button
                        onClick={() => setIsPanelExpanded(!isPanelExpanded)}
                        className="flex items-center gap-1.5 text-[10px] font-black text-gray-500 hover:text-white uppercase tracking-widest transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
                    >
                        {isPanelExpanded ? (
                            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>Contraer</>
                        ) : (
                            <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>Editar</>
                        )}
                    </button>

                    {/* Botón Optimizar siempre visible */}
                    <button
                        onClick={handleRunOptimization}
                        disabled={isOptimizing || localSelectedIds.length === 0}
                        className="flex items-center gap-2 bg-gradient-to-r from-emerald-700 to-cyan-700 hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-5 py-2 rounded-lg text-[11px] uppercase tracking-widest shadow-lg transition-all hover:scale-[1.02] active:scale-95"
                    >
                        {isOptimizing ? <RefreshIcon className="w-4 h-4 animate-spin" /> : <CalculatorIcon className="w-4 h-4" />}
                        Ejecutar Optimización Grupal
                    </button>
                </div>

                {/* ─── Panel expandible ─── */}
                <div className={`overflow-hidden transition-all duration-200 ease-in-out ${isPanelExpanded ? 'flex-1' : 'max-h-0'}`} style={{overflowY: 'auto'}}>
                    <div className="grid grid-cols-[220px_1fr] divide-x divide-gray-700 h-full">

                        {/* ── Columna Izq: Árbol de Dietas ── */}
                        <div className="p-3 overflow-y-auto custom-scrollbar" style={{maxHeight: 'calc(30vh - 44px)'}}>
                            <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mb-2 px-1">Selección de Dietas</p>
                            {Object.entries(dietsByCategory).map(([cat, prods]) => {
                                const allSelected = prods.every(p => localSelectedIds.includes(p.id));
                                const someSelected = prods.some(p => localSelectedIds.includes(p.id));
                                return (
                                    <div key={cat} className="mb-2">
                                        <button
                                            onClick={() => toggleCategory(prods)}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800/60 transition-all group"
                                        >
                                            <div className={`w-3 h-3 rounded border flex items-center justify-center transition-all shrink-0 ${allSelected ? 'bg-emerald-500 border-emerald-500' : someSelected ? 'bg-emerald-900 border-emerald-500' : 'border-gray-700 bg-transparent'}`}>
                                                {(allSelected || someSelected) && <CheckIcon className="w-2 h-2 text-white" />}
                                            </div>
                                            <span className="text-[10px] font-black text-gray-200 group-hover:text-white uppercase truncate">{cat}</span>
                                            <span className="ml-auto text-[9px] text-gray-600">{prods.filter(p => localSelectedIds.includes(p.id)).length}/{prods.length}</span>
                                        </button>
                                        <div className="ml-4 space-y-0.5 mt-0.5">
                                            {prods.map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => toggleDiet(p.id)}
                                                    className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg transition-all text-left ${localSelectedIds.includes(p.id) ? 'bg-emerald-500/10 text-emerald-300' : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-100'}`}
                                                >
                                                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${localSelectedIds.includes(p.id) ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' : 'bg-gray-700'}`} />
                                                    <span className="text-[10px] font-bold truncate">{p.name}</span>
                                                    {localSelectedIds.includes(p.id) && (
                                                        <input
                                                            type="number"
                                                            value={batchSizes[p.id] || 1000}
                                                            onClick={e => e.stopPropagation()}
                                                            onChange={e => setBatchSizes({ ...batchSizes, [p.id]: Number(e.target.value) })}
                                                            className="ml-auto w-16 bg-gray-950 border border-gray-800 rounded px-1 py-0.5 text-[9px] text-center font-mono text-white outline-none"
                                                        />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ── Columna Der: Inyector Compacto ── */}
                        <div className="p-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar" style={{maxHeight: 'calc(30vh - 44px)'}}>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.3em]">Añadir parámetro a las dietas seleccionadas:</p>

                            {/* Fila única del Inyector */}
                            <div className="flex items-center gap-2 bg-gray-800 border border-gray-600 rounded-xl px-3 py-2">
                                {/* Modo toggle */}
                                <div className="flex rounded-lg overflow-hidden border border-gray-700 shrink-0">
                                    <button onClick={() => setInjectorMode('ing')} className={`px-3 py-1.5 text-[9px] font-black uppercase transition-all ${injectorMode === 'ing' ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-800'}`}>
                                        <CubeIcon className="w-3 h-3 inline mr-1"/>Insumo
                                    </button>
                                    <button onClick={() => setInjectorMode('nut')} className={`px-3 py-1.5 text-[9px] font-black uppercase transition-all ${injectorMode === 'nut' ? 'bg-cyan-600 text-white' : 'bg-gray-900 text-gray-300 hover:text-white hover:bg-gray-800'}`}>
                                        <BeakerIcon className="w-3 h-3 inline mr-1"/>Nutriente
                                    </button>
                                </div>
                                {/* Buscador */}
                                <input
                                    type="text"
                                    value={injectorSearch}
                                    onChange={e => setInjectorSearch(e.target.value)}
                                    placeholder={injectorMode === 'ing' ? 'Buscar insumo...' : 'Buscar nutriente...'}
                                    className="flex-1 bg-transparent text-white text-[11px] outline-none placeholder-gray-500 min-w-0"
                                />
                                {/* Min/Max */}
                                <input type="number" value={injectorMin} onChange={e => setInjectorMin(e.target.value)} placeholder="Mín" className="w-14 bg-gray-900 border border-gray-600 text-white text-[10px] text-center rounded-lg px-1 py-1.5 outline-none font-mono focus:border-indigo-500 transition-colors" />
                                <span className="text-gray-500 text-[10px] font-bold">–</span>
                                <input type="number" value={injectorMax} onChange={e => setInjectorMax(e.target.value)} placeholder="Máx" className="w-14 bg-gray-900 border border-gray-600 text-white text-[10px] text-center rounded-lg px-1 py-1.5 outline-none font-mono focus:border-indigo-500 transition-colors" />
                            </div>

                            {/* Dropdown de opciones filtradas */}
                            {injectorSearch.length > 0 && (
                                <div className="bg-gray-900 border border-gray-600 rounded-xl overflow-hidden max-h-32 overflow-y-auto custom-scrollbar shadow-xl">
                                    {injectorOptions.length === 0 ? (
                                        <p className="text-[10px] text-gray-500 text-center py-3">Sin resultados</p>
                                    ) : injectorOptions.map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => { handleQuickInject(opt.id, opt.name); setInjectorSearch(''); }}
                                            className="w-full text-left px-3 py-2 text-[11px] text-gray-200 hover:bg-emerald-700 hover:text-white transition-colors flex items-center justify-between group"
                                        >
                                            <span className="font-bold">{opt.name}</span>
                                            <span className="text-[9px] bg-emerald-600 group-hover:bg-emerald-500 text-white font-black px-2 py-0.5 rounded-full transition-colors">+ Añadir</span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Chips de insumos inyectados */}
                            {(activeIngredientIds.length > 0 || activeNutrientIds.length > 0) && (
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                    {activeIngredientIds.map(id => {
                                        const ing = ingredients.find(i => i.id === id);
                                        const con = selectedProducts[0]?.ingredientConstraints.find(c => c.ingredientId === id);
                                        return ing ? (
                                            <Chip
                                                key={id}
                                                label={ing.name}
                                                sublabel={con ? ` ${con.min}-${con.max}%` : ''}
                                                color="indigo"
                                                onRemove={() => handleRemoveChip(id, 'ing')}
                                            />
                                        ) : null;
                                    })}
                                    {activeNutrientIds.map(id => {
                                        const nut = nutrients.find(n => n.id === id);
                                        const con = selectedProducts[0]?.constraints.find(c => c.nutrientId === id);
                                        return nut ? (
                                            <Chip
                                                key={id}
                                                label={nut.name}
                                                sublabel={con ? ` ${con.min}-${con.max < 999 ? con.max : 'MAX'}` : ''}
                                                color="cyan"
                                                onRemove={() => handleRemoveChip(id, 'nut')}
                                            />
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                MATRIZ DE DATOS (ocupa todo el resto)
            ══════════════════════════════════════════════════════════════════════ */}
            <div className="flex-1 min-h-0 border border-gray-700 rounded-xl bg-gray-900/40 overflow-auto custom-scrollbar shadow-inner">
                {selectedProducts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                        <DatabaseIcon className="w-16 h-16 mb-4 text-gray-700" />
                        <p className="text-gray-500 font-black uppercase tracking-[0.3em]">Selecciona Dietas para comenzar</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead className="sticky top-0 z-40 bg-gray-950 shadow-lg">
                            <tr>
                                <th className="p-3 w-[200px] bg-gray-900 border-r border-gray-800">
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Parámetro</span>
                                </th>
                                {selectedProducts.map(p => (
                                    <th key={p.id} className="p-2 w-[160px] border-l border-gray-800/40 text-center bg-gray-900/50 group relative">
                                        <button onClick={() => { toggleDiet(p.id); onRemoveDietFromSelection?.(p.id); }} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400">
                                            <XCircleIcon className="w-3.5 h-3.5" />
                                        </button>
                                        <div className="text-[9px] text-gray-600 uppercase font-bold truncate">{p.category}</div>
                                        <div className="text-[11px] font-black text-white uppercase truncate leading-tight">{p.name}</div>
                                        <input
                                            type="number"
                                            value={batchSizes[p.id] || 1000}
                                            onChange={e => setBatchSizes({ ...batchSizes, [p.id]: Number(e.target.value) })}
                                            className="mt-1 w-full bg-gray-950 border border-gray-800 rounded px-1 py-0.5 text-[9px] text-center font-mono text-cyan-400 outline-none hover:border-cyan-500/40 transition-colors"
                                        />
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {/* Sección Insumos */}
                            {activeIngredientIds.length > 0 && (
                                <>
                                    <tr className="bg-indigo-500/5 border-y border-gray-800">
                                        <td colSpan={selectedProducts.length + 1} className="px-4 py-1.5">
                                            <div className="flex items-center gap-2">
                                                <CubeIcon className="w-3 h-3 text-indigo-400" />
                                                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em]">Insumos — Inclusión %</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {activeIngredientIds.map(ingId => {
                                        const ing = ingredients.find(i => i.id === ingId);
                                        return (
                                            <tr key={ingId} className="hover:bg-gray-800/30 transition-colors group border-b border-gray-800/20">
                                                <td className="px-3 py-1.5 border-r border-gray-800 bg-gray-950/30">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[10px] font-bold text-gray-500 group-hover:text-white uppercase truncate">{ing?.name}</span>
                                                        <button onClick={() => handleRemoveChip(ingId, 'ing')} className="opacity-0 group-hover:opacity-100 text-red-500/70 hover:text-red-400 transition-all shrink-0"><TrashIcon className="w-3 h-3" /></button>
                                                    </div>
                                                </td>
                                                {selectedProducts.map(p => {
                                                    const con = p.ingredientConstraints.find(c => c.ingredientId === ingId);
                                                    return (
                                                        <td key={p.id} className="p-1 border-l border-gray-800/10">
                                                            <div className="flex bg-gray-950 border border-gray-800 rounded overflow-hidden hover:border-indigo-500/40 transition-colors">
                                                                <input type="number" step="0.1" value={con?.min ?? ''} placeholder="0" onChange={e => handleConstraintChange(p.id, ingId, 'min', parseFloat(e.target.value), 'ing')} className="w-1/2 bg-transparent text-[10px] text-gray-600 p-1 text-center font-mono outline-none border-r border-gray-800" />
                                                                <input type="number" step="0.1" value={con && con.max < 100 ? con.max : ''} placeholder="100" onChange={e => handleConstraintChange(p.id, ingId, 'max', parseFloat(e.target.value), 'ing')} className="w-1/2 bg-transparent text-[10px] text-indigo-400 font-black p-1 text-center font-mono outline-none" />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </>
                            )}
                            {/* Sección Nutrientes */}
                            {activeNutrientIds.length > 0 && (
                                <>
                                    <tr className="bg-cyan-500/5 border-y border-gray-800">
                                        <td colSpan={selectedProducts.length + 1} className="px-4 py-1.5">
                                            <div className="flex items-center gap-2">
                                                <BeakerIcon className="w-3 h-3 text-cyan-400" />
                                                <span className="text-[9px] font-black text-cyan-400 uppercase tracking-[0.3em]">Nutrientes — Requerimientos</span>
                                            </div>
                                        </td>
                                    </tr>
                                    {activeNutrientIds.map(nutId => {
                                        const nut = nutrients.find(n => n.id === nutId);
                                        return (
                                            <tr key={nutId} className="hover:bg-gray-800/30 transition-colors group border-b border-gray-800/20">
                                                <td className="px-3 py-1.5 border-r border-gray-800 bg-gray-950/30">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-[10px] font-bold text-gray-500 group-hover:text-white uppercase truncate">{nut?.name} <span className="text-gray-700 font-normal text-[9px] normal-case">{nut?.unit}</span></span>
                                                        <button onClick={() => handleRemoveChip(nutId, 'nut')} className="opacity-0 group-hover:opacity-100 text-red-500/70 hover:text-red-400 transition-all shrink-0"><TrashIcon className="w-3 h-3" /></button>
                                                    </div>
                                                </td>
                                                {selectedProducts.map(p => {
                                                    const con = p.constraints.find(c => c.nutrientId === nutId);
                                                    return (
                                                        <td key={p.id} className="p-1 border-l border-gray-800/10">
                                                            <div className="flex bg-gray-950 border border-gray-800 rounded overflow-hidden hover:border-cyan-500/40 transition-colors">
                                                                <input type="number" step="0.01" value={con?.min ?? ''} placeholder="min" onChange={e => handleConstraintChange(p.id, nutId, 'min', parseFloat(e.target.value), 'nut')} className="w-1/2 bg-transparent text-[10px] text-gray-600 p-1 text-center font-mono outline-none border-r border-gray-800" />
                                                                <input type="number" step="0.01" value={con && con.max < 999 ? con.max : ''} placeholder="max" onChange={e => handleConstraintChange(p.id, nutId, 'max', parseFloat(e.target.value), 'nut')} className="w-1/2 bg-transparent text-[10px] text-white font-black p-1 text-center font-mono outline-none" />
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    })}
                                </>
                            )}
                            {/* Estado vacío de matriz */}
                            {activeIngredientIds.length === 0 && activeNutrientIds.length === 0 && (
                                <tr>
                                    <td colSpan={selectedProducts.length + 1} className="py-10 text-center">
                                        <p className="text-[11px] text-gray-700 font-bold uppercase tracking-widest">Usa el inyector para agregar parámetros</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* ── Footer compacto con masa total ── */}
            <div className="shrink-0 flex items-center justify-between pt-2 px-1">
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Masa consolidada:</span>
                    <span className="text-[13px] font-black font-mono text-cyan-500">{totalBatch.toLocaleString()} kg</span>
                    <span className="text-[9px] text-gray-700">·</span>
                    <span className="text-[9px] font-black text-gray-700 uppercase">{localSelectedIds.length} dietas activas</span>
                </div>
            </div>
        </div>
    );
};
