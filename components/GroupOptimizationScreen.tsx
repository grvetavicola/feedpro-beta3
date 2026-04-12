import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Ingredient, Nutrient, SavedFormula } from '../types';
import { solveFeedFormulation } from '../services/solver';
import { CubeIcon, BeakerIcon, CalculatorIcon, RefreshIcon, XCircleIcon, CheckIcon, TrashIcon } from './icons';

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Props ────────────────────────────────────────────────────────────────────
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

// ─── Shared Components ────────────────────────────────────────────────────────
const StatusDot = ({ ok }: { ok: boolean }) => (
  <span className={`inline-block w-3 h-3 rounded-full shrink-0 ${ok ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
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
      <div className={`w-full text-center text-[17px] font-black font-mono py-2 px-1 select-none ${
        num > 0.001 ? 'text-emerald-400' : 'text-gray-800'
      }`}>
        {num > 0.001 ? num.toFixed(2) : '—'}
      </div>
    );
  }

  if (nutResult) {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return (
      <div className={`w-full text-center text-[17px] font-black font-mono py-2 px-1 select-none ${
        !nutOk ? 'text-red-400 bg-red-950/20' : num > 0 ? 'text-cyan-300' : 'text-gray-800'
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
      className={`text-center text-[17px] font-bold font-mono py-2 px-1 transition-colors ${
        dirty ? 'text-yellow-400 bg-yellow-500/10' :
        injected ? 'text-blue-400' :
        'text-white placeholder-gray-800'
      } focus:text-white focus:bg-blue-600/30`}
    />
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const GroupOptimizationScreen: React.FC<GroupOptimizationScreenProps> = ({
  products, ingredients, nutrients, isDynamicMatrix,
  selectedDietIds, onUpdateProduct, setIsDirty,
  savedFormulas, setSavedFormulas, onRemoveDietFromSelection,
  onEnterFullscreen, onLeaveFullscreen
}) => {

  // ── 1. STATE & HOOKS ──────────────────────────────────────────────────────
  const [activeDietIds, setActiveDietIds] = useState<string[]>(selectedDietIds);
  useEffect(() => { setActiveDietIds(selectedDietIds); }, [selectedDietIds]);
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
  const [showDietPanel, setShowDietPanel] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSelection, setCatalogSelection] = useState<Set<string>>(new Set());

  // ── 2. DATA SYNC ───────────────────────────────────────────────────────────
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
          if (!next[ic.ingredientId][diet.id]) {
            next[ic.ingredientId][diet.id] = { min: ic.min, max: ic.max, dirty: false, injected: false };
          }
        });
        diet.constraints.forEach(nc => {
          if (!next[nc.nutrientId]) next[nc.nutrientId] = {};
          if (!next[nc.nutrientId][diet.id]) {
            next[nc.nutrientId][diet.id] = { min: nc.min, max: nc.max, dirty: false, injected: false };
          }
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

  const dietsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach(p => {
      const cat = p.category || 'GENERAL';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [products]);

  // ── 3. CALLBACKS (MATH LOGIC) ───────────────────────────────────────────────
  const handleRunAll = useCallback(() => {
    if (activeDiets.length === 0) return;
    setIsRunning(true);
    const newResults: Record<string, DietResult> = {};

    activeDiets.forEach(diet => {
      const matrixProduct: Product = {
        ...diet,
        ingredientConstraints: activeRows
          .filter(r => r.type === 'ing' && constraints[r.id]?.[diet.id])
          .map(r => ({ ingredientId: r.id, min: constraints[r.id][diet.id].min, max: constraints[r.id][diet.id].max })),
        constraints: activeRows
          .filter(r => r.type === 'nut' && constraints[r.id]?.[diet.id])
          .map(r => ({ nutrientId: r.id, min: constraints[r.id][diet.id].min, max: constraints[r.id][diet.id].max }))
      };
      
      const batch = batchSizes[diet.id] || 1000;
      const result = solveFeedFormulation(matrixProduct, ingredients, nutrients, batch, isDynamicMatrix);
      
      const formulaMap: Record<string, number> = {};
      result.items.forEach(item => { formulaMap[item.ingredientId] = item.percentage; });
      const nutMap: Record<string, number> = {};
      result.nutrientAnalysis.forEach(na => { nutMap[na.nutrientId] = na.value; });

      newResults[diet.id] = {
        feasible: result.status === 'OPTIMAL',
        costPerKg: batch > 0 ? (result.totalCost / batch) : 0,
        formula: formulaMap, nutrients: nutMap, totalCost: result.totalCost
      };
    });

    setResults(newResults);
    setIsRunning(false);
    setHasRun(true);
    setIsDirty?.(true);
    setConstraints(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(rowId => {
        Object.keys(next[rowId]).forEach(dietId => {
          next[rowId][dietId] = { ...next[rowId][dietId], dirty: false };
        });
      });
      return next;
    });
  }, [activeDiets, activeRows, constraints, batchSizes, ingredients, nutrients, isDynamicMatrix, setIsDirty]);

  const updateConstraint = useCallback((rowId: string, dietId: string, field: 'min' | 'max', val: number) => {
    setConstraints(prev => ({
      ...prev, [rowId]: { ...(prev[rowId] || {}), [dietId]: {
          min: prev[rowId]?.[dietId]?.min ?? 0,
          max: prev[rowId]?.[dietId]?.max ?? (activeRows.find(r => r.id === rowId)?.type === 'ing' ? 100 : 999),
          injected: prev[rowId]?.[dietId]?.injected ?? false,
          ...(prev[rowId]?.[dietId] || {}),
          [field]: val, dirty: true,
        }
      }
    }));
    setHasRun(false);
  }, [activeRows]);

  const handleAddRow = (id: string, customMin?: number, customMax?: number) => {
    const min = customMin !== undefined ? customMin : (injMin === '' ? 0 : parseFloat(injMin));
    const max = customMax !== undefined ? customMax : (injMax === '' ? (injMode === 'ing' ? 100 : 999) : parseFloat(injMax));
    
    if (!activeRows.find(r => r.id === id)) {
      const ing = ingredients.find(i => i.id === id);
      const nut = nutrients.find(n => n.id === id);
      if (ing) {
        const newRow: MatrixRow = { id, type: 'ing', name: ing.name.toUpperCase(), price: (ing.price / (1 - (ing.shrinkage || 0) / 100)) + (ing.processingCost || 0) };
        setActiveRows(prev => [...prev, newRow]);
      } else if (nut) {
        const newRow: MatrixRow = { id, type: 'nut', name: nut.name.toUpperCase(), unit: nut.unit };
        setActiveRows(prev => [...prev, newRow]);
      }
    }

    setConstraints(prev => {
      const next = { ...prev };
      activeDiets.forEach(diet => {
        if (!next[id]) next[id] = {};
        next[id][diet.id] = { min, max, dirty: false, injected: true };
      });
      return next;
    });
    setHasRun(false);
  };

  const handleBulkAdd = () => {
    catalogSelection.forEach(id => handleAddRow(id, 0, (ingredients.find(i => i.id === id) ? 100 : 999)));
    setCatalogSelection(new Set());
    setShowCatalog(false);
  };

  const handleRemoveRow = (rowId: string) => {
    setActiveRows(prev => prev.filter(r => r.id !== rowId));
    setConstraints(prev => { const next = { ...prev }; delete next[rowId]; return next; });
  };

  const handleSaveBulk = () => {
    const successfulDiets = activeDiets.filter(diet => results[diet.id]?.feasible);
    if (successfulDiets.length === 0) return alert("Optimice dietas exitosas para guardar.");

    const newFormulas: SavedFormula[] = successfulDiets.map(diet => {
      const matrixProduct: Product = {
        ...diet,
        ingredientConstraints: activeRows.filter(r => r.type === 'ing' && constraints[r.id]?.[diet.id]).map(r => ({ ingredientId: r.id, min: constraints[r.id][diet.id].min, max: constraints[r.id][diet.id].max })),
        constraints: activeRows.filter(r => r.type === 'nut' && constraints[r.id]?.[diet.id]).map(r => ({ nutrientId: r.id, min: constraints[r.id][diet.id].min, max: constraints[r.id][diet.id].max }))
      };
      const result = solveFeedFormulation(matrixProduct, ingredients, nutrients, batchSizes[diet.id] || 1000, isDynamicMatrix);
      return { id: Math.random().toString(36).substr(2, 9), clientId: diet.clientId, name: diet.name.toUpperCase(), date: new Date().toISOString(), result };
    });

    if (setSavedFormulas) {
      setSavedFormulas((prev: any) => [...(Array.isArray(prev) ? prev : []), ...newFormulas]);
      alert(`✅ ${newFormulas.length} Dietas guardadas.`);
      onLeaveFullscreen?.();
    }
  };

  const injOptions = useMemo(() => {
    const term = injSearch.toLowerCase();
    if (term.length < 2) return [];
    if (injMode === 'ing') return ingredients.filter(i => i.name.toLowerCase().includes(term)).slice(0, 10);
    return nutrients.filter(n => n.name.toLowerCase().includes(term)).slice(0, 10);
  }, [injMode, injSearch, ingredients, nutrients]);

  // ── 4. EFFECTS ─────────────────────────────────────────────────────────────
  useEffect(() => {
    onEnterFullscreen?.();
    return () => onLeaveFullscreen?.();
  }, [onEnterFullscreen, onLeaveFullscreen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'F4') { e.preventDefault(); handleRunAll(); } };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunAll]);

  // ── 5. RENDER ────────────────────────────────────────────────────────────
  const ingRows = activeRows.filter(r => r.type === 'ing');
  const nutRows = activeRows.filter(r => r.type === 'nut');

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-black text-white antialiased">
      
      {/* 🔹 MODAL CATÁLOGO (BULK ADD) - TOTAL INDEPENDENCE */}
      {showCatalog && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[500] flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-indigo-400 uppercase tracking-tighter italic leading-none">Catálogo Maestro</h2>
                <p className="text-[10px] text-gray-500 font-bold tracking-widest mt-1 uppercase">Selección masiva de inclusiones y nutrientes</p>
              </div>
              <button onClick={() => setShowCatalog(false)} className="p-2 hover:bg-gray-800 rounded-full transition-all text-gray-500 hover:text-white"><XCircleIcon className="w-8 h-8" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-10 custom-scrollbar">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-400 font-black text-xs uppercase border-b border-indigo-900 pb-2 mb-4"><CubeIcon className="w-5 h-5" /> Insumos / Inyectables</div>
                {ingredients.map(ing => (
                  <label key={ing.id} className="flex items-center gap-3 p-4 bg-gray-950/40 rounded-2xl hover:bg-indigo-600/10 cursor-pointer border border-transparent hover:border-indigo-500/30 transition-all select-none">
                    <input type="checkbox" checked={catalogSelection.has(ing.id)} onChange={() => { const next = new Set(catalogSelection); if (next.has(ing.id)) next.delete(ing.id); else next.add(ing.id); setCatalogSelection(next); }} className="w-5 h-5 rounded border-gray-700 bg-black text-indigo-600 focus:ring-indigo-500" />
                    <span className="text-sm font-bold uppercase text-gray-300">{ing.name}</span>
                  </label>
                ))}
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-cyan-400 font-black text-xs uppercase border-b border-cyan-900 pb-2 mb-4"><BeakerIcon className="w-5 h-5" /> Requerimientos Nutritivos</div>
                {nutrients.map(nut => (
                  <label key={nut.id} className="flex items-center gap-3 p-4 bg-gray-950/40 rounded-2xl hover:bg-cyan-600/10 cursor-pointer border border-transparent hover:border-cyan-500/30 transition-all select-none">
                    <input type="checkbox" checked={catalogSelection.has(nut.id)} onChange={() => { const next = new Set(catalogSelection); if (next.has(nut.id)) next.delete(nut.id); else next.add(nut.id); setCatalogSelection(next); }} className="w-5 h-5 rounded border-gray-700 bg-black text-cyan-600 focus:ring-cyan-500" />
                    <span className="text-sm font-bold uppercase text-gray-300">{nut.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-gray-800 flex items-center justify-between bg-black/40">
              <span className="text-xs font-black text-gray-500 uppercase">{catalogSelection.size} seleccionados</span>
              <button onClick={handleBulkAdd} disabled={catalogSelection.size === 0} className="px-12 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-black uppercase rounded-2xl transition-all shadow-xl">Inyectar a Matriz</button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 HEADER (SANEADO Y FIJO) */}
      <header className="flex-none flex items-center justify-between w-full h-20 px-8 bg-gray-900 border-b-2 border-gray-800 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => onLeaveFullscreen?.()} className="flex items-center gap-2 px-6 py-3 bg-red-700/10 hover:bg-red-700 text-red-500 hover:text-white border border-red-700/50 rounded-xl transition-all font-black uppercase text-xs">
            <RefreshIcon className="w-4 h-4 rotate-180" /> Volver
          </button>
          <button onClick={handleSaveBulk} disabled={isRunning || !hasRun} className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl transition-all font-black uppercase text-xs shadow-lg">
            <CheckIcon className="w-4 h-4" /> Guardar Todo
          </button>
        </div>

        <div className="flex flex-col items-center">
          <h1 className="text-xl font-black text-cyan-400 uppercase tracking-[0.2em] leading-none italic">FEED PRO 360 MATRIX</h1>
          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.5em] mt-1.5 opacity-60">Architectural Optimization Workspace</span>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => { setInjMode(injMode === 'ing' ? 'nut' : 'ing'); setInjSearch(''); }} className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 text-xs font-black uppercase text-gray-400">
            {injMode === 'ing' ? 'Modo: Insumos' : 'Modo: Nutrientes'}
          </button>
          <button onClick={handleRunAll} disabled={isRunning || activeDiets.length === 0} className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black px-10 py-3 rounded-xl text-sm uppercase shadow-2xl transition-all">
            {isRunning ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <CalculatorIcon className="w-5 h-5" />} OPTIMIZAR (F4)
          </button>
        </div>
      </header>

      {/* 🛠 BARRA DE ACCIÓN RÁPIDA (INJECTOR) */}
      <div className="flex-none flex items-center gap-6 px-8 h-16 bg-gray-950 border-b border-gray-800">
        <button onClick={() => setShowCatalog(true)} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-900/20 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-950 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest shrink-0">
          🛒 Explorar Catálogo
        </button>

        <div className="relative flex-1 max-w-md">
          <input type="text" value={injSearch} onChange={e => setInjSearch(e.target.value)} placeholder={`Búsqueda rápida de ${injMode === 'ing' ? 'insumos' : 'nutrientes'}...`} className="w-full h-11 bg-gray-900 border border-gray-800 text-white text-sm rounded-xl px-4 outline-none focus:border-indigo-500 placeholder-gray-700 font-bold uppercase shadow-inner transition-all" />
          {injOptions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border-2 border-gray-700 rounded-2xl shadow-2xl z-[100] max-h-[300px] overflow-y-auto">
              {injOptions.map(opt => (
                <button key={opt.id} onClick={() => { handleAddRow(opt.id); setInjSearch(''); }} className="w-full text-left px-5 py-4 text-xs text-gray-100 hover:bg-indigo-600 border-b border-gray-800 border-dashed transition-all flex items-center justify-between font-black uppercase last:border-0">
                  <span>{opt.name}</span> <span className="text-[9px] bg-emerald-600 px-2 py-1 rounded">+ ADD</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-2.5 bg-emerald-950/20 rounded-xl border border-emerald-900/40 shrink-0">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Masa Total:</span>
          <span className="text-sm font-black font-mono text-emerald-400">{activeDiets.reduce((a,d) => a + (batchSizes[d.id]||1000), 0).toLocaleString()} KG</span>
        </div>
        <button onClick={() => setShowDietPanel(!showDietPanel)} className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl border border-gray-700 text-[10px] font-black uppercase text-gray-400 shrink-0">
          Dietas ({activeDietIds.length})
        </button>
      </div>

      {/* 📊 CANVAS CENTRAL (MATRIZ EXPANDIDA) */}
      <main className="flex-1 flex overflow-hidden w-full relative bg-gray-950">
        
        {/* SIDEBAR DE DIETAS */}
        {showDietPanel && (
          <aside className="w-80 border-r border-gray-800 bg-gray-900/50 flex flex-col shrink-0">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest italic">Selector de Dietas</span>
              <button onClick={() => setShowDietPanel(false)} className="text-gray-600 hover:text-white"><XCircleIcon className="w-6 h-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {Object.entries(dietsByCategory).map(([cat, prods]) => {
                const allSel = prods.every(p => activeDietIds.includes(p.id));
                return (
                  <div key={cat} className="space-y-1.5">
                    <button onClick={() => { const ids = prods.map(p => p.id); setActiveDietIds(prev => allSel ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))); }} className="w-full flex items-center justify-between px-4 py-3 bg-gray-900 rounded-2xl border border-gray-800 hover:border-indigo-500 transition-all">
                      <span className="text-[10px] font-black uppercase text-gray-400">{cat}</span>
                      <div className={`w-3.5 h-3.5 rounded border-2 ${allSel ? 'bg-indigo-500 border-indigo-500' : 'border-gray-700'}`} />
                    </button>
                    {prods.map(p => (
                      <button key={p.id} onClick={() => setActiveDietIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])} className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold transition-all border-2 ${activeDietIds.includes(p.id) ? 'bg-indigo-600/10 text-indigo-400 border-indigo-900/30' : 'text-gray-500 border-transparent hover:bg-gray-800'}`}>
                        {p.name.toUpperCase()}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* MATRIZ DE DATOS (FULL EXPANSION) */}
        <div className="flex-1 w-full overflow-auto custom-scrollbar p-6 bg-black">
          {activeDiets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-25">
              <CalculatorIcon className="w-40 h-40 mb-6 text-gray-800" />
              <p className="text-2xl font-black uppercase tracking-[0.4em] text-gray-600">No hay dietas activas</p>
              <button onClick={() => setShowDietPanel(true)} className="mt-8 px-8 py-3 bg-white text-black rounded-2xl font-black uppercase text-xs hover:bg-cyan-400 transition-all">Abrir Selector de Dietas</button>
            </div>
          ) : (
            <table className="w-full border-collapse table-fixed min-w-max">
              <thead>
                <tr className="sticky top-0 z-30 bg-black">
                  <th className="sticky left-0 z-40 bg-black border-2 border-gray-800 p-6 text-left w-[260px] min-w-[260px]">
                    <span className="text-[12px] font-black text-gray-600 uppercase tracking-widest leading-none">Vectores de Requerimiento</span>
                  </th>
                  {activeDiets.map(diet => {
                    const res = results[diet.id];
                    return (
                      <th key={diet.id} className="border-2 border-gray-800 p-2 bg-gray-900 w-[200px] min-w-[200px]">
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex items-center gap-2 w-full justify-center px-2">
                             {res && <StatusDot ok={res.feasible} />}
                             <span className="text-xs font-black text-white uppercase italic truncate tracking-tighter">{diet.name}</span>
                             <button onClick={() => { setActiveDietIds(prev => prev.filter(id => id !== diet.id)); onRemoveDietFromSelection?.(diet.id); }} className="text-gray-700 hover:text-red-500 shrink-0"><XCircleIcon className="w-5 h-5" /></button>
                          </div>
                          <div className="flex items-center gap-2 bg-black px-4 py-1.5 rounded-xl border border-gray-800 w-3/4">
                             <span className="text-[9px] font-black text-gray-600 uppercase">Batch:</span>
                             <input type="number" value={batchSizes[diet.id] || 1000} onChange={e => setBatchSizes(prev => ({ ...prev, [diet.id]: Number(e.target.value) }))} className="w-full bg-transparent text-xs text-center font-black font-mono text-cyan-400" />
                          </div>
                          <div className="grid grid-cols-3 w-full border-t border-gray-800 mt-2 bg-black/50 divide-x divide-gray-800">
                             <span className="text-center text-[9px] font-black text-gray-500 uppercase py-3 italic">Mín</span>
                             <span className="text-center text-[9px] font-black text-gray-500 uppercase py-3 italic">Máx</span>
                             <span className={`text-center text-[9px] font-black uppercase py-3 ${res?.feasible ? 'text-emerald-500' : 'text-gray-700'}`}>Form %</span>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {/* INSUMOS */}
                <tr className="bg-indigo-950/20 backdrop-blur-sm sticky top-[152px] z-20">
                  <td colSpan={activeDiets.length + 1} className="sticky left-0 z-20 px-8 py-3 border-y border-gray-800 flex items-center gap-2 bg-gray-950/90 font-black text-indigo-400 text-xs uppercase tracking-[0.2em] italic">
                    <CubeIcon className="w-4 h-4" /> Insumos Disponibles (Inclusiones %)
                  </td>
                </tr>
                {ingRows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-900 group transition-colors">
                    <td className="sticky left-0 z-10 bg-black border border-gray-900 px-6 py-4">
                      <div className="flex items-center justify-between gap-4">
                         <div className="truncate">
                            <span className="text-[15px] font-black text-gray-200 uppercase tracking-tighter block leading-tight">{row.name}</span>
                            {row.price !== undefined && <span className="text-[11px] text-gray-600 font-mono font-bold italic">$ {row.price.toFixed(2)} / kg</span>}
                         </div>
                         <button onClick={() => handleRemoveRow(row.id)} className="text-gray-800 hover:text-red-500 p-2 bg-red-950/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-5 h-5" /></button>
                      </div>
                    </td>
                    {activeDiets.map(diet => {
                      const con = constraints[row.id]?.[diet.id];
                      const formulaVal = results[diet.id]?.formula[row.id] ?? 0;
                      return (
                        <td key={diet.id} className="border border-gray-900 p-0 overflow-hidden">
                           <div className="grid grid-cols-3 divide-x divide-gray-950 h-full">
                              <CellInput value={con?.min ?? ''} onChange={v => updateConstraint(row.id, diet.id, 'min', v)} dirty={con?.dirty} injected={con?.injected} />
                              <CellInput value={con && con.max < 100 ? con.max : ''} onChange={v => updateConstraint(row.id, diet.id, 'max', v)} dirty={con?.dirty} injected={con?.injected} />
                              <CellInput value={formulaVal} isResult />
                           </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* NUTRIENTES */}
                <tr className="bg-cyan-950/20 backdrop-blur-sm sticky top-[152px] z-20">
                  <td colSpan={activeDiets.length + 1} className="sticky left-0 z-20 px-8 py-3 border-y border-gray-800 flex items-center gap-2 bg-gray-950/90 font-black text-cyan-400 text-xs uppercase tracking-[0.2em] italic">
                    <BeakerIcon className="w-4 h-4" /> Especificación Técnica (Aportes Nutritivos)
                  </td>
                </tr>
                {nutRows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-900 group transition-colors">
                    <td className="sticky left-0 z-10 bg-black border border-gray-900 px-6 py-4">
                      <div className="flex items-center justify-between gap-4">
                         <div className="truncate">
                            <span className="text-[15px] font-black text-gray-200 uppercase tracking-tighter block leading-tight">{row.name}</span>
                            {row.unit && <span className="text-[11px] text-gray-600 font-mono font-bold uppercase italic">{row.unit}</span>}
                         </div>
                         <button onClick={() => handleRemoveRow(row.id)} className="text-gray-800 hover:text-red-500 p-2 bg-red-950/10 rounded-xl opacity-0 group-hover:opacity-100 transition-all"><TrashIcon className="w-5 h-5" /></button>
                      </div>
                    </td>
                    {activeDiets.map(diet => {
                      const con = constraints[row.id]?.[diet.id];
                      const nutVal = results[diet.id]?.nutrients[row.id] ?? 0;
                      const isWithin = con ? nutVal >= (con.min - 0.001) && (nutVal <= (con.max + 0.001) || con.max >= 999) : true;
                      return (
                        <td key={diet.id} className="border border-gray-900 p-0 overflow-hidden">
                           <div className="grid grid-cols-3 divide-x divide-gray-950 h-full">
                              <CellInput value={con?.min ?? ''} onChange={v => updateConstraint(row.id, diet.id, 'min', v)} dirty={con?.dirty} injected={con?.injected} />
                              <CellInput value={con && con.max < 999 ? con.max : ''} onChange={v => updateConstraint(row.id, diet.id, 'max', v)} dirty={con?.dirty} injected={con?.injected} />
                              <CellInput value={nutVal} nutResult nutOk={isWithin || !hasRun} />
                           </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* TOTALES */}
                {hasRun && (
                  <tr className="bg-emerald-950/40 backdrop-blur-lg">
                    <td className="sticky left-0 z-20 bg-emerald-950 border-2 border-emerald-900 px-8 py-6">
                      <span className="text-sm font-black text-emerald-400 uppercase italic tracking-[0.3em]">Costo Final Dieta ($/KG)</span>
                    </td>
                    {activeDiets.map(diet => {
                      const res = results[diet.id];
                      return (
                        <td key={diet.id} className="border-2 border-emerald-900 px-2 py-6 text-center">
                          {res?.feasible ? (
                            <div className="flex flex-col items-center">
                               <span className="text-3xl font-black font-mono text-white leading-none tracking-tighter italic">${res.costPerKg.toFixed(2)}</span>
                               <span className="text-[10px] text-emerald-500 font-black mt-2 uppercase tracking-widest opacity-80">Total Batch: ${res.totalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center py-2">
                                <XCircleIcon className="w-6 h-6 text-red-500 mb-2 animate-pulse" />
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Infeasible Solution</span>
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
