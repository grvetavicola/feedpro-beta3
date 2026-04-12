import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Ingredient, Nutrient, SavedFormula } from '../types';
import { solveFeedFormulation } from '../services/solver';
import { CubeIcon, BeakerIcon, CalculatorIcon, RefreshIcon, XCircleIcon, CheckIcon, TrashIcon } from './icons';

// ─── Interfaces & Types ───────────────────────────────────────────────────────
interface CellConstraint {
  min: number;
  max: number;
  dirty: boolean;
  injected: boolean;
}

type RowType = 'ing' | 'nut';

interface MatrixRow {
  id: string;
  type: RowType;
  name: string;
  unit?: string;
  price?: number;
}

interface DietResult {
  feasible: boolean;
  costPerKg: number;
  formula: Record<string, number>;
  nutrients: Record<string, number>;
  totalCost: number;
}

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
  onEnterFullscreen?: () => void;
  onLeaveFullscreen?: () => void;
}

// ─── Components ─────────────────────────────────────────────────────────────
const StatusDot = ({ ok }: { ok: boolean }) => (
  <span className={`inline-block w-3.5 h-3.5 rounded-full shrink-0 ${ok ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.7)]' : 'bg-red-500 animate-pulse outline outline-4 outline-red-500/20'}`} />
);

const CellInput = ({
  value, onChange, placeholder, isResult = false, dirty = false, injected = false, nutResult = false, nutOk = true
}: {
  value: number | string; onChange?: (v: number) => void;
  placeholder?: string; isResult?: boolean; dirty?: boolean; injected?: boolean;
  nutResult?: boolean; nutOk?: boolean;
}) => {
  const [local, setLocal] = useState(value === 0 || value === '' ? '' : String(value));
  useEffect(() => { setLocal(value === 0 || value === '' ? '—' : String(value)); }, [value]);

  if (isResult) {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return (
      <div className={`w-full text-center text-[17px] font-bold font-mono py-2 opacity-90 select-none ${
        num > 0.0001 ? 'text-emerald-400' : 'text-gray-800'
      }`}>
        {num > 0.0001 ? num.toFixed(2) : '—'}
      </div>
    );
  }

  if (nutResult) {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return (
      <div className={`w-full text-center text-[17px] font-bold font-mono py-2 select-none ${
        !nutOk ? 'text-red-400 bg-red-950/30' : num > 0 ? 'text-cyan-400' : 'text-gray-800'
      }`}>
        {num > 0 ? num.toFixed(2) : '—'}
      </div>
    );
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local === '—' ? '' : local}
      onFocus={e => e.target.select()}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const parsed = parseFloat(local.replace(',', '.'));
        if (!isNaN(parsed) && onChange) onChange(parsed);
        else if ((local === '' || local === '—') && onChange) onChange(0);
      }}
      onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
      placeholder={placeholder ?? '—'}
      style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%' }}
      className={`text-center text-[17px] font-bold font-mono py-2 px-1 transition-all ${
        dirty ? 'text-yellow-400 bg-yellow-500/10' :
        injected ? 'text-indigo-400' :
        'text-white placeholder-gray-800'
      } focus:text-white focus:bg-indigo-600/20`}
    />
  );
};

