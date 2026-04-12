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

// ─── Small components ─────────────────────────────────────────────────────────
const StatusDot = ({ ok }: { ok: boolean }) => (
  <span className={`inline-block w-3 h-3 rounded-full shrink-0 ${ok ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500 animate-pulse'}`} />
);

// ─── Cell Input (PROFESIONAL, Excel-style) ──────────────────────────────────
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

  // ── 1. GLOBAL SHORTCUTS (Level Superior) ───────────────────────────────────
  const handleRunAll = useCallback(() => {
    if (activeDietIds.length === 0) return;
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
        costPerKg: batch > 0 ? (result.totalCost / batch) : 0,
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
  }, [activeDiets, activeRows, constraints, batchSizes, ingredients, nutrients, matrixMode, setIsDirty]);

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

  // ── 2. STATE ──────────────────────────────────────────────────────────────
  useEffect(() => {
    onEnterFullscreen?.();
    return () => onLeaveFullscreen?.();
  }, [onEnterFullscreen, onLeaveFullscreen]);

  const [activeDietIds, setActiveDietIds] = useState<string[]>(selectedDietIds);
  useEffect(() => { setActiveDietIds(selectedDietIds); }, [selectedDietIds]);
  const activeDiets = useMemo(() => products.filter(p => activeDietIds.includes(p.id)), [products, activeDietIds]);

  const [constraints, setConstraints] = useState<Record<string, Record<string, CellConstraint>>>({});
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
  }, [activeDietIds, products, ingredients, nutrients]);

  const [results, setResults] = useState<Record<string, DietResult | null>>({});
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [injMode, setInjMode] = useState<'ing' | 'nut'>('ing');
  const [injSearch, setInjSearch] = useState('');
  const [injMin, setInjMin] = useState('');
  const [injMax, setInjMax] = useState('');
  const [matrixMode, setMatrixMode] = useState<'general' | 'dynamic'>(isDynamicMatrix ? 'dynamic' : 'general');
  const [batchSizes, setBatchSizes] = useState<Record<string, number>>({});
  const [showDietPanel, setShowDietPanel] = useState(activeDietIds.length === 0);

  useEffect(() => {
    setBatchSizes(prev => {
      const next = { ...prev };
      activeDiets.forEach(d => { if (!next[d.id]) next[d.id] = 1000; });
      return next;
    });
  }, [activeDiets]);

  const dietsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    products.forEach(p => {
      const cat = p.category || 'GENERAL';
      if (!map[cat]) map[cat] = [];
      map[cat].push(p);
    });
    return map;
  }, [products]);

  // ── 3. ACTIONS ───────────────────────────────────────────────────────────
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
    setInjSearch('');
    setHasRun(false);
  };

  const handleRemoveRow = (rowId: string) => {
    setActiveRows(prev => prev.filter(r => r.id !== rowId));
    setConstraints(prev => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

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
      const result = solveFeedFormulation(matrixProduct, ingredients, nutrients, batchSizes[diet.id] || 1000, matrixMode === 'dynamic');
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
    if (term.length < 2) return [];
    if (injMode === 'ing') return ingredients.filter(i => i.name.toLowerCase().includes(term)).slice(0, 10);
    return nutrients.filter(n => n.name.toLowerCase().includes(term)).slice(0, 10);
  }, [injMode, injSearch, ingredients, nutrients]);

  // ── 4. RENDER ────────────────────────────────────────────────────────────
  const ingRows = activeRows.filter(r => r.type === 'ing');
  const nutRows = activeRows.filter(r => r.type === 'nut');

  return (
    <div className="flex flex-col bg-black text-white h-screen overflow-hidden fixed inset-0 z-[9999]">
      
      {/* ═══ TOPBAR (LIMPIO Y FIJO) ═════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-6 h-[70px] bg-gray-900 border-b-2 border-gray-800 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => onLeaveFullscreen?.()}
            className="flex items-center gap-2 px-6 py-3 bg-red-700 hover:bg-red-600 text-white rounded-xl transition-all font-black uppercase tracking-tighter text-sm shadow-xl">
            <RefreshIcon className="w-5 h-5 rotate-180" />
            Volver
          </button>
          <button onClick={handleSaveBulk}
            disabled={isRunning || !hasRun || !Object.values(results).some(r => r?.feasible)}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-xl transition-all font-black uppercase tracking-tighter text-sm shadow-xl">
            <CheckIcon className="w-5 h-5" />
            Guardar Dietas
          </button>
        </div>

        <div className="flex flex-col items-center">
            <span className="text-xl font-black text-cyan-400 uppercase tracking-widest leading-none">MATRIZ FEEDPRO 360</span>
            <span className="text-[10px] text-gray-500 font-bold tracking-[0.4em] mt-1">GRUPO DE OPTIMIZACIÓN MULTI-DIETA</span>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => setShowDietPanel(!showDietPanel)}
            className="flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl transition-all font-black uppercase text-xs border border-gray-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
            Dietas ({activeDietIds.length})
          </button>
          <button onClick={handleRunAll} disabled={isRunning || activeDiets.length === 0}
            className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black px-8 py-3 rounded-xl text-lg uppercase shadow-2xl transition-all active:scale-95">
            {isRunning ? <RefreshIcon className="w-6 h-6 animate-spin" /> : <CalculatorIcon className="w-6 h-6" />}
            Optimizar (F4)
          </button>
        </div>
      </div>

      {/* ── BARRA DE INYECCIÓN (COMBOBOX) ── */}
      <div className="flex items-center gap-4 px-6 h-[60px] bg-gray-950 border-b border-gray-800 shrink-0 z-40">
        <div className="flex h-10 rounded-xl overflow-hidden border border-gray-800">
          <button onClick={() => setInjMode('ing')} className={`px-4 flex items-center gap-2 font-black text-[10px] uppercase ${injMode === 'ing' ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}>
            <CubeIcon className="w-4 h-4" /> Insumos
          </button>
          <button onClick={() => setInjMode('nut')} className={`px-4 flex items-center gap-2 font-black text-[10px] uppercase ${injMode === 'nut' ? 'bg-cyan-600 text-white' : 'bg-gray-900 text-gray-500 hover:bg-gray-800'}`}>
            <BeakerIcon className="w-4 h-4" /> Nutrientes
          </button>
        </div>

        <div className="relative flex-1 max-w-md">
          <div className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-xl px-4 h-10 group focus-within:border-indigo-500 transition-all">
            <input type="text" value={injSearch} onChange={e => setInjSearch(e.target.value)}
              placeholder={injMode === 'ing' ? "Escribe 2 letras para buscar insumo..." : "Escribe nutriente..."}
              className="w-full bg-transparent text-white text-sm outline-none placeholder-gray-700 font-bold uppercase" />
          </div>
          {injOptions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border-2 border-gray-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-[100] overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar">
              {injOptions.map(opt => (
                <button key={opt.id} onClick={() => handleAddRow(opt.id)}
                  className="w-full text-left px-5 py-4 text-xs text-gray-100 hover:bg-indigo-600 border-b border-gray-800 transition-all flex items-center justify-between font-black uppercase group">
                  <span>{opt.name}</span>
                  <span className="text-[9px] bg-emerald-600 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100">+ Añadir</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <div className="flex flex-col">
            <span className="text-[8px] text-gray-600 font-black uppercase mb-0.5 ml-1">Mín</span>
            <input type="number" value={injMin} onChange={e => setInjMin(e.target.value)}
              className="w-20 h-8 bg-gray-900 border border-gray-800 text-white text-center rounded-lg font-mono font-black text-sm" />
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] text-gray-600 font-black uppercase mb-0.5 ml-1">Máx</span>
            <input type="number" value={injMax} onChange={e => setInjMax(e.target.value)}
              className="w-20 h-8 bg-gray-900 border border-gray-800 text-white text-center rounded-lg font-mono font-black text-sm" />
          </div>
        </div>

        <div className="w-px h-8 bg-gray-800 mx-2" />

        <div className="flex flex-col items-center px-4 py-1 bg-emerald-950/30 rounded-xl border border-emerald-900/50">
            <span className="text-[9px] text-emerald-600 font-black uppercase leading-tight">Total Selección</span>
            <span className="text-sm font-black font-mono text-emerald-400">{activeDiets.reduce((a,d) => a + (batchSizes[d.id]||1000), 0).toLocaleString()} KG</span>
        </div>
      </div>

      {/* ── CUERPO (TABLA CON SCROLL) ── */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Panel Lateral de Dietas */}
        {showDietPanel && (
          <div className="w-72 shrink-0 border-r border-gray-800 bg-gray-950 overflow-y-auto custom-scrollbar flex flex-col z-30">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between bg-black">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">DIETAS ACTIVAS</span>
              <button onClick={() => setShowDietPanel(false)} className="p-1.5 hover:bg-gray-800 text-gray-600 rounded-lg">
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {Object.entries(dietsByCategory).map(([cat, prods]) => {
                const allSel = prods.every(p => activeDietIds.includes(p.id));
                return (
                  <div key={cat} className="space-y-1">
                    <button onClick={() => {
                        const ids = prods.map(p => p.id);
                        setActiveDietIds(prev => allSel ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids])));
                      }} className="w-full flex items-center justify-between px-3 py-2 bg-gray-900/50 rounded-xl hover:bg-gray-800 transition-all border border-gray-800">
                      <span className="text-[10px] font-black uppercase">{cat}</span>
                      <div className={`w-3.5 h-3.5 rounded border-2 ${allSel ? 'bg-emerald-500 border-emerald-500' : 'border-gray-700'}`} />
                    </button>
                    <div className="flex flex-col gap-1 mt-1 pl-2">
                      {prods.map(p => (
                        <button key={p.id} onClick={() => setActiveDietIds(prev => prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id])}
                          className={`w-full text-left px-3 py-2.5 rounded-xl text-[12px] font-bold transition-all ${activeDietIds.includes(p.id) ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-900/40' : 'text-gray-500 hover:text-gray-200'}`}>
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

        {/* CONTENEDOR DE LA MATRIZ */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-black p-4">
          {activeDiets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30">
                <CalculatorIcon className="w-20 h-20 mb-4 text-gray-800" />
                <p className="font-black uppercase tracking-widest text-lg">Selecciona dietas en el panel izquierdo</p>
            </div>
          ) : (
            <table className="border-collapse table-fixed">
              <thead>
                <tr className="sticky top-0 z-[35]" style={{ background: '#000' }}>
                  <th className="sticky left-0 z-[40] bg-black border-2 border-gray-800 px-5 py-4 text-left w-[240px] min-w-[240px]">
                    <span className="text-[11px] font-black text-gray-600 uppercase tracking-widest italic">Parámetro / Requerimiento</span>
                  </th>
                  {activeDiets.map(diet => {
                    const res = results[diet.id];
                    return (
                      <th key={diet.id} className="border-2 border-gray-800 px-1 py-4 bg-gray-900 w-[180px] min-w-[180px]">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2 w-full justify-center px-2">
                             {res && <StatusDot ok={res.feasible} />}
                             <span className="text-xs font-black text-white uppercase italic truncate tracking-tight">{diet.name}</span>
                             <button onClick={() => { setActiveDietIds(prev => prev.filter(id => id !== diet.id)); onRemoveDietFromSelection?.(diet.id); }}
                               className="text-gray-700 hover:text-red-500 transition-colors">
                               <XCircleIcon className="w-4 h-4" />
                             </button>
                          </div>
                          <div className="w-full px-3">
                             <input type="number" value={batchSizes[diet.id] || 1000}
                               onChange={e => setBatchSizes(prev => ({ ...prev, [diet.id]: Number(e.target.value) }))}
                               className="w-full bg-black border border-gray-800 rounded-lg px-2 py-1 text-[11px] text-center font-black font-mono text-cyan-400 outline-none focus:border-cyan-500" />
                          </div>
                          <div className="grid grid-cols-3 w-full border-t border-gray-800 mt-2 bg-black/40">
                             <span className="text-center text-[9px] font-black text-gray-600 uppercase py-2">Mín</span>
                             <span className="text-center text-[9px] font-black text-gray-600 uppercase py-2 border-x border-gray-800">Máx</span>
                             <span className={`text-center text-[9px] font-black uppercase py-2 ${res?.feasible ? 'text-emerald-500' : 'text-gray-600'}`}>Form %</span>
                          </div>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-900">
                {/* SECCIÓN INSUMOS */}
                {ingRows.length > 0 && (
                  <>
                    <tr className="bg-indigo-950/20">
                      <td colSpan={activeDiets.length + 1} className="sticky left-0 z-[25] px-6 py-2 border-y border-gray-800 bg-gray-950/80 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                          <CubeIcon className="w-4 h-4 text-indigo-400" />
                          <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest italic">Insumos — Límites de Inclusión</span>
                        </div>
                      </td>
                    </tr>
                    {ingRows.map(row => (
                      <tr key={row.id} className="hover:bg-gray-900 group">
                        <td className="sticky left-0 z-[20] bg-black border border-gray-800 px-5 py-3">
                          <div className="flex items-center justify-between gap-3 overflow-hidden">
                             <div className="min-w-0">
                                <span className="text-[13px] font-black text-gray-200 uppercase truncate block tracking-tighter">{row.name}</span>
                                {row.price !== undefined && <span className="text-[10px] text-gray-600 font-mono italic">$ {row.price.toFixed(2)}/kg</span>}
                             </div>
                             <button onClick={() => handleRemoveRow(row.id)} className="text-gray-800 hover:text-red-500 p-1.5 rounded-lg bg-red-950/10 transition-all opacity-0 group-hover:opacity-100">
                                <TrashIcon className="w-4 h-4" />
                             </button>
                          </div>
                        </td>
                        {activeDiets.map(diet => {
                          const con = constraints[row.id]?.[diet.id];
                          const formulaVal = results[diet.id]?.formula[row.id] ?? 0;
                          return (
                            <td key={diet.id} className="border border-gray-900 transition-all p-0">
                               <div className="grid grid-cols-3 divide-x divide-gray-900 h-full">
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

                {/* SECCIÓN NUTRIENTES */}
                {nutRows.length > 0 && (
                  <>
                    <tr className="bg-cyan-950/20">
                      <td colSpan={activeDiets.length + 1} className="sticky left-0 z-[25] px-6 py-2 border-y border-gray-800 bg-gray-950/80 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                          <BeakerIcon className="w-4 h-4 text-cyan-400" />
                          <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest italic">Nutrientes — Requerimientos Técnicos</span>
                        </div>
                      </td>
                    </tr>
                    {nutRows.map(row => (
                      <tr key={row.id} className="hover:bg-gray-900 group">
                        <td className="sticky left-0 z-[20] bg-black border border-gray-800 px-5 py-3">
                          <div className="flex items-center justify-between gap-3 overflow-hidden">
                             <div className="min-w-0">
                                <span className="text-[13px] font-black text-gray-200 uppercase truncate block tracking-tighter">{row.name}</span>
                                {row.unit && <span className="text-[10px] text-gray-600 font-mono italic">{row.unit}</span>}
                             </div>
                             <button onClick={() => handleRemoveRow(row.id)} className="text-gray-800 hover:text-red-500 p-1.5 rounded-lg bg-red-950/10 transition-all opacity-0 group-hover:opacity-100">
                                <TrashIcon className="w-4 h-4" />
                             </button>
                          </div>
                        </td>
                        {activeDiets.map(diet => {
                          const con = constraints[row.id]?.[diet.id];
                          const nutVal = results[diet.id]?.nutrients[row.id] ?? 0;
                          const isWithin = con ? nutVal >= (con.min - 0.001) && (nutVal <= (con.max + 0.001) || con.max >= 999) : true;
                          return (
                            <td key={diet.id} className="border border-gray-900 transition-all p-0">
                               <div className="grid grid-cols-3 divide-x divide-gray-900 h-full">
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

                {/* FILA DE TOTALES / COSTOS */}
                {hasRun && (
                  <tr className="bg-emerald-950/50">
                    <td className="sticky left-0 z-[20] bg-emerald-950 border-2 border-emerald-900 px-6 py-4">
                      <span className="text-[14px] font-black text-emerald-300 uppercase italic leading-none">Costo Dieta ($/KG)</span>
                    </td>
                    {activeDiets.map(diet => {
                      const res = results[diet.id];
                      return (
                        <td key={diet.id} className="border-2 border-emerald-900 px-2 py-4 text-center">
                          {res?.feasible ? (
                            <div className="flex flex-col items-center">
                               <span className="text-xl font-black font-mono text-white leading-none">${res.costPerKg.toFixed(2)}</span>
                               <span className="text-[10px] text-emerald-500 font-black mt-1.5 uppercase tracking-tighter">Total: ${res.totalCost.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center py-1">
                                <XCircleIcon className="w-5 h-5 text-red-500 mb-1" />
                                <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Infactible</span>
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
