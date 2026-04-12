import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Ingredient, Nutrient } from '../types';
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
  <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${ok ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
);

// ─── Cell Input (transparent, Excel-style) ──────────────────────────────────
const CellInput = ({
  value, onChange, placeholder, isResult = false, dirty = false, injected = false, nutResult = false, nutOk = true
}: {
  value: number | string; onChange?: (v: number) => void;
  placeholder?: string; isResult?: boolean; dirty?: boolean; injected?: boolean;
  nutResult?: boolean; nutOk?: boolean;
}) => {
  const [local, setLocal] = useState(value === 0 || value === '' ? '' : String(value));
  useEffect(() => { setLocal(value === 0 || value === '' ? '' : String(value)); }, [value]);

  if (isResult) {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return (
      <div className={`w-full text-center text-[11px] font-black font-mono py-1 px-1 select-none ${
        num > 0.001 ? 'text-emerald-400' : 'text-gray-700'
      }`}>
        {num > 0.001 ? num.toFixed(2) + '%' : '—'}
      </div>
    );
  }

  if (nutResult) {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    return (
      <div className={`w-full text-center text-[11px] font-black font-mono py-1 px-1 select-none ${
        !nutOk ? 'text-red-400' : num > 0 ? 'text-cyan-300' : 'text-gray-700'
      }`}>
        {num > 0 ? num.toFixed(2) : '—'}
      </div>
    );
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={local}
      onFocus={e => e.target.select()}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => {
        const parsed = parseFloat(local.replace(',', '.'));
        if (!isNaN(parsed) && onChange) onChange(parsed);
        else if (local === '' && onChange) onChange(0);
      }}
      onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
      placeholder={placeholder ?? '—'}
      style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%' }}
      className={`text-center text-[11px] font-mono py-1 px-0.5 transition-colors ${
        dirty ? 'text-yellow-300 placeholder-yellow-900 bg-yellow-500/10' :
        injected ? 'text-blue-300' :
        'text-gray-300 placeholder-gray-700'
      } focus:text-white focus:bg-blue-500/10`}
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
  // Structure: constraints[rowId][dietId] = CellConstraint
  const [constraints, setConstraints] = useState<Record<string, Record<string, CellConstraint>>>({});

  // Seed constraints from product data when diet selection changes
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

  // ── Active rows (ingredients + nutrients with any constraint across diets) ──
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
        id: i.id, type: 'ing' as RowType, name: i.name,
        price: (i.price / (1 - (i.shrinkage || 0) / 100)) + (i.processingCost || 0)
      })),
      ...nutrients.filter(n => nutIds.has(n.id)).map(n => ({
        id: n.id, type: 'nut' as RowType, name: n.name, unit: n.unit
      }))
    ];
    setActiveRows(rows);
  }, [activeDietIds, products]);

  // ── Solver results ─────────────────────────────────────────────────────────
  const [results, setResults] = useState<Record<string, DietResult | null>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  // ── Injector state ─────────────────────────────────────────────────────────
  const [injMode, setInjMode] = useState<'ing' | 'nut'>('ing');
  const [injSearch, setInjSearch] = useState('');
  const [injMin, setInjMin] = useState('');
  const [injMax, setInjMax] = useState('');
  const [matrixMode, setMatrixMode] = useState<'general' | 'dynamic'>(isDynamicMatrix ? 'dynamic' : 'general');

  // ── Batch sizes ────────────────────────────────────────────────────────────
  const [batchSizes, setBatchSizes] = useState<Record<string, number>>({});
  useEffect(() => {
    setBatchSizes(prev => {
      const next = { ...prev };
      activeDiets.forEach(d => { if (!next[d.id]) next[d.id] = 1000; });
      return next;
    });
  }, [activeDietIds]);

  // ── Diet selection panel ───────────────────────────────────────────────────
  const [showDietPanel, setShowDietPanel] = useState(activeDietIds.length === 0);
  const dietsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach(p => {
      const cat = p.category || 'General';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [products]);

  // ── Constraint update helper ───────────────────────────────────────────────
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

  // ── Add row via injector ───────────────────────────────────────────────────
  const handleAddRow = (id: string) => {
    const min = injMin === '' ? 0 : parseFloat(injMin);
    const max = injMax === '' ? (injMode === 'ing' ? 100 : 999) : parseFloat(injMax);

    // Add row if it doesn't exist
    const row = injMode === 'ing'
      ? ingredients.find(i => i.id === id)
      : nutrients.find(n => n.id === id);
    if (!row) return;

    if (!activeRows.find(r => r.id === id)) {
      const newRow: MatrixRow = injMode === 'ing'
        ? { id, type: 'ing', name: row.name, price: ((row as Ingredient).price / (1 - ((row as Ingredient).shrinkage || 0) / 100)) + ((row as Ingredient).processingCost || 0) }
        : { id, type: 'nut', name: row.name, unit: (row as Nutrient).unit };
      setActiveRows(prev => [...prev, newRow]);
    }

    // Set constraint for all active diets
    setConstraints(prev => {
      const next = { ...prev };
      activeDiets.forEach(diet => {
        if (!next[id]) next[id] = {};
        next[id][diet.id] = { min, max, dirty: false, injected: true };
      });
      return next;
    });

    // Also persist to product (optional but keeps data in sync)
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

  // ── Remove row ─────────────────────────────────────────────────────────────
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

  // ── F4 Optimization ────────────────────────────────────────────────────────
  const handleRunAll = () => {
    if (activeDiets.length === 0) return;
    setIsRunning(true);

    const newResults: Record<string, DietResult> = {};

    activeDiets.forEach(diet => {
      // Build a product with current matrix constraints
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
    // Clear dirty flags
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

  // ── Global Keyboard Shortcuts ──
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

  // ── Injector options ───────────────────────────────────────────────────────
  const injOptions = useMemo(() => {
    const term = injSearch.toLowerCase();
    if (!term) return [];
    if (injMode === 'ing') return ingredients.filter(i => i.name.toLowerCase().includes(term)).slice(0, 8);
    return nutrients.filter(n => n.name.toLowerCase().includes(term)).slice(0, 8);
  }, [injMode, injSearch, ingredients, nutrients]);

  const ingRows = activeRows.filter(r => r.type === 'ing');
  const nutRows = activeRows.filter(r => r.type === 'nut');
  const totalBatch = activeDiets.reduce((a, d) => a + (batchSizes[d.id] || 1000), 0);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col bg-gray-950 text-white overflow-hidden"
      style={{ position: 'fixed', inset: 0, zIndex: 9999 }}
    >
      {/* ═══ TOPBAR ══════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 shrink-0">

        {/* Brand & Exit */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onLeaveFullscreen?.()}
            className="flex items-center gap-1.5 px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition-all text-[10px] font-black uppercase tracking-widest border border-gray-700"
          >
            <RefreshIcon className="w-3 h-3 rotate-180" />
            Volver
          </button>
          <div className="w-px h-4 bg-gray-800 mx-1" />
          <span className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em]">
            Optimización Grupal
          </span>
        </div>

        <div className="w-px h-4 bg-gray-800 shrink-0" />

        {/* Diet selector toggle */}
        <button
          onClick={() => setShowDietPanel(!showDietPanel)}
          className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-300"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
          Dietas ({activeDietIds.length})
        </button>

        <div className="w-px h-4 bg-gray-800 shrink-0" />

        {/* Toggles */}
        <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
          <span className={`text-[9px] font-black uppercase ${matrixMode === 'dynamic' ? 'text-indigo-400' : 'text-gray-600'}`}>Din.</span>
          <button onClick={() => setMatrixMode(m => m === 'dynamic' ? 'general' : 'dynamic')}
            className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-colors ${matrixMode === 'dynamic' ? 'bg-indigo-500' : 'bg-gray-700'}`}>
            <span className={`inline-block h-2.5 w-2.5 rounded-full bg-white transition-transform ${matrixMode === 'dynamic' ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
          </button>
        </label>

        <div className="w-px h-4 bg-gray-800 shrink-0" />

        {/* ── INJECTOR ── */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="flex rounded-lg overflow-hidden border border-gray-700 shrink-0">
            <button onClick={() => setInjMode('ing')}
              className={`px-2 py-1 text-[9px] font-black uppercase transition-all ${injMode === 'ing' ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}>
              <CubeIcon className="w-3 h-3 inline" />
            </button>
            <button onClick={() => setInjMode('nut')}
              className={`px-2 py-1 text-[9px] font-black uppercase transition-all ${injMode === 'nut' ? 'bg-cyan-600 text-white' : 'bg-gray-900 text-gray-500 hover:text-gray-300'}`}>
              <BeakerIcon className="w-3 h-3 inline" />
            </button>
          </div>
          <div className="relative flex-1 min-w-0">
            <input
              type="text"
              value={injSearch}
              onChange={e => setInjSearch(e.target.value)}
              placeholder={injMode === 'ing' ? '+ Añadir insumo a la matriz...' : '+ Añadir nutriente a la matriz...'}
              className="w-full bg-gray-800 border border-gray-700 text-white text-[11px] rounded-lg px-3 py-1.5 outline-none placeholder-gray-600 focus:border-indigo-500 transition-colors"
            />
            {injOptions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-xl shadow-2xl z-50 overflow-hidden">
                {injOptions.map(opt => (
                  <button key={opt.id} onClick={() => handleAddRow(opt.id)}
                    className="w-full text-left px-3 py-2 text-[11px] text-gray-200 hover:bg-indigo-700 transition-colors flex items-center justify-between group">
                    <span className="font-bold truncate">{opt.name}</span>
                    {'price' in opt && <span className="text-[9px] text-gray-500 font-mono shrink-0 ml-2">${((opt as Ingredient).price || 0).toFixed(2)}/kg</span>}
                    <span className="text-[9px] bg-emerald-600 text-white font-black px-1.5 py-0.5 rounded-full ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">+ Add</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <input type="number" value={injMin} onChange={e => setInjMin(e.target.value)} placeholder="Mín"
            className="w-14 bg-gray-800 border border-gray-700 text-white text-[10px] text-center rounded-lg px-1 py-1.5 outline-none font-mono focus:border-indigo-500 transition-colors shrink-0" />
          <span className="text-gray-700 text-[10px] shrink-0">—</span>
          <input type="number" value={injMax} onChange={e => setInjMax(e.target.value)} placeholder="Máx"
            className="w-14 bg-gray-800 border border-gray-700 text-white text-[10px] text-center rounded-lg px-1 py-1.5 outline-none font-mono focus:border-indigo-500 transition-colors shrink-0" />
        </div>

        <div className="w-px h-4 bg-gray-800 shrink-0" />

        {/* Mass / status */}
        <span className="text-[10px] font-mono text-emerald-500 font-black shrink-0">{totalBatch.toLocaleString()} kg</span>

        {/* F4 Button */}
        <button
          onClick={handleRunAll}
          disabled={isRunning || activeDiets.length === 0}
          className="flex items-center gap-2 bg-gradient-to-r from-emerald-700 to-cyan-700 hover:from-emerald-600 hover:to-cyan-600 disabled:opacity-40 text-white font-black px-4 py-2 rounded-lg text-[11px] uppercase tracking-wider shadow-xl transition-all hover:scale-[1.02] active:scale-95 shrink-0"
        >
          {isRunning
            ? <RefreshIcon className="w-4 h-4 animate-spin" />
            : <CalculatorIcon className="w-4 h-4" />}
          F4 Optimizar
        </button>
      </div>

      {/* ═══ BODY ════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Diet Selection Drawer ── */}
        {showDietPanel && (
          <div className="w-52 shrink-0 border-r border-gray-800 bg-gray-900/80 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Seleccionar Dietas</span>
              <button 
                onClick={() => setShowDietPanel(false)} 
                className="p-1 hover:bg-gray-800 rounded-lg text-gray-600 hover:text-red-400 transition-all"
                title="Cerrar panel"
              >
                <XCircleIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 flex-1">
              {Object.entries(dietsByCategory).map(([cat, prods]) => {
                const allSel = prods.every(p => activeDietIds.includes(p.id));
                const someSel = prods.some(p => activeDietIds.includes(p.id));
                return (
                  <div key={cat} className="mb-1.5">
                    <button
                      onClick={() => {
                        const ids = prods.map(p => p.id);
                        setActiveDietIds(prev =>
                          allSel ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))
                        );
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors group"
                    >
                      <div className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${allSel ? 'bg-emerald-500 border-emerald-500' : someSel ? 'bg-emerald-900 border-emerald-500' : 'border-gray-700'}`}>
                        {(allSel || someSel) && <CheckIcon className="w-2 h-2 text-white" />}
                      </div>
                      <span className="text-[10px] font-black text-gray-300 uppercase truncate">{cat}</span>
                      <span className="ml-auto text-[9px] text-gray-600">{prods.filter(p => activeDietIds.includes(p.id)).length}/{prods.length}</span>
                    </button>
                    <div className="ml-3 space-y-0.5">
                      {prods.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setActiveDietIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                          className={`w-full flex items-center gap-2 px-2 py-1 rounded-lg transition-colors text-left ${activeDietIds.includes(p.id) ? 'text-emerald-300 bg-emerald-500/10' : 'text-gray-500 hover:text-gray-200 hover:bg-gray-800/40'}`}
                        >
                          <div className={`w-2 h-2 rounded-full shrink-0 ${activeDietIds.includes(p.id) ? 'bg-emerald-500' : 'bg-gray-700'}`} />
                          <span className="text-[10px] font-bold truncate">{p.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── THE MATRIX ── */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {activeDiets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
              <CalculatorIcon className="w-16 h-16 mb-4 text-gray-700" />
              <p className="text-gray-500 font-black uppercase tracking-widest text-sm">Abre el panel de dietas y selecciona las dietas a optimizar</p>
            </div>
          ) : (
            <table className="table-fixed border-collapse text-xs w-full">
              {/* ── HEADER ── */}
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 30 }}>
                  {/* Sticky label col header */}
                  <th style={{ position: 'sticky', left: 0, zIndex: 40, background: '#111827', minWidth: 180, maxWidth: 180 }}
                    className="border border-gray-700 px-2 py-2 text-left">
                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Parámetro / Costo</span>
                  </th>
                  {activeDiets.map(diet => {
                    const res = results[diet.id];
                    return (
                      <th key={diet.id} className="border border-gray-700 px-1 text-center bg-gray-900" style={{ minWidth: 168 }}>
                        <div className="flex flex-col items-center gap-1 py-1.5">
                          <div className="flex items-center gap-1.5 w-full justify-center">
                            {res && <StatusDot ok={res.feasible} />}
                            <span className="text-[9px] font-black text-gray-300 uppercase truncate max-w-[110px]">{diet.name}</span>
                            <button onClick={() => { setActiveDietIds(prev => prev.filter(id => id !== diet.id)); onRemoveDietFromSelection?.(diet.id); }}
                              className="text-gray-600 hover:text-red-400 transition-colors shrink-0">
                              <XCircleIcon className="w-3 h-3" />
                            </button>
                          </div>
                          {/* Batch size */}
                          <input type="number" value={batchSizes[diet.id] || 1000}
                            onChange={e => setBatchSizes(prev => ({ ...prev, [diet.id]: Number(e.target.value) }))}
                            className="w-20 bg-gray-800 border border-gray-700 rounded px-1 py-0.5 text-[9px] text-center font-mono text-cyan-400 outline-none hover:border-cyan-500/40 focus:border-cyan-500 transition-colors" />
                          {/* Sub-column headers */}
                          <div className="grid grid-cols-3 w-full border-t border-gray-700 mt-1 pt-1">
                            <span className="text-center text-[8px] text-gray-600 font-black uppercase">Mín</span>
                            <span className="text-center text-[8px] text-gray-600 font-black uppercase border-x border-gray-700">Máx</span>
                            <span className={`text-center text-[8px] font-black uppercase ${res?.feasible ? 'text-emerald-600' : 'text-gray-700'}`}>Fórmula</span>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              <tbody>
                {/* ── INSUMOS SECTION ── */}
                {ingRows.length > 0 && (
                  <>
                    <tr className="bg-indigo-950/30">
                      <td colSpan={activeDiets.length + 1} className="sticky left-0 px-3 py-1 border-y border-gray-800">
                        <div className="flex items-center gap-2">
                          <CubeIcon className="w-3 h-3 text-indigo-400 shrink-0" />
                          <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Insumos — Inclusión %</span>
                        </div>
                      </td>
                    </tr>
                    {ingRows.map(row => (
                      <tr key={row.id} className="hover:bg-gray-900/60 transition-colors group border-b border-gray-800/30">
                        <td style={{ position: 'sticky', left: 0, zIndex: 20, background: '#0a0f1a', minWidth: 180, maxWidth: 180 }}
                          className="border border-gray-700 px-2 py-1">
                          <div className="flex items-center justify-between gap-1">
                            <div className="min-w-0">
                              <div className="text-[10px] font-bold text-gray-200 truncate leading-tight">{row.name}</div>
                              {row.price !== undefined && (
                                <div className="text-[9px] text-gray-500 font-mono leading-none mt-0.5">${row.price.toFixed(2)}/kg</div>
                              )}
                            </div>
                            <button onClick={() => handleRemoveRow(row.id, 'ing')}
                              className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-400 transition-all shrink-0">
                              <TrashIcon className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        {activeDiets.map(diet => {
                          const con = constraints[row.id]?.[diet.id];
                          const formulaVal = results[diet.id]?.formula[row.id] ?? 0;
                          const isFeasible = results[diet.id]?.feasible !== false;
                          return (
                            <td key={diet.id} className={`border border-gray-700 p-0 transition-colors ${!isFeasible ? 'bg-red-500/5' : ''}`} style={{ minWidth: 168 }}>
                              <div className="grid grid-cols-3 divide-x divide-gray-700 h-full">
                                <CellInput
                                  value={con?.min ?? ''}
                                  onChange={v => updateConstraint(row.id, diet.id, 'min', v)}
                                  placeholder="0"
                                  dirty={con?.dirty}
                                  injected={con?.injected}
                                />
                                <CellInput
                                  value={con && con.max < 100 ? con.max : ''}
                                  onChange={v => updateConstraint(row.id, diet.id, 'max', v)}
                                  placeholder="100"
                                  dirty={con?.dirty}
                                  injected={con?.injected}
                                />
                                <CellInput value={formulaVal} isResult />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                )}

                {/* ── NUTRIENTES SECTION ── */}
                {nutRows.length > 0 && (
                  <>
                    <tr className="bg-cyan-950/30">
                      <td colSpan={activeDiets.length + 1} className="sticky left-0 px-3 py-1 border-y border-gray-800">
                        <div className="flex items-center gap-2">
                          <BeakerIcon className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span className="text-[9px] font-black text-cyan-400 uppercase tracking-widest">Nutrientes — Requerimientos</span>
                        </div>
                      </td>
                    </tr>
                    {nutRows.map(row => (
                      <tr key={row.id} className="hover:bg-gray-900/60 transition-colors group border-b border-gray-800/30">
                        <td style={{ position: 'sticky', left: 0, zIndex: 20, background: '#0a0f1a', minWidth: 180, maxWidth: 180 }}
                          className="border border-gray-700 px-2 py-1">
                          <div className="flex items-center justify-between gap-1">
                            <div className="min-w-0">
                              <div className="text-[10px] font-bold text-gray-200 truncate leading-tight">{row.name}</div>
                              {row.unit && <div className="text-[9px] text-gray-500 font-mono leading-none mt-0.5">{row.unit}</div>}
                            </div>
                            <button onClick={() => handleRemoveRow(row.id, 'nut')}
                              className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-400 transition-all shrink-0">
                              <TrashIcon className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                        {activeDiets.map(diet => {
                          const con = constraints[row.id]?.[diet.id];
                          const nutVal = results[diet.id]?.nutrients[row.id] ?? 0;
                          const isWithin = con
                            ? nutVal >= con.min - 0.001 && (nutVal <= con.max + 0.001 || con.max >= 999)
                            : true;
                          const isFeasible = results[diet.id]?.feasible !== false;
                          return (
                            <td key={diet.id} className={`border p-0 transition-colors ${
                              !isWithin && hasRun ? 'border-red-600 bg-red-950/20' : 
                              !isFeasible ? 'bg-red-500/5 border-gray-700' : 'border-gray-700'
                            }`} style={{ minWidth: 168 }}>
                              <div className="grid grid-cols-3 divide-x divide-gray-700 h-full">
                                <CellInput
                                  value={con?.min ?? ''}
                                  onChange={v => updateConstraint(row.id, diet.id, 'min', v)}
                                  placeholder="0"
                                  dirty={con?.dirty}
                                  injected={con?.injected}
                                />
                                <CellInput
                                  value={con && con.max < 999 ? con.max : ''}
                                  onChange={v => updateConstraint(row.id, diet.id, 'max', v)}
                                  placeholder="MAX"
                                  dirty={con?.dirty}
                                  injected={con?.injected}
                                />
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
                  <tr style={{ background: '#052e16' }}>
                    <td style={{ position: 'sticky', left: 0, zIndex: 20, background: '#052e16', minWidth: 180 }}
                      className="border border-emerald-900 px-2 py-2">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">$/kg · Total</span>
                    </td>
                    {activeDiets.map(diet => {
                      const res = results[diet.id];
                      return (
                        <td key={diet.id} className="border border-emerald-900/50 px-1 py-2 text-center" style={{ minWidth: 168 }}>
                          {res?.feasible ? (
                            <div className="flex flex-col items-center">
                              <span className="text-[14px] font-black font-mono text-emerald-400">${res.costPerKg.toFixed(4)}</span>
                              <span className="text-[9px] text-gray-600 font-mono">${res.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-red-500 uppercase">INFACTIBLE</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}

                {/* Empty state */}
                {ingRows.length === 0 && nutRows.length === 0 && (
                  <tr>
                    <td colSpan={activeDiets.length + 1} className="py-16 text-center">
                      <p className="text-[11px] text-gray-700 font-bold uppercase tracking-widest">
                        Usa el inyector superior para añadir insumos o nutrientes a la matriz
                      </p>
                    </td>
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
