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

// ─── Components ─────────────────────────────────────────────────────────────

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

// ─── Main Logic ──────────────────────────────────────────────────────────────

export const GroupOptimizationScreen: React.FC<GroupOptimizationScreenProps> = ({
  products = [], ingredients = [], nutrients = [], isDynamicMatrix: initialIsDynamic,
  selectedDietIds = [], onUpdateProduct, setIsDirty,
  savedFormulas, setSavedFormulas, onRemoveDietFromSelection,
  onEnterFullscreen, onLeaveFullscreen
}) => {

  // 1. HOOKS
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

  // Memoized Data con safety
  const activeDiets = useMemo(() => {
    if (!products) return [];
    return products.filter(p => activeDietIds.includes(p.id));
  }, [products, activeDietIds]);

  const dietsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    if (!products) return map;
    products.forEach(p => {
      const cat = (p.category || 'GENERAL').trim().toUpperCase();
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [products]);

  const totalLoadedKg = useMemo(() => {
    if (!activeDiets) return 0;
    return activeDiets.reduce((acc, d) => acc + (batchSizes[d.id] || 1000), 0);
  }, [activeDiets, batchSizes]);

  // Sync effects
  useEffect(() => { if (selectedDietIds) setActiveDietIds(selectedDietIds); }, [selectedDietIds]);

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
        (diet.ingredientConstraints || []).forEach(ic => {
          if (!next[ic.ingredientId]) next[ic.ingredientId] = {};
          if (!next[ic.ingredientId][diet.id]) next[ic.ingredientId][diet.id] = { min: ic.min, max: ic.max, dirty: false, injected: false };
        });
        (diet.constraints || []).forEach(nc => {
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
      (d.ingredientConstraints || []).forEach(ic => ingIds.add(ic.ingredientId));
      (d.constraints || []).forEach(nc => nutIds.add(nc.nutrientId));
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

  // 2. CALLBACKS
  const handleRunAll = useCallback(() => {
    if (!activeDiets || activeDiets.length === 0) return;
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
      Object.keys(next).forEach(r => Object.keys(next[r]).forEach(d => { if (next[r][d]) next[r][d].dirty = false; }));
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
      activeDiets.forEach(d => { if (!next[id]) next[id] = {}; next[id][d.id] = { min: 0, max: isDynamic ? 999 : 100, dirty: false, injected: true }; });
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

  useEffect(() => {
    const L = (e: KeyboardEvent) => { if (e.key === 'F4') { e.preventDefault(); handleRunAll(); } };
    window.addEventListener('keydown', L);
    onEnterFullscreen?.();
    return () => { window.removeEventListener('keydown', L); onLeaveFullscreen?.(); };
  }, [handleRunAll, onEnterFullscreen, onLeaveFullscreen]);

  // ── 3. RENDER ────────────────────────────────────────────────────────────
  const rowIng = activeRows.filter(r => r.type === 'ing');
  const rowNut = activeRows.filter(r => r.type === 'nut');

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-black text-white font-sans antialiased select-none">
      
      {/* Selector Global Modal */}
      {showCatalog && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-8">
           <div className="bg-gray-900 border border-gray-800 rounded-[3rem] w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
             <div className="p-10 border-b border-gray-800 flex items-center justify-between flex-none">
               <div>
                 <h2 className="text-4xl font-black text-indigo-400 uppercase tracking-tighter italic">Selector Global</h2>
                 <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-2">Inyección masiva de vectores técnicos</p>
               </div>
               <button onClick={() => setShowCatalog(false)} className="p-4 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition-all"><XCircleIcon className="w-12 h-12" /></button>
             </div>
             
             <div className="flex-none p-6 bg-gray-950/50 border-b border-gray-800">
               <div className="relative max-w-xl mx-auto">
                 <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
                 <input type="text" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} placeholder="BUSCAR..." className="w-full h-12 bg-gray-900 border border-gray-800 rounded-2xl pl-12 pr-6 text-sm font-bold uppercase text-white outline-none focus:border-indigo-600" />
               </div>
             </div>

             <div className="flex-1 overflow-y-auto p-10 grid grid-cols-2 gap-16 custom-scrollbar">
               <div className="space-y-4">
                 <div className="text-indigo-400 font-black text-xs uppercase border-b border-indigo-900 pb-3 mb-6 tracking-widest">Insumos</div>
                 {ingredients.filter(i => i.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(i => (
                   <label key={i.id} className="flex items-center gap-4 p-5 bg-gray-950/40 rounded-3xl hover:bg-indigo-600/10 cursor-pointer border border-transparent hover:border-indigo-500/30">
                     <input type="checkbox" checked={catalogSelection.has(i.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(i.id)) s.delete(i.id); else s.add(i.id); setCatalogSelection(s); }} className="w-6 h-6 rounded bg-black border-gray-800 text-indigo-600" />
                     <span className="text-sm font-black uppercase text-gray-200">{i.name}</span>
                   </label>
                 ))}
               </div>
               <div className="space-y-4">
                 <div className="text-cyan-400 font-black text-xs uppercase border-b border-cyan-900 pb-3 mb-6 tracking-widest">Nutrientes</div>
                 {nutrients.filter(n => n.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(n => (
                   <label key={n.id} className="flex items-center gap-4 p-5 bg-gray-950/40 rounded-3xl hover:bg-cyan-600/10 cursor-pointer border border-transparent hover:border-cyan-500/30">
                     <input type="checkbox" checked={catalogSelection.has(n.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(n.id)) s.delete(n.id); else s.add(n.id); setCatalogSelection(s); }} className="w-6 h-6 rounded bg-black border-gray-800 text-cyan-600" />
                     <span className="text-sm font-black uppercase text-gray-200">{n.name}</span>
                   </label>
                 ))}
               </div>
             </div>
             
             <div className="p-10 border-t border-gray-800 bg-black/40 flex items-center justify-between flex-none">
               <span className="text-sm font-bold text-gray-500 uppercase italic">{catalogSelection.size} seleccionados</span>
               <button onClick={handleBulkAdd} disabled={catalogSelection.size === 0} className="px-20 py-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-black uppercase rounded-3xl shadow-xl transition-all">Inyectar Selección</button>
             </div>
           </div>
        </div>
      )}

      {/* Header */}
      <nav className="flex-none bg-gray-900 border-b-2 border-gray-800 z-50">
        <div className="h-20 px-8 flex items-center justify-between border-b border-gray-800">
           <div className="flex items-center gap-4">
             <button onClick={() => onLeaveFullscreen?.()} className="px-8 h-12 bg-red-700 hover:bg-red-600 text-white font-black uppercase text-[11px] rounded-2xl shadow-lg transition-all active:scale-95 flex items-center gap-3">
               <RefreshIcon className="w-5 h-5 rotate-180" /> Volver
             </button>
             <button onClick={handleSaveBulk} className="px-8 h-12 bg-gray-800 hover:bg-indigo-600 text-gray-300 hover:text-white font-black uppercase text-[11px] rounded-2xl border border-gray-700 transition-all flex items-center gap-3">
               <CheckIcon className="w-5 h-5" /> Guardar
             </button>
           </div>
           
           <div className="flex items-center gap-10 px-12 py-3 bg-black/60 rounded-full border border-gray-800">
             <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Dietas</span>
                <span className="text-2xl font-black text-indigo-400 font-mono leading-none">{activeDiets.length}</span>
             </div>
             <div className="w-px h-8 bg-gray-800" />
             <div className="flex flex-col items-center">
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-none mb-1">Total Kg</span>
                <span className="text-2xl font-black text-cyan-400 font-mono leading-none">{totalLoadedKg.toLocaleString()}</span>
             </div>
           </div>

           <button onClick={handleRunAll} disabled={isRunning || activeDiets.length === 0}
             className="px-16 h-14 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-black uppercase text-xl italic tracking-tighter rounded-2xl shadow-2xl flex items-center gap-4 transition-all">
             {isRunning ? <RefreshIcon className="w-8 h-8 animate-spin" /> : <CalculatorIcon className="w-8 h-8" />} OPTIMIZAR (F4)
           </button>
        </div>

        <div className="h-16 px-8 flex items-center justify-between bg-gray-950/50">
           <div className="flex items-center gap-6">
              <button onClick={() => setShowCatalog(true)} className="px-8 h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[11px] rounded-2xl shadow-xl transition-all">
                🛒 Selector Global
              </button>
              <div className="flex h-11 border border-gray-800 rounded-2xl overflow-hidden bg-gray-900">
                <button onClick={() => setIsDynamic(false)} className={`px-6 text-[10px] font-black uppercase transition-all ${!isDynamic ? 'bg-gray-700 text-white' : 'text-gray-500'}`}>Estándar</button>
                <button onClick={() => setIsDynamic(true)} className={`px-6 text-[10px] font-black uppercase transition-all ${isDynamic ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>Dinámica</button>
              </div>
           </div>
           
           <button className="px-8 h-11 bg-yellow-600 hover:bg-yellow-500 text-black font-black uppercase text-[11px] rounded-2xl shadow-xl transition-all flex items-center gap-3">
             <RefreshIcon className="w-5 h-5 bg-black/10 rounded" /> Agregar Relaciones
           </button>
        </div>
      </nav>

      <main className="flex-1 flex overflow-hidden w-full relative">
        
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r-2 border-gray-800 bg-gray-950 flex flex-col pt-4 overflow-hidden">
           <div className="px-6 mb-8 shrink-0">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Menú Administrativo</span>
              <div className="h-1 w-12 bg-indigo-600 mt-2 rounded-full" />
           </div>

           <div className="flex-1 overflow-y-auto px-4 space-y-4 custom-scrollbar">
              {Object.entries(dietsByCategory).map(([cat, list]) => {
                const allSel = list.every(d => activeDietIds.includes(d.id));
                const isExp = expandedCats[cat] ?? true;
                return (
                  <div key={cat} className="space-y-1">
                     <div className="flex items-center justify-between p-3 bg-gray-900/40 rounded-2xl border border-gray-800/50">
                        <button onClick={() => setExpandedCats(p => ({...p, [cat]: !isExp}))} className="flex-1 flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
                           <span className={`inline-block transition-transform ${isExp ? 'rotate-90' : ''}`}>▶</span> {cat}
                        </button>
                        <input type="checkbox" checked={allSel} onChange={() => { const ids = list.map(d => d.id); setActiveDietIds(prev => allSel ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))); }} className="w-5 h-5 rounded border-gray-700 bg-black text-indigo-600" />
                     </div>
                     {isExp && (
                       <div className="flex flex-col gap-1 pl-4 mt-2 border-l-2 border-gray-900 ml-2">
                          {list.map(d => (
                            <button key={d.id} onClick={() => setActiveDietIds(prev => prev.includes(d.id) ? prev.filter(id => id !== d.id) : [...prev, d.id])}
                              className={`w-full text-left px-4 py-3 rounded-xl text-[11px] font-bold transition-all ${activeDietIds.includes(d.id) ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-900/40' : 'text-gray-600'}`}>
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

        {/* Matrix Canvas */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-black p-8">
           {activeDiets.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center opacity-25">
               <CalculatorIcon className="w-40 h-40 text-gray-800 mb-8" />
               <p className="text-2xl font-black uppercase tracking-[0.4em] text-gray-700">Seleccione Dietas del Menú</p>
             </div>
           ) : (
             <table className="border-separate border-spacing-0 min-w-max">
               <thead>
                 <tr className="sticky top-0 z-[40]">
                    <th className="sticky left-0 z-[50] bg-black border-2 border-gray-800 p-8 text-left w-[300px] min-w-[300px]">
                       <span className="text-sm font-black text-gray-600 uppercase italic tracking-widest">Matriz de Vectores</span>
                    </th>
                    {activeDiets.map(d => {
                      const r = results[d.id];
                      return (
                        <th key={d.id} className="border-2 border-l-0 border-gray-800 p-6 bg-gray-900 w-[180px] min-w-[180px]">
                           <div className="flex flex-col items-center gap-4">
                              <div className="flex items-center gap-3 w-full justify-center">
                                 {r && <StatusDot ok={r.feasible} />}
                                 <span className="text-sm font-black text-white uppercase italic truncate tracking-tighter">{d.name}</span>
                                 <button onClick={() => setActiveDietIds(p => p.filter(id => id !== d.id))} className="text-gray-700 hover:text-red-500"><XCircleIcon className="w-5 h-5" /></button>
                              </div>
                              <div className="flex items-center gap-2 bg-black/50 px-5 py-2 rounded-2xl border border-gray-800">
                                 <span className="text-[9px] font-black text-gray-600 uppercase">Kg:</span>
                                 <input type="number" value={batchSizes[d.id]||1000} onChange={e => setBatchSizes(p => ({...p, [d.id]: Number(e.target.value)}))} className="w-16 bg-transparent text-xs font-black font-mono text-cyan-400 text-center outline-none" />
                              </div>
                              <div className="grid grid-cols-3 w-full border-t border-gray-800 mt-4 bg-black/40 divide-x divide-gray-800">
                                 <div className="py-2 text-[10px] font-black text-gray-600 uppercase text-center">Mín</div>
                                 <div className="py-2 text-[10px] font-black text-gray-600 uppercase text-center">Máx</div>
                                 <div className={`py-2 text-[10px] font-black uppercase text-center ${r?.feasible ? 'text-emerald-500' : 'text-gray-600'}`}>%</div>
                              </div>
                           </div>
                        </th>
                      );
                    })}
                 </tr>
               </thead>

               <tbody className="divide-y divide-gray-950 border-x-2 border-gray-800">
                  <tr className="bg-indigo-950/20 sticky top-[180px] z-[35]">
                     <td colSpan={activeDiets.length + 1} className="sticky left-0 z-[35] px-10 py-5 border-y border-gray-800 font-black text-indigo-400 text-xs uppercase italic bg-gray-950/95">Insumos</td>
                  </tr>
                  {rowIng.map(row => (
                    <tr key={row.id} className="hover:bg-gray-900/50 h-10 group">
                       <td className="sticky left-0 z-[30] bg-black border border-gray-900 px-8 py-2">
                          <div className="flex items-center justify-between gap-6">
                             <div className="truncate">
                                <span className="text-[16px] font-bold text-gray-100 uppercase block leading-none">{row.name}</span>
                                {row.price !== undefined && <span className="text-[10px] text-gray-600 font-mono mt-2 block">$ {row.price.toFixed(2)}</span>}
                             </div>
                             <button onClick={() => handleRemoveRow(row.id)} className="p-2 text-gray-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-6 h-6" /></button>
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

                  <tr className="bg-cyan-950/20 sticky top-[180px] z-[35]">
                     <td colSpan={activeDiets.length + 1} className="sticky left-0 z-[35] px-10 py-5 border-y border-gray-800 font-black text-cyan-400 text-xs uppercase italic bg-gray-950/95">Nutrientes</td>
                  </tr>
                  {rowNut.map(row => (
                    <tr key={row.id} className="hover:bg-gray-900/50 h-10 group">
                       <td className="sticky left-0 z-[30] bg-black border border-gray-900 px-8 py-2">
                          <div className="flex items-center justify-between gap-6">
                             <div className="truncate">
                                <span className="text-[16px] font-bold text-gray-100 uppercase block leading-none">{row.name}</span>
                                {row.unit && <span className="text-[10px] text-gray-600 font-mono mt-2 block italic">{row.unit}</span>}
                             </div>
                             <button onClick={() => handleRemoveRow(row.id)} className="p-2 text-gray-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-6 h-6" /></button>
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

                  {hasRun && (
                    <tr className="bg-emerald-950/40 backdrop-blur-2xl">
                       <td className="sticky left-0 z-[30] bg-emerald-950 border-2 border-emerald-900 px-10 py-10">
                          <span className="text-xs font-black text-emerald-400 uppercase tracking-widest block">Costo Formulado</span>
                       </td>
                       {activeDiets.map(d => {
                         const r = results[d.id];
                         return (
                           <td key={d.id} className="border-2 border-emerald-900 p-6 text-center">
                             {r?.feasible ? (
                               <div className="flex flex-col items-center">
                                  <div className="text-[34px] font-black font-mono text-white leading-none">
                                    <span className="text-emerald-500 text-lg mr-2">$</span>{r.costPerKg.toFixed(2)}
                                  </div>
                                  <div className="mt-4 px-4 py-1.5 bg-emerald-600 text-[10px] font-black text-white uppercase rounded-xl">Óptimo</div>
                               </div>
                             ) : (
                               <div className="flex flex-col items-center py-6 bg-red-950/20 rounded-[2rem] mx-2 border border-red-900/40">
                                  <RefreshIcon className="w-10 h-10 text-red-500 animate-spin-slow mb-4 opacity-70" />
                                  <span className="text-[11px] font-black text-red-500 uppercase leading-none">Infactible</span>
                                  <span className="text-sm font-mono text-white mt-2 font-bold opacity-60">${r?.costPerKg.toFixed(2)}</span>
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
