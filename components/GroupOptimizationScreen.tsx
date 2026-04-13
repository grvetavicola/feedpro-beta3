import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Ingredient, Nutrient, SavedFormula } from '../types';
import { solveFeedFormulation } from '../services/solver';
import { CubeIcon, BeakerIcon, CalculatorIcon, RefreshIcon, XCircleIcon, CheckIcon, TrashIcon, SearchIcon } from './icons';

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

// ─── Staff-Grade Components ───────────────────────────────────────────────────

const StatusDot = ({ ok }: { ok: boolean }) => (
  <span className={`inline-block w-4 h-4 rounded-full shrink-0 shadow-lg ${ok ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50 animate-pulse'}`} />
);

const CellInput = ({
  value, onChange, min, max, isResult = false, dirty = false, feasible = true, nutResult = false
}: {
  value: number | string; onChange?: (v: number) => void;
  min?: number; max?: number; isResult?: boolean; dirty?: boolean; 
  feasible?: boolean; nutResult?: boolean;
}) => {
  const [local, setLocal] = useState(value === 0 || value === '' ? '' : String(value));
  useEffect(() => { setLocal(value === 0 || value === '' ? '—' : String(value)); }, [value]);

  const numValue = typeof value === 'number' ? value : parseFloat(String(value));
  const isOutOfRange = (min !== undefined && numValue < (min - 0.001)) || (max !== undefined && numValue > (max + 0.001));
  const isInvalidRange = min !== undefined && max !== undefined && min > max;

  if (isResult || nutResult) {
    return (
      <div className={`w-full h-full flex items-center justify-center text-[17px] font-bold font-mono py-1 px-1 transition-all select-none ${
        !feasible ? 'text-red-500' :
        isOutOfRange ? 'bg-red-600/30 text-red-100' :
        numValue > 0 ? (nutResult ? 'text-cyan-400' : 'text-emerald-400') : 'text-gray-800'
      }`}>
        {numValue > 0.0001 ? numValue.toFixed(2) : '—'}
      </div>
    );
  }

  return (
    <div className={`w-full h-full relative border-none flex items-center justify-center transition-all ${isInvalidRange ? 'bg-red-900/40' : ''}`}>
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
          className={`w-full h-full text-center text-[17px] font-bold font-mono transition-all outline-none bg-transparent ${
            isInvalidRange ? 'text-red-500' :
            dirty ? 'text-yellow-400 bg-yellow-500/5' :
            'text-white placeholder-gray-800'
          } focus:bg-indigo-600/20`}
        />
    </div>
  );
};

// ─── Group Optimization Engine ────────────────────────────────────────────────

