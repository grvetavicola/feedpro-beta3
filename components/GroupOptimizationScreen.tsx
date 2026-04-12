import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Ingredient, Nutrient, SavedFormula } from '../types';
import { solveFeedFormulation } from '../services/solver';
import { CubeIcon, BeakerIcon, CalculatorIcon, RefreshIcon, XCircleIcon, CheckIcon, TrashIcon } from './icons';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CellConstraint {
  min: number;
  max: number;
  dirty: boolean;      // Edited manually this session
  injected: boolean;   // Set via bulk injector
}

type RowType = 'ing' | 'nut';

interface MatrixRow {
  id: string;
  type: RowType;
  name: string;
  unit?: string;
  price?: number; // For ingredients only
}

interface DietResult {
  feasible: boolean;
  costPerKg: number;
  formula: Record<string, number>;       // ingId → %
  nutrients: Record<string, number>;     // nutId → value
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

// ─── Small components ─────────────────────────────────────────────────────────
const StatusDot = ({ ok }: { ok: boolean }) => (
  <span className={`inline-block w-3 h-3 rounded-full shrink-0 ${ok ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
);

// ─── Cell Input (GIGANTE, Excel-style) ──────────────────────────────────
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
      <div className={`w-full text-center text-xl font-black font-mono py-2 px-1 select-none ${
        num > 0.001 ? 'text-emerald-400' : 'text-gray-700'
      }`}>
        {num > 0.001 ? num.toFixed(2) + '%' : '—'}
      </div>
    );
  }

  if (nutResult) {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return (
      <div className={`w-full text-center text-xl font-black font-mono py-2 px-1 select-none ${
        !nutOk ? 'text-red-400 bg-red-900/20' : num > 0 ? 'text-cyan-300' : 'text-gray-700'
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
      className={`text-center text-xl font-black font-mono py-2 px-1 transition-colors ${
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

  // ── Fullscreen mount/unmount ────────────────────────────────────────────────
  useEffect(() => {
    onEnterFullscreen?.();
    return () => onLeaveFullscreen?.();
  }, [onEnterFullscreen, onLeaveFullscreen]);

  // ── Active diets (local can differ from props while editing) ───────────────
  const [activeDietIds, setActiveDietIds] = useState<string[]>(selectedDietIds);
  useEffect(() => { setActiveDietIds(selectedDietIds); }, [selectedDietIds]);
  const activeDiets = useMemo(() => products.filter(p => activeDietIds.includes(p.id)), [products, activeDietIds]);

  // ── Matrix state: constraints per row per diet ─────────────────────────────
  const [constraints, setConstraints] = useState<Record<string, Record<string, CellConstraint>>>({});

  // Seed constraints
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
  }, [activeDietIds]);

  const [activeRows, setActiveRows] = useState<MatrixRow[]>([]);
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
  }, [activeDietIds, products]);

  const [results, setResults] = useState<Record<string, DietResult | null>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const [injMode, setInjMode] = useState<'ing' | 'nut'>('ing');
  const [injSearch, setInjSearch] = useState('');
  const [injMin, setInjMin] = useState('');
  const [injMax, setInjMax] = useState('');
  const [matrixMode, setMatrixMode] = useState<'general' | 'dynamic'>(isDynamicMatrix ? 'dynamic' : 'general');

  const [batchSizes, setBatchSizes] = useState<Record<string, number>>({});
  useEffect(() => {
    setBatchSizes(prev => {
      const next = { ...prev };
      activeDiets.forEach(d => { if (!next[d.id]) next[d.id] = 1000; });
      return next;
    });
  }, [activeDietIds]);

  const [showDietPanel, setShowDietPanel] = useState(activeDietIds.length === 0);
  const dietsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach(p => {
      const cat = p.category || 'GENERAL';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [products]);

  const updateConstraint = useCallback((rowId: string, dietId: string, field: 'min' | 'max', val: number) => {
    setConstraints(prev => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] || {}),
        [dietId]: {
          min: prev[rowId]?.[dietId]?.min ?? 0,
          max: prev[rowId]?.[dietId]?.max ?? (activeRows.find(r => r.id === rowId)?.type === 'ing' ? 100 : 999),
          injected: prev[rowId]?.[dietId]?.injected ?? false,
          ...(prev[rowId]?.[dietId] || {}),
          [field]: val,
          dirty: true,
        }
      }
    }));
    setHasRun(false);
  }, [activeRows]);

  const handleAddRow = (id: string) => {
    const min = injMin === '' ? 0 : parseFloat(injMin);
    const max = injMax === '' ? (injMode === 'ing' ? 100 : 999) : parseFloat(injMax);
    const row = injMode === 'ing' ? ingredients.find(i => i.id === id) : nutrients.find(n => n.id === id);
    if (!row) return;

    if (!activeRows.find(r => r.id === id)) {
      const newRow: MatrixRow = injMode === 'ing'
        ? { id, type: 'ing', name: row.name.toUpperCase(), price: ((row as Ingredient).price / (1 - ((row as Ingredient).shrinkage || 0) / 100)) + ((row as Ingredient).processingCost || 0) }
        : { id, type: 'nut', name: row.name.toUpperCase(), unit: (row as Nutrient).unit };
      setActiveRows(prev => [...prev, newRow]);
    }

    setConstraints(prev => {
      const next = { ...prev };
      activeDiets.forEach(diet => {
        if (!next[id]) next[id] = {};
        next[id][diet.id] = { min, max, dirty: false, injected: true };
      });
      return next;
    });

    if (onUpdateProduct) {
      activeDiets.forEach(diet => {
        const newP = { ...diet };
        if (injMode === 'ing') {
          const existing = newP.ingredientConstraints.findIndex(c => c.ingredientId === id);
          if (existing >= 0) newP.ingredientConstraints = newP.ingredientConstraints.map((c, i) => i === existing ? { ...c, min, max } : c);
          else newP.ingredientConstraints = [...newP.ingredientConstraints, { ingredientId: id, min, max }];
        } else {
          const existing = newP.constraints.findIndex(c => c.nutrientId === id);
          if (existing >= 0) newP.constraints = newP.constraints.map((c, i) => i === existing ? { ...c, min, max } : c);
          else newP.constraints = [...newP.constraints, { nutrientId: id, min, max }];
        }
        onUpdateProduct(newP);
      });
    }
    setInjSearch('');
    setHasRun(false);
  };

  const handleRemoveRow = (rowId: string, type: RowType) => {
    setActiveRows(prev => prev.filter(r => r.id !== rowId));
    setConstraints(prev => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
    if (onUpdateProduct) {
      activeDiets.forEach(diet => {
        const newP = { ...diet };
        if (type === 'ing') newP.ingredientConstraints = newP.ingredientConstraints.filter(c => c.ingredientId !== rowId);
        else newP.constraints = newP.constraints.filter(c => c.nutrientId !== rowId);
        onUpdateProduct(newP);
      });
    }
  };

  const handleRunAll = () => {
    if (activeDiets.length === 0) return;
    setIsRunning(true);
    const newResults: Record<string, DietResult> = {};

    activeDiets.forEach(diet => {
      const matrixProduct: Product = {
        ...diet,
        ingredientConstraints: activeRows
          .filter(r => r.type === 'ing' && constraints[r.id]?.[diet.id])
          .map(r => ({
            ingredientId: r.id,
            min: constraints[r.id][diet.id].min,
            max: constraints[r.id][diet.id].max
          })),
        constraints: activeRows
          .filter(r => r.type === 'nut' && constraints[r.id]?.[diet.id])
          .map(r => ({
            nutrientId: r.id,
            min: constraints[r.id][diet.id].min,
            max: constraints[r.id][diet.id].max
          }))
      };

      const batch = batchSizes[diet.id] || 1000;
      const result = solveFeedFormulation(matrixProduct, ingredients, nutrients, batch, matrixMode === 'dynamic');

      const formulaMap: Record<string, number> = {};
      result.items.forEach(item => { formulaMap[item.ingredientId] = item.percentage; });

      const nutMap: Record<string, number> = {};
      result.nutrientAnalysis.forEach(na => { nutMap[na.nutrientId] = na.value; });

      newResults[diet.id] = {
        feasible: result.status === 'OPTIMAL',
        costPerKg: batch > 0 ? result.totalCost / batch : 0,
        formula: formulaMap,
        nutrients: nutMap,
        totalCost: result.totalCost
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
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F4') {
        e.preventDefault();
        handleRunAll();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunAll]);

  const handleSaveBulk = () => {
    const successfulDiets = activeDiets.filter(diet => results[diet.id]?.feasible);
    if (successfulDiets.length === 0) {
      alert("No hay dietas optimizadas exitosamente para guardar.");
      return;
    }

    const newFormulas: SavedFormula[] = successfulDiets.map(diet => {
      const matrixProduct: Product = {
        ...diet,
        ingredientConstraints: activeRows
          .filter(r => r.type === 'ing' && constraints[r.id]?.[diet.id])
          .map(r => ({
            ingredientId: r.id,
            min: constraints[r.id][diet.id].min,
            max: constraints[r.id][diet.id].max
          })),
        constraints: activeRows
          .filter(r => r.type === 'nut' && constraints[r.id]?.[diet.id])
          .map(r => ({
            nutrientId: r.id,
            min: constraints[r.id][diet.id].min,
            max: constraints[r.id][diet.id].max
          }))
      };
      const batch = batchSizes[diet.id] || 1000;
      const result = solveFeedFormulation(matrixProduct, ingredients, nutrients, batch, matrixMode === 'dynamic');
      return {
        id: Math.random().toString(36).substr(2, 9),
        clientId: diet.clientId,
        name: diet.name.toUpperCase(),
        date: new Date().toISOString(),
        result
      };
    });

    if (setSavedFormulas) {
      setSavedFormulas((prev: any) => [...(Array.isArray(prev) ? prev : []), ...newFormulas]);
      alert(`✅ ${newFormulas.length} Dietas guardadas correctamente.`);
      onLeaveFullscreen?.();
    }
  };

  const injOptions = useMemo(() => {
    const term = injSearch.toLowerCase();
    if (!term) return [];
    if (injMode === 'ing') return ingredients.filter(i => i.name.toLowerCase().includes(term)).slice(0, 10);
    return nutrients.filter(n => n.name.toLowerCase().includes(term)).slice(0, 10);
  }, [injMode, injSearch, ingredients, nutrients]);

  const ingRows = activeRows.filter(r => r.type === 'ing');
  const nutRows = activeRows.filter(r => r.type === 'nut');
  const totalBatch = activeDiets.reduce((a, d) => a + (batchSizes[d.id] || 1000), 0);

  return (
    <div className="flex flex-col bg-black text-white h-screen overflow-hidden fixed inset-0 z-[9999]">
      {/* ═══ TOPBAR (BIG ACTIONS) ══════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-6">
          <button onClick={() => onLeaveFullscreen?.()}
            className="flex items-center gap-3 px-6 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl transition-all shadow-xl shadow-red-900/40">
            <RefreshIcon className="w-6 h-6 rotate-180" />
            <span className="text-xl font-black uppercase tracking-tighter">Volver</span>
          </button>
          <button onClick={handleSaveBulk}
            disabled={isRunning || !hasRun || !Object.values(results).some(r => r?.feasible)}
            className="flex items-center gap-3 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white rounded-xl transition-all shadow-xl shadow-emerald-900/40">
            <CheckIcon className="w-7 h-7" />
            <span className="text-xl font-black uppercase tracking-tighter">Guardar Dietas</span>
          </button>
        </div>

        <div className="text-center flex flex-col items-center">
            <span className="text-2xl font-black text-cyan-400 uppercase tracking-widest leading-none">Matriz FeedPro 360</span>
            <span className="text-[10px] text-gray-500 font-bold tracking-[0.5em] mt-1 ml-1">GRUPO DE OPTIMIZACIÓN — GIGANTE</span>
        </div>

        <button onClick={handleRunAll} disabled={isRunning || activeDiets.length === 0}
          className="flex items-center gap-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black px-10 py-5 rounded-2xl text-2xl uppercase tracking-tighter shadow-2xl shadow-indigo-900/40 transition-all active:scale-95">
          {isRunning ? <RefreshIcon className="w-8 h-8 animate-spin" /> : <CalculatorIcon className="w-8 h-8" />}
          Optimizar (F4)
        </button>
      </div>

      {/* ── INJECTOR BAR (dedicated line) ── */}
      <div className="flex items-center gap-4 px-6 py-4 bg-gray-950 border-b border-gray-800 shrink-0">
        <div className="flex rounded-xl overflow-hidden border-2 border-gray-800 shadow-inner">
          <button onClick={() => setInjMode('ing')} className={`px-4 py-2 flex items-center gap-2 ${injMode === 'ing' ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-400'}`}>
            <CubeIcon className="w-5 h-5" />
            <span className="text-xs font-black uppercase">Insumos</span>
          </button>
          <button onClick={() => setInjMode('nut')} className={`px-4 py-2 flex items-center gap-2 ${injMode === 'nut' ? 'bg-cyan-600 text-white' : 'bg-gray-900 text-gray-400'}`}>
            <BeakerIcon className="w-5 h-5" />
            <span className="text-xs font-black uppercase">Nutrientes</span>
          </button>
        </div>

        <div className="relative flex-1 group">
          <input type="text" value={injSearch} onChange={e => setInjSearch(e.target.value)}
            placeholder={injMode === 'ing' ? "BUSCAR INSUMO PARA AÑADIR..." : "BUSCAR NUTRIENTE..."}
            className="w-full bg-gray-900 border-2 border-gray-800 text-white text-lg rounded-xl px-5 py-3 outline-none focus:border-indigo-500 placeholder-gray-700 font-bold uppercase" />
          {injOptions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border-2 border-gray-700 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.8)] z-[100] overflow-hidden">
              {injOptions.map(opt => (
                <button key={opt.id} onClick={() => handleAddRow(opt.id)}
                  className="w-full text-left px-5 py-4 text-sm text-gray-100 hover:bg-indigo-600 border-b border-gray-800 transition-all flex items-center justify-between font-black uppercase">
                  <span>{opt.name}</span>
                  <span className="text-xs text-emerald-500">+ Añadir a Matriz</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <input type="number" value={injMin} onChange={e => setInjMin(e.target.value)} placeholder="MÍN"
            className="w-24 bg-gray-900 border-2 border-gray-800 text-white text-center rounded-xl py-3 font-mono font-black text-xl placeholder-gray-800" />
          <input type="number" value={injMax} onChange={e => setInjMax(e.target.value)} placeholder="MÁX"
             className="w-24 bg-gray-900 border-2 border-gray-800 text-white text-center rounded-xl py-3 font-mono font-black text-xl placeholder-gray-800" />
        </div>

        <button onClick={() => setShowDietPanel(!showDietPanel)}
          className="px-6 py-3 rounded-xl bg-gray-800 border border-gray-700 text-sm font-black uppercase tracking-widest text-white hover:bg-gray-700 flex items-center gap-3 transition-all shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
          Dietas ({activeDietIds.length})
        </button>

        <div className="bg-emerald-950/40 border border-emerald-900/50 px-4 py-2 rounded-xl shrink-0 text-center">
            <div className="text-[9px] text-emerald-600 font-black uppercase leading-none mb-1">Total Tanda</div>
            <div className="text-lg font-black font-mono text-emerald-400 leading-none">{totalBatch.toLocaleString()} KG</div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {showDietPanel && (
          <div className="w-80 shrink-0 border-r border-gray-800 bg-gray-900/95 overflow-y-auto custom-scrollbar flex flex-col z-50">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between bg-black">
              <span className="text-sm font-black text-gray-400 uppercase tracking-widest italic">Selección Dietaria</span>
              <button onClick={() => setShowDietPanel(false)} className="p-2 hover:bg-red-600/20 text-gray-600 hover:text-red-500 rounded-lg transition-all">
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 space-y-6">
              {Object.entries(dietsByCategory).map(([cat, prods]) => {
                const allSel = prods.every(p => activeDietIds.includes(p.id));
                const someSel = prods.some(p => activeDietIds.includes(p.id));
                return (
                  <div key={cat} className="space-y-2">
                    <button onClick={() => {
                        const ids = prods.map(p => p.id);
                        setActiveDietIds(prev => allSel ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])));
                      }} className="w-full flex items-center justify-between px-3 py-2 bg-gray-800/40 rounded-xl hover:bg-gray-800 transition-all border border-gray-700">
                      <span className="text-xs font-black uppercase tracking-widest">{cat}</span>
                      <div className={`w-4 h-4 rounded border ${allSel ? 'bg-emerald-500' : someSel ? 'bg-emerald-900' : 'border-gray-600'}`} />
                    </button>
                    <div className="grid grid-cols-1 gap-1">
                      {prods.map(p => (
                        <button key={p.id} onClick={() => setActiveDietIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                          className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-all border ${activeDietIds.includes(p.id) ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300' : 'bg-gray-950 border-transparent text-gray-500 hover:text-white hover:bg-gray-800'}`}>
                          {p.name.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto custom-scrollbar bg-[#020202]">
          {activeDiets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <CalculatorIcon className="w-24 h-24 mb-6 text-gray-800 animate-pulse" />
              <p className="text-gray-700 font-black uppercase tracking-widest text-xl">Selecciona dietas para comenzar la simulación</p>
            </div>
          ) : (
            <table className="border-collapse table-auto w-full">
              <thead>
                <tr className="sticky top-0 z-[40]" style={{ background: '#000' }}>
                  <th className="sticky left-0 z-[50] bg-black border-2 border-gray-800 px-6 py-6 text-left min-w-[280px] w-[280px]">
                    <span className="text-xs font-black text-gray-500 uppercase tracking-widest italic leading-none">Insumo / Referencia</span>
                  </th>
                  {activeDiets.map(diet => {
                    const res = results[diet.id];
                    return (
                      <th key={diet.id} className="border-2 border-gray-800 px-2 py-4 bg-gray-900 min-w-[200px] w-[200px]">
                        <div className="flex flex-col items-center gap-3">
                          <div className="flex items-center gap-3 w-full justify-center">
                            {res && <StatusDot ok={res.feasible} />}
                            <span className="text-sm font-black text-white uppercase italic truncate max-w-[140px] tracking-tight">{diet.name}</span>
                            <button onClick={() => { setActiveDietIds(prev => prev.filter(id => id !== diet.id)); onRemoveDietFromSelection?.(diet.id); }}
                              className="text-gray-600 hover:text-red-500 transition-colors shrink-0">
                              <XCircleIcon className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="relative w-full px-2">
                             <div className="absolute left-2 top-1.5 text-[7px] font-black text-gray-500 uppercase">Tanda KG</div>
                             <input type="number" value={batchSizes[diet.id] || 1000}
                               onChange={e => setBatchSizes(prev => ({ ...prev, [diet.id]: Number(e.target.value) }))}
                               className="w-full bg-black border border-gray-700 rounded-lg px-2 pt-3 pb-1 text-base font-black text-center font-mono text-cyan-400 outline-none focus:border-cyan-500" />
                          </div>
                          <div className="grid grid-cols-3 w-full border-t border-gray-800 mt-2 bg-black/40">
                            <span className="text-center text-[9px] font-black text-gray-600 uppercase py-2">Mín</span>
                            <span className="text-center text-[9px] font-black text-gray-600 uppercase py-2 border-x border-gray-800">Máx</span>
                            <span className={`text-center text-[9px] font-black uppercase py-2 ${res?.feasible ? 'text-emerald-500' : 'text-gray-600'}`}>Form</span>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y-4 divide-black">
                {ingRows.length > 0 && (
                  <>
                    <tr className="bg-indigo-950/20">
                      <td colSpan={activeDiets.length + 1} className="sticky left-0 z-30 px-6 py-3 border-y border-gray-800 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <CubeIcon className="w-5 h-5 text-indigo-400" />
                          <span className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em] italic">Insumos — Porcentajes de Inclusión</span>
                        </div>
                      </td>
                    </tr>
                    {ingRows.map(row => (
                      <tr key={row.id} className="hover:bg-gray-900 border-b border-gray-900 group">
                        <td className="sticky left-0 z-20 bg-[#080808] border-2 border-gray-800 px-6 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-base font-black text-white leading-tight uppercase tracking-tighter truncate">{row.name}</div>
                              {row.price !== undefined && (
                                <div className="text-xs text-gray-500 font-mono font-black mt-1">$ {row.price.toFixed(2)}/kg</div>
                              )}
                            </div>
                            <button onClick={() => handleRemoveRow(row.id, 'ing')}
                              className="text-red-700 hover:text-red-500 transition-all shrink-0 p-2 bg-red-950/10 rounded-lg">
                              <TrashIcon className="w-6 h-6" />
                            </button>
                          </div>
                        </td>
                        {activeDiets.map(diet => {
                          const con = constraints[row.id]?.[diet.id];
                          const formulaVal = results[diet.id]?.formula[row.id] ?? 0;
                          const isFeasible = results[diet.id]?.feasible !== false;
                          return (
                            <td key={diet.id} className={`border-2 border-gray-900 p-0 transition-all ${!isFeasible ? 'bg-red-950/10' : ''}`}>
                              <div className="grid grid-cols-3 divide-x-2 divide-gray-900 h-full">
                                <CellInput value={con?.min ?? ''} onChange={v => updateConstraint(row.id, diet.id, 'min', v)} dirty={con?.dirty} injected={con?.injected} />
                                <CellInput value={con && con.max < 100 ? con.max : ''} onChange={v => updateConstraint(row.id, diet.id, 'max', v)} dirty={con?.dirty} injected={con?.injected} />
                                <CellInput value={formulaVal} isResult />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                )}

                {nutRows.length > 0 && (
                  <>
                    <tr className="bg-cyan-950/20">
                      <td colSpan={activeDiets.length + 1} className="sticky left-0 z-30 px-6 py-3 border-y border-gray-800 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                          <BeakerIcon className="w-5 h-5 text-cyan-400" />
                          <span className="text-sm font-black text-cyan-400 uppercase tracking-[0.2em] italic">Nutrientes — Valores Garantizados</span>
                        </div>
                      </td>
                    </tr>
                    {nutRows.map(row => (
                      <tr key={row.id} className="hover:bg-gray-900 border-b border-gray-900 group">
                        <td className="sticky left-0 z-20 bg-[#080808] border-2 border-gray-800 px-6 py-4">
                          <div className="flex items-center justify-between gap-4">
                            <div className="min-w-0">
                              <div className="text-base font-black text-white leading-tight uppercase tracking-tighter truncate">{row.name}</div>
                              {row.unit && <div className="text-xs text-blue-500 font-mono font-black mt-1 italic">{row.unit}</div>}
                            </div>
                            <button onClick={() => handleRemoveRow(row.id, 'nut')}
                              className="text-red-700 hover:text-red-500 transition-all shrink-0 p-2 bg-red-950/10 rounded-lg">
                              <TrashIcon className="w-6 h-6" />
                            </button>
                          </div>
                        </td>
                        {activeDiets.map(diet => {
                          const con = constraints[row.id]?.[diet.id];
                          const nutVal = results[diet.id]?.nutrients[row.id] ?? 0;
                          const isWithin = con ? nutVal >= con.min - 0.001 && (nutVal <= con.max + 0.001 || con.max >= 999) : true;
                          const isFeasible = results[diet.id]?.feasible !== false;
                          return (
                            <td key={diet.id} className={`border-2 border-gray-900 p-0 transition-all ${!isFeasible ? 'bg-red-950/10' : ''}`}>
                              <div className="grid grid-cols-3 divide-x-2 divide-gray-900 h-full">
                                <CellInput value={con?.min ?? ''} onChange={v => updateConstraint(row.id, diet.id, 'min', v)} dirty={con?.dirty} injected={con?.injected} />
                                <CellInput value={con && con.max < 999 ? con.max : ''} onChange={v => updateConstraint(row.id, diet.id, 'max', v)} dirty={con?.dirty} injected={con?.injected} />
                                <CellInput value={nutVal} nutResult nutOk={isWithin || !hasRun} />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                )}

                {hasRun && (
                  <tr className="bg-emerald-950">
                    <td className="sticky left-0 z-20 bg-emerald-950 border-2 border-emerald-900 px-6 py-6">
                      <span className="text-lg font-black text-emerald-300 uppercase italic tracking-tighter leading-none">Costo Final Dieta</span>
                    </td>
                    {activeDiets.map(diet => {
                      const res = results[diet.id];
                      return (
                        <td key={diet.id} className="border-2 border-emerald-900 px-2 py-6 text-center">
                          {res?.feasible ? (
                            <div className="flex flex-col items-center">
                               <div className="text-[10px] text-emerald-600 font-bold mb-1">$/KG</div>
                               <span className="text-2xl font-black font-mono text-white tracking-tighter">${res.costPerKg.toFixed(4)}</span>
                               <span className="text-[10px] text-emerald-500 font-black mt-2">TOTAL: ${res.totalCost.toLocaleString()}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center">
                                <XCircleIcon className="w-8 h-8 text-red-500 mb-2" />
                                <span className="text-sm font-black text-red-500 uppercase">Infactible</span>
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