// ─── Main Logic Container ─────────────────────────────────────────────────────
export const GroupOptimizationScreen: React.FC<GroupOptimizationScreenProps> = ({
  products, ingredients, nutrients, isDynamicMatrix,
  selectedDietIds, onUpdateProduct, setIsDirty,
  savedFormulas, setSavedFormulas, onRemoveDietFromSelection,
  onEnterFullscreen, onLeaveFullscreen
}) => {

  // 1. HOOKS PRIMERO
  const [activeDietIds, setActiveDietIds] = useState<string[]>(selectedDietIds);
  const activeDiets = useMemo(() => products.filter(p => activeDietIds.includes(p.id)), [products, activeDietIds]);
  const [constraints, setConstraints] = useState<Record<string, Record<string, CellConstraint>>>({});
  const [activeRows, setActiveRows] = useState<MatrixRow[]>([]);
  const [results, setResults] = useState<Record<string, DietResult | null>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [injMode, setInjMode] = useState<'ing' | 'nut'>('ing');
  const [injSearch, setInjSearch] = useState('');
  const [injMin, setInjMin] = useState('');
  const [injMax, setInjMax] = useState('');
  const [batchSizes, setBatchSizes] = useState<Record<string, number>>({});
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSelection, setCatalogSelection] = useState<Set<string>>(new Set());
  const [showDietPanel, setShowDietPanel] = useState(false);

  // Sync effect
  useEffect(() => { setActiveDietIds(selectedDietIds); }, [selectedDietIds]);

  useEffect(() => {
    setBatchSizes(prev => {
      const next = { ...prev };
      activeDiets.forEach(d => { if (!next[d.id]) next[d.id] = 1000; });
      return next;
    });
  }, [activeDiets]);

  useEffect(() => {
    setConstraints(prev => {
      const next = { ...prev };
      activeDiets.forEach(diet => {
        diet.ingredientConstraints.forEach(ic => {
          if (!next[ic.ingredientId]) next[ic.ingredientId] = {};
          if (!next[ic.ingredientId][diet.id]) next[ic.ingredientId][diet.id] = { min: ic.min, max: ic.max, dirty: false, injected: false };
        });
        diet.constraints.forEach(nc => {
          if (!next[nc.nutrientId]) next[nc.nutrientId] = {};
          if (!next[nc.nutrientId][diet.id]) next[nc.nutrientId][diet.id] = { min: nc.min, max: nc.max, dirty: false, injected: false };
        });
      });
      return next;
    });
  }, [activeDiets]);

  useEffect(() => {
    const ingIds = new Set<string>();
    const nutIds = new Set<string>();
    activeDiets.forEach(d => {
      d.ingredientConstraints.forEach(ic => ingIds.add(ic.ingredientId));
      d.constraints.forEach(nc => nutIds.add(nc.nutrientId));
    });
    const rows: MatrixRow[] = [
      ...ingredients.filter(i => ingIds.has(i.id)).map(i => ({
        id: i.id, type: 'ing' as RowType, name: i.name.toUpperCase(),
        price: (i.price / (1 - (i.shrinkage || 0) / 100)) + (i.processingCost || 0)
      })),
      ...nutrients.filter(n => nutIds.has(n.id)).map(n => ({
        id: n.id, type: 'nut' as RowType, name: n.name.toUpperCase(), unit: n.unit
      }))
    ];
    setActiveRows(rows);
  }, [activeDiets, ingredients, nutrients]);

  const totalLoadedKg = useMemo(() => activeDiets.reduce((acc, d) => acc + (batchSizes[d.id] || 1000), 0), [activeDiets, batchSizes]);

  const dietsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach(p => {
      const cat = p.category || 'GENERAL';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [products]);

  // 2. CALLBACKS
  const handleRunAll = useCallback(() => {
    if (activeDiets.length === 0) return;
    setIsRunning(true);
    const newResults: Record<string, DietResult> = {};

    activeDiets.forEach(diet => {
      const matrixProduct: Product = {
        ...diet,
        ingredientConstraints: activeRows.filter(r => r.type === 'ing' && constraints[r.id]?.[diet.id]).map(r => ({ ingredientId: r.id, min: constraints[r.id][diet.id].min, max: constraints[r.id][diet.id].max })),
        constraints: activeRows.filter(r => r.type === 'nut' && constraints[r.id]?.[diet.id]).map(r => ({ nutrientId: r.id, min: constraints[r.id][diet.id].min, max: constraints[r.id][diet.id].max }))
      };
      const result = solveFeedFormulation(matrixProduct, ingredients, nutrients, batchSizes[diet.id] || 1000, isDynamicMatrix);
      const formulaMap: Record<string, number> = {};
      result.items.forEach(item => { formulaMap[item.ingredientId] = item.percentage; });
      const nutMap: Record<string, number> = {};
      result.nutrientAnalysis.forEach(na => { nutMap[na.nutrientId] = na.value; });

      newResults[diet.id] = { feasible: result.status === 'OPTIMAL', costPerKg: result.totalCost / (batchSizes[diet.id] || 1000), formula: formulaMap, nutrients: nutMap, totalCost: result.totalCost };
    });

    setResults(newResults);
    setIsRunning(false);
    setHasRun(true);
    setIsDirty?.(true);
    setConstraints(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(r => Object.keys(next[r]).forEach(d => next[r][d].dirty = false));
      return next;
    });
  }, [activeDiets, activeRows, constraints, batchSizes, ingredients, nutrients, isDynamicMatrix, setIsDirty]);

  const handleSaveBulk = () => {
    const successfulDiets = activeDiets.filter(diet => results[diet.id]?.feasible);
    if (successfulDiets.length === 0) return alert("Haga F4 primero en dietas viables.");
    const saved: SavedFormula[] = successfulDiets.map(diet => {
      const matrixProduct: Product = {
        ...diet,
        ingredientConstraints: activeRows.filter(r => r.type === 'ing' && constraints[r.id]?.[diet.id]).map(r => ({ ingredientId: r.id, min: constraints[r.id][diet.id].min, max: constraints[r.id][diet.id].max })),
        constraints: activeRows.filter(r => r.type === 'nut' && constraints[r.id]?.[diet.id]).map(r => ({ nutrientId: r.id, min: constraints[r.id][diet.id].min, max: constraints[r.id][diet.id].max }))
      };
      const result = solveFeedFormulation(matrixProduct, ingredients, nutrients, batchSizes[diet.id] || 1000, isDynamicMatrix);
      return { id: Math.random().toString(36).substr(2, 9), clientId: diet.clientId, name: diet.name.toUpperCase(), date: new Date().toISOString(), result };
    });
    setSavedFormulas?.((prev: any) => [...(prev || []), ...saved]);
    alert("✅ Guardado masivo completado.");
    onLeaveFullscreen?.();
  };

  const updateConstraint = (rowId: string, dietId: string, field: 'min' | 'max', val: number) => {
    setConstraints(prev => ({
      ...prev, [rowId]: { ...(prev[rowId] || {}), [dietId]: {
        min: prev[rowId]?.[dietId]?.min ?? 0,
        max: prev[rowId]?.[dietId]?.max ?? (activeRows.find(r => r.id === rowId)?.type === 'ing' ? 100 : 999),
        injected: prev[rowId]?.[dietId]?.injected ?? false,
        [field]: val, dirty: true
      }}
    }));
    setHasRun(false);
  };

  const handleAddRow = (id: string, customMin?: number, customMax?: number) => {
    const min = customMin ?? (injMin === '' ? 0 : parseFloat(injMin));
    const max = customMax ?? (injMax === '' ? (injMode === 'ing' ? 100 : 999) : parseFloat(injMax));
    if (!activeRows.find(r => r.id === id)) {
      const ing = ingredients.find(i => i.id === id);
      const nut = nutrients.find(n => n.id === id);
      if (ing) setActiveRows(p => [...p, { id, type: 'ing', name: ing.name.toUpperCase(), price: (ing.price / (1 - (ing.shrinkage || 0) / 100)) + (ing.processingCost || 0) }]);
      else if (nut) setActiveRows(p => [...p, { id, type: 'nut', name: nut.name.toUpperCase(), unit: nut.unit }]);
    }
    setConstraints(prev => {
      const next = { ...prev };
      activeDiets.forEach(d => { if (!next[id]) next[id] = {}; next[id][d.id] = { min, max, dirty: false, injected: true }; });
      return next;
    });
    setHasRun(false);
  };

  const handleBulkAdd = () => {
    catalogSelection.forEach(id => handleAddRow(id));
    setCatalogSelection(new Set());
    setShowCatalog(false);
  };

  const handleRemoveRow = (id: string) => {
    setActiveRows(p => p.filter(r => r.id !== id));
    setConstraints(p => { const n = { ...p }; delete n[id]; return n; });
  };

  const filteredInj = useMemo(() => {
    const t = injSearch.toLowerCase();
    if (t.length < 2) return [];
    return (injMode === 'ing' ? ingredients : nutrients).filter(x => x.name.toLowerCase().includes(t)).slice(0, 10);
  }, [injSearch, injMode, ingredients, nutrients]);

  // 3. LISTENERS
  useEffect(() => {
    const L = (e: KeyboardEvent) => { if (e.key === 'F4') { e.preventDefault(); handleRunAll(); } };
    window.addEventListener('keydown', L);
    onEnterFullscreen?.();
    return () => { window.removeEventListener('keydown', L); onLeaveFullscreen?.(); };
  }, [handleRunAll, onEnterFullscreen, onLeaveFullscreen]);

  // ── 4. RENDER ────────────────────────────────────────────────────────────
  const rowIng = activeRows.filter(r => r.type === 'ing');
  const rowNut = activeRows.filter(r => r.type === 'nut');

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-black text-white font-sans">
      
      {/* 🔹 CATALOG OVERLAY */}
      {showCatalog && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-3xl z-[100] flex items-center justify-center p-6">
          <div className="bg-gray-900 border-2 border-gray-800 rounded-[2.5rem] w-full max-w-5xl h-[85vh] flex flex-col shadow-[0_0_100px_rgba(30,58,138,0.5)] overflow-hidden">
            <div className="p-8 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black text-indigo-400 uppercase tracking-tighter italic">Explorador de Catálogo</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-2">Inyección masiva de vectores a la matriz FeedPro 360</p>
              </div>
              <button onClick={() => setShowCatalog(false)} className="p-3 hover:bg-red-950/20 text-gray-600 hover:text-red-500 transition-all"><XCircleIcon className="w-10 h-10" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 gap-12 custom-scrollbar">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-indigo-400 font-black text-[11px] uppercase border-b border-indigo-900/50 pb-3 mb-4"><CubeIcon className="w-5 h-5" /> Insumos Globales</div>
                {ingredients.map(i => (
                  <label key={i.id} className="flex items-center gap-4 p-4 bg-gray-950/50 rounded-2xl hover:bg-indigo-600/10 cursor-pointer border border-transparent hover:border-indigo-600/30 transition-all">
                    <input type="checkbox" checked={catalogSelection.has(i.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(i.id)) s.delete(i.id); else s.add(i.id); setCatalogSelection(s); }} className="w-6 h-6 rounded border-gray-700 bg-black text-indigo-600" />
                    <span className="text-sm font-bold uppercase text-gray-200">{i.name}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-cyan-400 font-black text-[11px] uppercase border-b border-cyan-900/50 pb-3 mb-4"><BeakerIcon className="w-5 h-5" /> Perfil Nutricional</div>
                {nutrients.map(n => (
                  <label key={n.id} className="flex items-center gap-4 p-4 bg-gray-950/50 rounded-2xl hover:bg-cyan-600/10 cursor-pointer border border-transparent hover:border-cyan-600/30 transition-all">
                    <input type="checkbox" checked={catalogSelection.has(n.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(n.id)) s.delete(n.id); else s.add(n.id); setCatalogSelection(s); }} className="w-6 h-6 rounded border-gray-700 bg-black text-cyan-600" />
                    <span className="text-sm font-bold uppercase text-gray-200">{n.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-8 border-t border-gray-800 flex items-center justify-between bg-black/40">
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest">{catalogSelection.size} Elementos seleccionables</span>
              <button onClick={handleBulkAdd} disabled={catalogSelection.size === 0} className="px-16 py-5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-20 text-white font-black uppercase text-base rounded-2xl transition-all shadow-[0_10px_40px_rgba(16,185,129,0.3)]">Añadir Seleccionados</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 HEADER MULTI-FILA */}
      <div className="flex-none bg-gray-900 border-b-2 border-gray-800 z-50">
        {/* ROW 1: NAVIGATION & STATUS */}
        <div className="h-20 px-8 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-4">
            <button onClick={() => onLeaveFullscreen?.()} className="flex items-center gap-3 px-6 h-12 bg-red-700 hover:bg-red-600 text-white font-black uppercase text-xs rounded-xl transition-all shadow-lg active:scale-95">
              <RefreshIcon className="w-5 h-5 rotate-180" /> Volver
            </button>
            <button onClick={handleSaveBulk} className="flex items-center gap-3 px-6 h-12 bg-gray-800 hover:bg-indigo-900 text-gray-300 hover:text-white font-black uppercase text-xs rounded-xl border border-gray-700 transition-all">
              <CheckIcon className="w-5 h-5" /> Guardar Dietas
            </button>
          </div>

          <div className="flex items-center gap-6 px-10 py-3 bg-black/40 rounded-[2rem] border border-gray-800">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Dietas Activas</span>
              <span className="text-2xl font-black text-indigo-400 font-mono leading-none">{activeDiets.length}</span>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Carga Total Kg</span>
              <span className="text-2xl font-black text-cyan-400 font-mono leading-none">{totalLoadedKg.toLocaleString()}</span>
            </div>
            <div className="w-px h-8 bg-gray-800" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Modo</span>
              <span className="text-xs font-black text-white uppercase italic leading-none">{isDynamicMatrix ? 'Delta-Override' : 'General'}</span>
            </div>
          </div>

          <button onClick={handleRunAll} disabled={isRunning || activeDiets.length === 0}
            className="flex items-center gap-4 px-12 h-14 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-black uppercase text-lg italic tracking-tighter rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all">
            {isRunning ? <RefreshIcon className="w-7 h-7 animate-spin" /> : <CalculatorIcon className="w-7 h-7" />} OPTIMIZAR (F4)
          </button>
        </div>

        {/* ROW 2: DATA CONTROLS */}
        <div className="h-16 px-8 flex items-center gap-6 bg-gray-950/50">
          <button onClick={() => setShowCatalog(true)} className="flex items-center gap-3 px-6 h-11 bg-indigo-950/30 hover:bg-indigo-600 text-indigo-400 hover:text-white font-black uppercase text-[11px] rounded-xl border border-indigo-900/40 transition-all shrink-0">
            <span className="text-xl">🛒</span> Explorar Catálogo
          </button>
          
          <div className="w-px h-6 bg-gray-800" />

          <div className="flex h-11 rounded-xl overflow-hidden border border-gray-800 shrink-0">
            <button onClick={() => {setInjMode('ing'); setInjSearch('');}} className={`px-5 font-black text-[10px] uppercase transition-all ${injMode === 'ing' ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-600 hover:text-gray-400'}`}>Insumos</button>
            <button onClick={() => {setInjMode('nut'); setInjSearch('');}} className={`px-5 font-black text-[10px] uppercase transition-all ${injMode === 'nut' ? 'bg-cyan-600 text-white' : 'bg-gray-900 text-gray-600 hover:text-gray-400'}`}>Nutrientes</button>
          </div>

          <div className="relative flex-1">
            <input type="text" value={injSearch} onChange={e => setInjSearch(e.target.value)} placeholder="ESCRIBE 2 LETRAS PARA BUSCAR..."
              className="w-full h-11 bg-gray-900 border border-gray-800 rounded-xl px-5 text-sm font-bold uppercase tracking-wider text-white outline-none focus:border-indigo-500 transition-all" />
            {filteredInj.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border-2 border-gray-700 rounded-2xl shadow-2xl z-[100] max-h-[300px] overflow-y-auto">
                {filteredInj.map(o => (
                  <button key={o.id} onClick={() => { handleAddRow(o.id); setInjSearch(''); }} className="w-full text-left px-5 py-4 text-xs font-black uppercase text-gray-300 hover:bg-indigo-600 hover:text-white border-b border-gray-800 flex items-center justify-between">
                    <span>{o.name}</span> <span className="text-[10px] bg-emerald-600/20 text-emerald-500 px-3 py-1 rounded-lg">+ Añadir</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input type="number" value={injMin} onChange={e => setInjMin(e.target.value)} placeholder="0" className="w-16 h-11 bg-gray-900 border border-gray-800 rounded-xl text-center font-black font-mono text-emerald-400 outline-none focus:border-emerald-500" />
            <input type="number" value={injMax} onChange={e => setInjMax(e.target.value)} placeholder="100" className="w-16 h-11 bg-gray-900 border border-gray-800 rounded-xl text-center font-black font-mono text-emerald-400 outline-none focus:border-emerald-500" />
            <button onClick={() => injSearch && handleAddRow(injSearch)} className="px-6 h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs rounded-xl shadow-lg transition-all active:scale-95">+ Add</button>
          </div>
        </div>
      </div>

      {/* 📊 MATRIZ CANVAS */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Diet Side-panel */}
        <button onClick={() => setShowDietPanel(!showDietPanel)} className="absolute left-0 top-1/2 -translate-y-1/2 z-[45] bg-gray-900 border border-l-0 border-gray-800 p-2 rounded-r-2xl text-gray-600 hover:text-white transition-all">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={showDietPanel ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} /></svg>
        </button>

        {showDietPanel && (
          <aside className="w-80 shrink-0 border-r border-gray-800 bg-gray-950 overflow-y-auto custom-scrollbar p-6">
            <div className="flex items-center justify-between mb-8">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Selector Maestra</span>
              <button onClick={() => setShowDietPanel(false)} className="text-gray-700 hover:text-white"><XCircleIcon className="w-6 h-6" /></button>
            </div>
            <div className="space-y-6">
              {Object.entries(dietsByCategory).map(([cat, list]) => (
                <div key={cat} className="space-y-2">
                  <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest pl-2 mb-3 grayscale opacity-50">{cat}</div>
                  {list.map(d => (
                    <button key={d.id} onClick={() => setActiveDietIds(prev => prev.includes(d.id) ? prev.filter(id => id !== d.id) : [...prev, d.id])}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl text-xs font-bold transition-all border-2 ${activeDietIds.includes(d.id) ? 'bg-indigo-600/10 border-indigo-600/40 text-indigo-100 shadow-[0_0_20px_rgba(79,70,229,0.1)]' : 'bg-transparent border-transparent text-gray-600 hover:text-gray-300'}`}>
                      {d.name.toUpperCase()}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </aside>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar bg-black p-8">
          {activeDiets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-25 grayscale">
              <CalculatorIcon className="w-36 h-36 text-gray-800 mb-6" />
              <p className="text-2xl font-black uppercase tracking-[0.5em] text-gray-700">Seleccione dietas del panel lateral</p>
            </div>
          ) : (
            <table className="border-separate border-spacing-0 min-w-max">
              <thead>
                <tr className="sticky top-0 z-30">
                  <th className="sticky left-0 z-40 bg-black border-2 border-gray-800 p-6 text-left w-[280px] min-w-[280px]">
                    <span className="text-[12px] font-black text-gray-600 uppercase tracking-widest italic">Vectores de Matriz</span>
                  </th>
                  {activeDiets.map(d => {
                    const r = results[d.id];
                    return (
                      <th key={d.id} className="border-2 border-l-0 border-gray-800 p-4 bg-gray-900 w-[180px] min-w-[180px] transition-all">
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex items-center gap-2 w-full justify-center px-2">
                            {r && <StatusDot ok={r.feasible} />}
                            <span className="text-[13px] font-black text-white uppercase italic truncate tracking-tight">{d.name}</span>
                            <button onClick={() => setActiveDietIds(p => p.filter(id => id !== d.id))} className="text-gray-700 hover:text-red-500 transition-colors"><XCircleIcon className="w-5 h-5" /></button>
                          </div>
                          <div className="flex items-center gap-2 bg-black/60 px-4 py-1.5 rounded-xl border border-gray-800">
                            <span className="text-[8px] font-black text-gray-600 uppercase">Kg:</span>
                            <input type="number" value={batchSizes[d.id]||1000} onChange={e => setBatchSizes(p => ({...p, [d.id]: Number(e.target.value)}))} className="w-16 bg-transparent text-xs font-black font-mono text-cyan-400 text-center outline-none" />
                          </div>
                          <div className="grid grid-cols-3 w-full border-t border-gray-800 mt-2 bg-black/40 divide-x divide-gray-800">
                             <div className="py-3 text-[9px] font-black text-gray-600 uppercase italic text-center">Mín</div>
                             <div className="py-3 text-[9px] font-black text-gray-600 uppercase italic text-center">Máx</div>
                             <div className={`py-3 text-[9px] font-black uppercase text-center ${r?.feasible ? 'text-emerald-500' : 'text-gray-700'}`}>%</div>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900 border-x-2 border-gray-800">
                {/* INSUMOS */}
                <tr className="bg-indigo-950/20">
                  <td colSpan={activeDiets.length + 1} className="sticky left-0 z-20 px-8 py-4 border-y border-gray-800 font-black text-indigo-400 text-[11px] uppercase tracking-widest italic bg-gray-950/95">
                    Insumos — Rango de Inclusión Global
                  </td>
                </tr>
                {rowIng.map(row => (
                  <tr key={row.id} className="hover:bg-gray-900/50 group">
                    <td className="sticky left-0 z-10 bg-black border border-gray-900 px-6 py-4">
                       <div className="flex items-center justify-between gap-4">
                          <div className="truncate">
                             <span className="text-[15px] font-black text-gray-100 uppercase tracking-tighter block leading-none">{row.name}</span>
                             {row.price !== undefined && <span className="text-[10px] text-gray-600 font-mono font-bold italic mt-2 block">$ {row.price.toFixed(2)}/kg</span>}
                          </div>
                          <button onClick={() => handleRemoveRow(row.id)} className="p-2 text-gray-800 hover:text-red-500 hover:bg-red-950/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-5 h-5" /></button>
                       </div>
                    </td>
                    {activeDiets.map(d => {
                      const c = constraints[row.id]?.[d.id];
                      const f = results[d.id]?.formula[row.id] ?? 0;
                      return (
                        <td key={d.id} className="border border-gray-900 p-0">
                           <div className="grid grid-cols-3 divide-x divide-gray-950 h-full">
                              <CellInput value={c?.min ?? ''} onChange={v => updateConstraint(row.id, d.id, 'min', v)} dirty={c?.dirty} injected={c?.injected} />
                              <CellInput value={c && c.max < 100 ? c.max : ''} onChange={v => updateConstraint(row.id, d.id, 'max', v)} dirty={c?.dirty} injected={c?.injected} />
                              <CellInput value={f} isResult />
                           </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* NUTRIENTES */}
                <tr className="bg-cyan-950/20">
                  <td colSpan={activeDiets.length + 1} className="sticky left-0 z-20 px-8 py-4 border-y border-gray-800 font-black text-cyan-400 text-[11px] uppercase tracking-widest italic bg-gray-950/95">
                    Requerimientos — Perfil Técnico Nutricional
                  </td>
                </tr>
                {rowNut.map(row => (
                  <tr key={row.id} className="hover:bg-gray-900/50 group">
                    <td className="sticky left-0 z-10 bg-black border border-gray-900 px-6 py-4">
                       <div className="flex items-center justify-between gap-4">
                          <div className="truncate">
                             <span className="text-[15px] font-black text-gray-100 uppercase tracking-tighter block leading-none">{row.name}</span>
                             {row.unit && <span className="text-[10px] text-gray-600 font-mono font-bold italic mt-2 block uppercase">{row.unit}</span>}
                          </div>
                          <button onClick={() => handleRemoveRow(row.id)} className="p-2 text-gray-800 hover:text-red-500 hover:bg-red-950/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-5 h-5" /></button>
                       </div>
                    </td>
                    {activeDiets.map(d => {
                      const c = constraints[row.id]?.[d.id];
                      const n = results[d.id]?.nutrients[row.id] ?? 0;
                      const ok = c ? n >= (c.min - 0.001) && (n <= (c.max + 0.001) || c.max >= 999) : true;
                      return (
                        <td key={d.id} className="border border-gray-900 p-0">
                           <div className="grid grid-cols-3 divide-x divide-gray-950 h-full">
                              <CellInput value={c?.min ?? ''} onChange={v => updateConstraint(row.id, d.id, 'min', v)} dirty={c?.dirty} injected={c?.injected} />
                              <CellInput value={c && c.max < 999 ? c.max : ''} onChange={v => updateConstraint(row.id, d.id, 'max', v)} dirty={c?.dirty} injected={c?.injected} />
                              <CellInput value={n} nutResult nutOk={ok || !hasRun} />
                           </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* RESULTADOS FINALES */}
                {hasRun && (
                  <tr className="bg-emerald-950/30 backdrop-blur-xl">
                    <td className="sticky left-0 z-20 bg-emerald-950/80 border-y border-emerald-900 px-8 py-8">
                       <span className="text-[13px] font-black text-emerald-400 uppercase tracking-[.4em] italic mb-1 block">Costo Formulado</span>
                       <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest leading-none block">Optimized Final Yield</span>
                    </td>
                    {activeDiets.map(d => {
                      const r = results[d.id];
                      return (
                        <td key={d.id} className="border-y border-emerald-900 p-4 text-center">
                          {r?.feasible ? (
                            <div className="flex flex-col items-center">
                               <div className="text-[34px] font-black font-mono text-white leading-none tracking-tighter italic">
                                 <span className="text-emerald-500 text-lg mr-1">$</span>{r.costPerKg.toFixed(2)}
                               </div>
                               <div className="mt-3 px-3 py-1 bg-emerald-600 text-white text-[9px] font-black rounded-lg uppercase shadow-lg shadow-emerald-500/20">Optimal Result</div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center py-4 bg-red-950/20 rounded-3xl mx-2 shadow-inner">
                               <RefreshIcon className="w-8 h-8 text-red-500 animate-spin-slow mb-3" />
                               <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Infeasible Sol.</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