export const GroupOptimizationScreen: React.FC<GroupOptimizationScreenProps> = ({
  products, ingredients, nutrients, isDynamicMatrix: initialIsDynamic,
  selectedDietIds, onUpdateProduct, setIsDirty,
  savedFormulas, setSavedFormulas, onRemoveDietFromSelection,
  onEnterFullscreen, onLeaveFullscreen
}) => {

  // 1. HOOKS PRIMERO (Staff standard)
  const [activeDietIds, setActiveDietIds] = useState<string[]>(selectedDietIds);
  const [isDynamic, setIsDynamic] = useState(initialIsDynamic);
  const [constraints, setConstraints] = useState<Record<string, Record<string, CellConstraint>>>({});
  const [activeRows, setActiveRows] = useState<MatrixRow[]>([]);
  const [results, setResults] = useState<Record<string, DietResult | null>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSelection, setCatalogSelection] = useState<Set<string>>(new Set());
  const [catalogSearch, setCatalogSearch] = useState('');
  const [batchSizes, setBatchSizes] = useState<Record<string, number>>({});
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // Memoized Data
  const activeDiets = useMemo(() => products.filter(p => activeDietIds.includes(p.id)), [products, activeDietIds]);
  const dietsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach(p => {
      const cat = p.category || 'GENERAL';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [products]);

  const totalLoadedKg = useMemo(() => activeDiets.reduce((acc, d) => acc + (batchSizes[d.id] || 1000), 0), [activeDiets, batchSizes]);

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

  // 2. CALLBACKS (CORE ENGINE)
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
      
      const res = solveFeedFormulation(matrixProduct, ingredients, nutrients, batchSizes[diet.id] || 1000, isDynamic);
      
      const formulaMap: Record<string, number> = {};
      res.items.forEach(item => { formulaMap[item.ingredientId] = item.percentage; });
      const nutMap: Record<string, number> = {};
      res.nutrientAnalysis.forEach(na => { nutMap[na.nutrientId] = na.value; });

      newResults[diet.id] = {
        feasible: res.status === 'OPTIMAL',
        costPerKg: res.totalCost / (batchSizes[diet.id] || 1000),
        formula: formulaMap,
        nutrients: nutMap,
        totalCost: res.totalCost
      };
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
  }, [activeDiets, activeRows, constraints, batchSizes, ingredients, nutrients, isDynamic, setIsDirty]);

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

  const handleAddRow = (id: string) => {
    if (!activeRows.find(r => r.id === id)) {
      const ing = ingredients.find(i => i.id === id);
      const nut = nutrients.find(n => n.id === id);
      if (ing) setActiveRows(p => [...p, { id, type: 'ing', name: ing.name.toUpperCase(), price: (ing.price / (1 - (ing.shrinkage || 0) / 100)) + (ing.processingCost || 0) }]);
      else if (nut) setActiveRows(p => [...p, { id, type: 'nut', name: nut.name.toUpperCase(), unit: nut.unit }]);
    }
    setConstraints(prev => {
      const next = { ...prev };
      activeDiets.forEach(d => { if (!next[id]) next[id] = {}; next[id][d.id] = { min: 0, max: initialIsDynamic ? 999 : 100, dirty: false, injected: true }; });
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
    <div className="flex flex-col h-screen w-full overflow-hidden bg-black text-white font-sans antialiased">
      
      {/* 🔹 SELECTOR GLOBAL MODAL */}
      {showCatalog && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-8">
          <div className="bg-gray-900 border border-gray-800 rounded-[3rem] w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-10 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-4xl font-black text-indigo-400 uppercase tracking-tighter italic leading-none">Selector Global de Matriz</h2>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-3">Gestión Maestro de Vectores e Inyecciones masivas</p>
              </div>
              <button onClick={() => setShowCatalog(false)} className="p-4 hover:bg-gray-800 rounded-full transition-all text-gray-400 hover:text-white"><XCircleIcon className="w-12 h-12" /></button>
            </div>
            
            <div className="flex-none p-6 bg-gray-950/50 border-b border-gray-800">
               <div className="relative max-w-xl mx-auto">
                  <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                  <input type="text" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} placeholder="BUSCAR INSUMO O NUTRIENTE..."
                    className="w-full h-12 bg-gray-900 border border-gray-800 rounded-2xl pl-12 pr-6 text-sm font-bold uppercase outline-none focus:border-indigo-600 transition-all" />
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-10 grid grid-cols-2 gap-16 custom-scrollbar">
              <div className="space-y-4">
                <div className="text-indigo-400 font-extrabold text-xs uppercase border-b border-indigo-900 pb-3 mb-6 tracking-widest flex items-center gap-2"><CubeIcon className="w-5 h-5"/> Catálogo de Insumos</div>
                {ingredients.filter(i => i.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(i => (
                  <label key={i.id} className="flex items-center gap-4 p-5 bg-gray-950/40 rounded-3xl hover:bg-indigo-600/10 cursor-pointer border border-transparent hover:border-indigo-500/30 transition-all select-none">
                    <input type="checkbox" checked={catalogSelection.has(i.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(i.id)) s.delete(i.id); else s.add(i.id); setCatalogSelection(s); }} className="w-6 h-6 rounded border-gray-800 bg-black text-indigo-600 focus:ring-indigo-600/50" />
                    <span className="text-sm font-black uppercase text-gray-200">{i.name}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-4">
                <div className="text-cyan-400 font-extrabold text-xs uppercase border-b border-cyan-900 pb-3 mb-6 tracking-widest flex items-center gap-2"><BeakerIcon className="w-5 h-5"/> Parámetros de Calidad</div>
                {nutrients.filter(n => n.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(n => (
                  <label key={n.id} className="flex items-center gap-4 p-5 bg-gray-950/40 rounded-3xl hover:bg-cyan-600/10 cursor-pointer border border-transparent hover:border-cyan-500/30 transition-all select-none">
                    <input type="checkbox" checked={catalogSelection.has(n.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(n.id)) s.delete(n.id); else s.add(n.id); setCatalogSelection(s); }} className="w-6 h-6 rounded border-gray-800 bg-black text-cyan-600 focus:ring-cyan-600/50" />
                    <span className="text-sm font-black uppercase text-gray-200">{n.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-10 border-t border-gray-800 bg-black/40 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-500 uppercase italic">{catalogSelection.size} elementos para inyectar</span>
              <button onClick={handleBulkAdd} disabled={catalogSelection.size === 0} className="px-20 py-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-black uppercase text-lg rounded-3xl shadow-xl transition-all">Añadir a la Matriz</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 HEADER MULTI-CAPA FIX-Z (Staff UX) */}
      <nav className="flex-none bg-gray-900 border-b-2 border-gray-800 z-50">
        <div className="h-20 px-8 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-4">
            <button onClick={() => onLeaveFullscreen?.()} className="flex items-center gap-3 px-8 h-12 bg-red-700 hover:bg-red-600 text-white font-black uppercase text-[11px] rounded-2xl shadow-lg transition-all active:scale-95">
              <RefreshIcon className="w-5 h-5 rotate-180" /> Volver
            </button>
            <button onClick={handleSaveBulk} className="flex items-center gap-3 px-8 h-12 bg-indigo-950/40 hover:bg-indigo-600 text-indigo-400 hover:text-white font-black uppercase text-[11px] rounded-2xl border border-indigo-900/40 transition-all">
              <CheckIcon className="w-5 h-5" /> Guardar Dietas
            </button>
          </div>

          <div className="flex items-center gap-10 px-12 py-3 bg-black/60 rounded-full border border-gray-800">
             <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Dietas Activas</span>
                <span className="text-2xl font-black text-indigo-400 font-mono leading-none">{activeDiets.length}</span>
             </div>
             <div className="w-px h-8 bg-gray-800" />
             <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Carga Total Kg</span>
                <span className="text-2xl font-black text-cyan-400 font-mono leading-none">{totalLoadedKg.toLocaleString()}</span>
             </div>
          </div>

          <button onClick={handleRunAll} disabled={isRunning || activeDiets.length === 0}
            className="flex items-center gap-4 px-16 h-14 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-black uppercase text-xl italic tracking-tighter rounded-2xl shadow-2xl transition-all active:scale-95">
            {isRunning ? <RefreshIcon className="w-8 h-8 animate-spin" /> : <CalculatorIcon className="w-8 h-8" />} OPTIMIZAR (F4)
          </button>
        </div>

        <div className="h-16 px-8 flex items-center justify-between bg-gray-950/50">
           <div className="flex items-center gap-6">
              <button onClick={() => setShowCatalog(true)} className="flex items-center gap-3 px-8 h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[11px] rounded-2xl shadow-xl transition-all">
                <span className="text-xl">🛒</span> Selector Global
              </button>
              <div className="flex h-11 rounded-2xl overflow-hidden border border-gray-800 bg-gray-900">
                <button onClick={() => setIsDynamic(false)} className={`px-6 font-black text-[10px] uppercase transition-all ${!isDynamic ? 'bg-gray-700 text-white' : 'text-gray-600 hover:text-gray-300'}`}>Matriz Estándar</button>
                <button onClick={() => setIsDynamic(true)} className={`px-6 font-black text-[10px] uppercase transition-all ${isDynamic ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:text-gray-300'}`}>Dinámica</button>
              </div>
           </div>
           
           <button className="flex items-center gap-3 px-8 h-11 bg-yellow-600 hover:bg-yellow-500 text-black font-black uppercase text-[11px] rounded-2xl shadow-xl transition-all">
             <RefreshIcon className="w-5 h-5 bg-black/10 rounded" /> Agregar Relaciones
           </button>
        </div>
      </nav>

      {/* 📊 MATRIZ CANVAS CON SIDEBAR Staff-Grade */}
      <main className="flex-1 flex overflow-hidden w-full relative">
        
        {/* SIDEBAR ACORDEÓN (w-64) */}
        <aside className="w-64 shrink-0 border-r-2 border-gray-800 bg-gray-950 flex flex-col pt-4">
           <div className="px-6 mb-10">
              <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.3em] block">Jerarquía de Dietas</span>
              <div className="h-1 w-10 bg-indigo-600 mt-2 rounded-full" />
           </div>

           <div className="flex-1 overflow-y-auto px-4 space-y-3 custom-scrollbar">
              {Object.entries(dietsByCategory).map(([cat, list]) => {
                const allSel = list.every(d => activeDietIds.includes(d.id));
                const isExp = expandedCats[cat] ?? true;
                return (
                  <div key={cat} className="space-y-1">
                     <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-2xl border border-gray-800 group transition-all hover:border-gray-700">
                        <button onClick={() => setExpandedCats(p => ({...p, [cat]: !isExp}))} className="flex-1 flex items-center gap-3 text-[10px] font-black uppercase text-gray-500 group-hover:text-indigo-400">
                           <div className={`transition-transform ${isExp ? 'rotate-90' : ''}`}>▶</div>
                           {cat}
                        </button>
                        <input type="checkbox" checked={allSel} onChange={() => { const ids = list.map(d => d.id); setActiveDietIds(prev => allSel ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))); }} className="w-5 h-5 rounded border-gray-700 bg-black text-indigo-600" />
                     </div>
                     {isExp && (
                       <div className="flex flex-col gap-1 pl-4 mt-2 border-l-2 border-gray-900 ml-2">
                          {list.map(d => (
                            <button key={d.id} onClick={() => setActiveDietIds(prev => prev.includes(d.id) ? prev.filter(id => id !== d.id) : [...prev, d.id])}
                              className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold transition-all ${activeDietIds.includes(d.id) ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-900/40' : 'text-gray-600 hover:text-gray-300'}`}>
                              {d.name.toUpperCase()}
                            </button>
                          ))}
                       </div>
                     )}
                  </div>
                );
              })}
           </div>
        </aside>

        {/* MATRIZ DINÁMICA DE ALTA DENSIDAD */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-black p-8">
           {activeDiets.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center grayscale opacity-30">
                <CalculatorIcon className="w-40 h-40 text-gray-800 mb-8" />
                <p className="text-3xl font-black uppercase tracking-[0.4em] text-gray-700">Activación de Diálogo Maestra</p>
             </div>
           ) : (
             <table className="border-separate border-spacing-0">
               <thead>
                 <tr className="sticky top-0 z-[40]">
                    <th className="sticky left-0 z-[50] bg-black border-2 border-gray-800 p-8 text-left w-[300px] min-w-[300px]">
                       <span className="text-[14px] font-black text-gray-600 uppercase tracking-widest italic">Vectores Arquitectónicos</span>
                    </th>
                    {activeDiets.map(d => {
                      const r = results[d.id];
                      return (
                        <th key={d.id} className="border-2 border-l-0 border-gray-800 p-6 bg-gray-900 w-[180px] min-w-[180px]">
                           <div className="flex flex-col items-center gap-4">
                              <div className="flex items-center gap-3 w-full justify-center">
                                 {r && <StatusDot ok={r.feasible} />}
                                 <span className="text-[14px] font-black text-white uppercase italic truncate tracking-tighter">{d.name}</span>
                                 <button onClick={() => setActiveDietIds(p => p.filter(id => id !== d.id))} className="text-gray-700 hover:text-red-500 transition-colors"><XCircleIcon className="w-6 h-6" /></button>
                              </div>
                              <div className="flex items-center gap-2 bg-black/50 px-5 py-2 rounded-2xl border border-gray-800">
                                 <span className="text-[9px] font-black text-gray-600 uppercase">Kg Batch:</span>
                                 <input type="number" value={batchSizes[d.id]||1000} onChange={e => setBatchSizes(p => ({...p, [d.id]: Number(e.target.value)}))} className="w-16 bg-transparent text-xs font-black font-mono text-cyan-400 text-center outline-none" />
                              </div>
                              <div className="grid grid-cols-3 w-full border-t border-gray-800 mt-4 bg-black/40 divide-x divide-gray-800">
                                 <div className="py-2 text-[10px] font-black text-gray-600 uppercase text-center italic">Mín</div>
                                 <div className="py-2 text-[10px] font-black text-gray-600 uppercase text-center italic">Máx</div>
                                 <div className={`py-2 text-[10px] font-black uppercase text-center ${r?.feasible ? 'text-emerald-500' : 'text-gray-600'}`}>%</div>
                              </div>
                           </div>
                        </th>
                      );
                    })}
                 </tr>
               </thead>

               <tbody className="divide-y divide-gray-950 border-x-2 border-gray-800">
                  {/* INSUMOS SECTION */}
                  <tr className="bg-indigo-950/20 sticky top-[180px] z-[35]">
                     <td colSpan={activeDiets.length + 1} className="sticky left-0 z-[35] px-10 py-5 border-y border-gray-800 font-black text-indigo-400 text-xs uppercase tracking-[0.3em] italic bg-gray-950/95">
                        Insumos — Rango de Inclusión Estricto
                     </td>
                  </tr>
                  {rowIng.map(row => (
                    <tr key={row.id} className="hover:bg-gray-900/50 group h-10">
                       <td className="sticky left-0 z-[30] bg-black border border-gray-900 px-8 py-2">
                          <div className="flex items-center justify-between gap-6">
                             <div className="truncate">
                                <span className="text-[16px] font-extrabold text-gray-100 uppercase tracking-tighter block leading-none">{row.name}</span>
                                {row.price !== undefined && <span className="text-[10px] text-gray-600 font-mono font-bold mt-2 block italic tracking-tighter">$ {row.price.toFixed(2)}/kg</span>}
                             </div>
                             <button onClick={() => handleRemoveRow(row.id)} className="p-2 text-gray-800 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><TrashIcon className="w-6 h-6" /></button>
                          </div>
                       </td>
                       {activeDiets.map(d => {
                         const c = constraints[row.id]?.[d.id];
                         const f = results[d.id]?.formula[row.id] ?? 0;
                         const r = results[d.id];
                         return (
                           <td key={d.id} className="border border-gray-900 p-0 h-10">
                              <div className="grid grid-cols-3 divide-x divide-gray-950 h-full items-center">
                                 <CellInput value={c?.min ?? ''} onChange={v => updateConstraint(row.id, d.id, 'min', v)} min={c?.min} max={c?.max} dirty={c?.dirty} />
                                 <CellInput value={c && c.max < 100 ? c.max : ''} onChange={v => updateConstraint(row.id, d.id, 'max', v)} min={c?.min} max={c?.max} dirty={c?.dirty} />
                                 <CellInput value={f} isResult feasible={r ? r.feasible : true} min={c?.min} max={c?.max} />
                              </div>
                           </td>
                         );
                       })}
                    </tr>
                  ))}

                  {/* NUTRIENTES SECTION */}
                  <tr className="bg-cyan-950/20 sticky top-[180px] z-[35]">
                     <td colSpan={activeDiets.length + 1} className="sticky left-0 z-[35] px-10 py-5 border-y border-gray-800 font-black text-cyan-400 text-xs uppercase tracking-[0.3em] italic bg-gray-950/95">
                        Especificación Técnica — Parámetros de Calidad
                     </td>
                  </tr>
                  {rowNut.map(row => (
                    <tr key={row.id} className="hover:bg-gray-900/50 group h-10">
                       <td className="sticky left-0 z-[30] bg-black border border-gray-900 px-8 py-2">
                          <div className="flex items-center justify-between gap-6">
                             <div className="truncate">
                                <span className="text-[16px] font-extrabold text-gray-100 uppercase tracking-tighter block leading-none">{row.name}</span>
                                {row.unit && <span className="text-[10px] text-gray-600 font-mono font-bold mt-2 block uppercase tracking-tighter">{row.unit}</span>}
                             </div>
                             <button onClick={() => handleRemoveRow(row.id)} className="p-2 text-gray-800 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><TrashIcon className="w-6 h-6" /></button>
                          </div>
                       </td>
                       {activeDiets.map(d => {
                         const c = constraints[row.id]?.[d.id];
                         const n = results[d.id]?.nutrients[row.id] ?? 0;
                         const r = results[d.id];
                         return (
                           <td key={d.id} className="border border-gray-900 p-0 h-10">
                              <div className="grid grid-cols-3 divide-x divide-gray-950 h-full items-center">
                                 <CellInput value={c?.min ?? ''} onChange={v => updateConstraint(row.id, d.id, 'min', v)} min={c?.min} max={c?.max} dirty={c?.dirty} />
                                 <CellInput value={c && c.max < 999 ? c.max : ''} onChange={v => updateConstraint(row.id, d.id, 'max', v)} min={c?.min} max={c?.max} dirty={c?.dirty} />
                                 <CellInput value={n} nutResult feasible={r ? r.feasible : true} min={c?.min} max={c?.max} />
                              </div>
                           </td>
                         );
                       })}
                    </tr>
                  ))}

                  {/* COST RESULTS SECTION */}
                  {hasRun && (
                    <tr className="bg-emerald-950/50 backdrop-blur-2xl">
                       <td className="sticky left-0 z-[30] bg-emerald-950 border-2 border-emerald-900 px-10 py-10">
                          <span className="text-[13px] font-black text-emerald-400 uppercase tracking-[0.4em] italic block">Costo Formulado Final</span>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest mt-2 block">Economic Optimization Yield</span>
                       </td>
                       {activeDiets.map(d => {
                         const r = results[d.id];
                         return (
                           <td key={d.id} className="border-2 border-emerald-900 p-6 text-center">
                             {r?.feasible ? (
                               <div className="flex flex-col items-center">
                                  <div className="text-[38px] font-black font-mono text-white leading-none tracking-tighter italic shadow-xl">
                                    <span className="text-emerald-500 text-xl mr-2">$</span>{r.costPerKg.toFixed(2)}
                                  </div>
                                  <div className="mt-4 px-4 py-1.5 bg-emerald-600 text-[10px] font-black text-white uppercase rounded-xl shadow-lg shadow-emerald-500/30">Solución Óptima</div>
                               </div>
                             ) : (
                               <div className="flex flex-col items-center py-6 bg-red-950/20 rounded-[2rem] mx-2 border border-red-900/40">
                                  <RefreshIcon className="w-10 h-10 text-red-500 animate-spin-slow mb-4 opacity-70" />
                                  <span className="text-[11px] font-black text-red-500 uppercase tracking-widest leading-none">Inconsistente</span>
                                  <span className="text-[14px] font-mono text-white mt-2 font-bold opacity-60">${r?.costPerKg.toFixed(2)}</span>
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
      </main>
    </div>
  );
};
