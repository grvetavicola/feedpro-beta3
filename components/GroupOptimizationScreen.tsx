import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Ingredient, Nutrient, SavedFormula } from '../types';
import { solveFeedFormulation } from '../services/solver';
import { BulkPriceEditorModal } from './BulkPriceEditorModal';
import { 
  CalculatorIcon, RefreshIcon, XCircleIcon, CheckIcon, 
  TrashIcon, SearchIcon, ChevronDownIcon, ChevronLeftIcon, 
  ChevronRightIcon, ArrowLeftIcon, ZapIcon 
} from './icons';
import { ActiveTask, ClientWorkspace, IngredientDelta } from '../types';

// ─── Interfaces & Types ─────────────────────────────────────────────────────────────

interface MatrixRow {
  id: string;
  type: 'ing' | 'nut';
  name: string;
  unit?: string;
  price?: number;
}

interface ConstraintSet {
  min: number | null;
  max: number | null;
  dirty: boolean;
  injected: boolean;
}

interface DietResult {
  feasible: boolean;
  costPerKg: number;
  prevCostPerKg?: number;
  formula: Record<string, number>;
  nutrients: Record<string, number>;
  shadowPrices: Record<string, number>;
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
  savedFormulas?: SavedFormula[];
  setSavedFormulas?: React.Dispatch<React.SetStateAction<SavedFormula[]>>;
  onRemoveDietFromSelection?: (id: string) => void;
  onEnterFullscreen?: () => void;
  onLeaveFullscreen?: () => void;
  selectedClientId?: string;
  onNavigate?: (view: any) => void;
  onUpdateIngredientPrice?: (prices: Record<string, number>) => void;
  workspaces?: Record<string, ClientWorkspace>;
}

// ─── Sub-Components ─────────────────────────────────────────────────────────────

const DiagnosticCell = ({ 
  row, 
  dietId, 
  value, 
  onChange, 
  isResult, 
  resultValue, 
  viewMode, 
  batchSize, 
  feasible, 
  min, 
  max, 
  shadowPrice,
  hasRun,
  cellIndex,
  rowIndex
}: {
  row: MatrixRow;
  dietId: string;
  value: number | null | string;
  onChange?: (val: number | null) => void;
  isResult?: boolean;
  resultValue?: number;
  viewMode: 'limits' | 'kg';
  batchSize: number;
  feasible: boolean;
  min?: number | null;
  max?: number | null;
  shadowPrice?: number;
  hasRun: boolean;
  cellIndex: number;
  rowIndex: number;
}) => {
  const isOutOfBounds = resultValue !== undefined && min !== null && min !== undefined && max !== null && max !== undefined && (resultValue < min - 0.01 || resultValue > max + 0.01);
  const isError = min !== null && min !== undefined && max !== null && max !== undefined && min > max;
  
  let bgColor = "bg-transparent";
  let borderColor = "border-transparent";
  let textColor = isResult ? "text-[#00D1FF]" : "text-white";

  if (hasRun) {
    if (isError) {
      bgColor = "bg-rose-500/10";
      borderColor = "border-rose-500/30";
      textColor = "text-rose-400";
    } else if (isResult) {
      if (!feasible) {
        bgColor = "bg-rose-500/10"; 
        borderColor = "border-rose-500/30";
        textColor = "text-rose-300 font-bold";
      } else if (isOutOfBounds) {
        bgColor = "bg-rose-500/5";
        borderColor = "border-rose-500/20";
        textColor = "text-rose-400 opacity-80";
      } else {
        bgColor = "bg-emerald-500/10"; 
        borderColor = "border-emerald-500/30";
        textColor = "text-emerald-400 font-bold";
      }
    }
  }

  const displayValue = viewMode === 'kg' && row.type === 'ing' && value !== undefined && value !== null
    ? ((Number(value) / 100) * (batchSize || 1000)).toFixed(rowIndex !== undefined ? 1 : 2)
    : (typeof value === 'number' ? (value > 99 ? value.toFixed(0) : value.toFixed(1)) : (value ?? ''));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector(`input[data-row-index="${rowIndex + 1}"][data-cell-index="${cellIndex}"][data-diet-id="${dietId}"]`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    } else if (e.key === 'Delete' || (e.key === 'Backspace' && e.ctrlKey)) {
      onChange?.(null);
    }
  };

  return (
    <div className={`h-full w-full flex flex-col justify-center px-1 border-r border-[#1e293b]/20 transition-all duration-300 ${isResult ? `border ${borderColor} rounded-md m-[1px]` : ''} ${bgColor}`}>
      {isResult ? (
        <div className="flex flex-col items-center justify-center h-full">
           <span className={`text-[17px] font-black font-mono leading-none ${textColor} ${!hasRun ? 'opacity-20' : ''}`}>
             {displayValue}
           </span>
           {hasRun && shadowPrice && shadowPrice > 0.01 && (
             <span className={`text-[8px] font-bold font-mono scale-[0.85] mt-0.5 ${feasible ? 'text-emerald-500/40' : 'text-rose-500/40'}`}>sp:{shadowPrice.toFixed(2)}</span>
           )}
        </div>
      ) : (
        <div className="h-[82%] w-full rounded-md focus-within:ring-1 focus-within:ring-[#00D1FF] bg-[#020617] border border-[#1e293b] transition-all shadow-inner overflow-hidden">
          <input
            type="number"
            value={value === null ? '' : value}
            data-row-index={rowIndex}
            data-cell-index={cellIndex}
            data-diet-id={dietId}
            onFocus={(e) => (e.target as HTMLInputElement).select()}
            onKeyDown={handleKeyDown}
            onChange={(e) => onChange?.(e.target.value === '' ? null : parseFloat(e.target.value))}
            className={`w-full h-full bg-transparent text-center text-[17px] font-black font-mono outline-none ${isError && hasRun ? 'text-rose-400' : 'text-white group-focus-within:text-[#00D1FF]'} placeholder-transparent border-none ring-0 focus:ring-0`}
            placeholder=""
          />
        </div>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────

export const GroupOptimizationScreen: React.FC<GroupOptimizationScreenProps> = ({
  products = [], ingredients = [], nutrients = [], isDynamicMatrix: initialIsDynamic,
  selectedDietIds = [], onUpdateProduct, setIsDirty,
  savedFormulas = [], setSavedFormulas, onRemoveDietFromSelection,
  onEnterFullscreen, onLeaveFullscreen, selectedClientId, onNavigate,
  onUpdateIngredientPrice, workspaces = {}
}) => {

  const [activeDietIds, setActiveDietIds] = useState<string[]>(selectedDietIds);
  const [activeRows, setActiveRows] = useState<MatrixRow[]>([]);
  const [constraints, setConstraints] = useState<Record<string, Record<string, ConstraintSet>>>({});
  const [batchSizes, setBatchSizes] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, DietResult>>({});
  const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);

  const activeIngredientIds = useMemo(() => 
    activeRows.filter(r => r.type === 'ing').map(r => r.id),
    [activeRows]
  );
  
  const [isDynamic, setIsDynamic] = useState(initialIsDynamic);
  const [viewMode, setViewMode] = useState<'limits' | 'kg'>('limits');
  
  const getDietTheme = (cat: string) => {
    const c = (cat || 'GENERAL').toUpperCase();
    
    const palette = [
      { bg: 'bg-[#080808]', cellBg: 'bg-[#050505]/30', border: 'border-cyan-500/30', borderT: 'border-t-cyan-500/50', accent: 'text-[#00D1FF]', glow: 'shadow-[0_0_20px_rgba(0,209,255,0.15)]' }, // Cyan
      { bg: 'bg-[#080808]', cellBg: 'bg-[#050505]/30', border: 'border-indigo-500/30', borderT: 'border-t-indigo-500/50', accent: 'text-indigo-400', glow: 'shadow-[0_0_20px_rgba(99,102,241,0.15)]' }, // Indigo
      { bg: 'bg-[#080808]', cellBg: 'bg-[#050505]/30', border: 'border-emerald-500/30', borderT: 'border-t-emerald-500/50', accent: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]' }, // Emerald
      { bg: 'bg-[#080808]', cellBg: 'bg-[#050505]/30', border: 'border-amber-500/30', borderT: 'border-t-amber-500/50', accent: 'text-amber-400', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]' }, // Amber
      { bg: 'bg-[#080808]', cellBg: 'bg-[#050505]/30', border: 'border-cyan-500/20', borderT: 'border-t-cyan-500/40', accent: 'text-[#00D1FF]', glow: 'shadow-[0_0_20px_rgba(0,209,255,0.1)]' }, // Fallback Cyan
      { bg: 'bg-[#080808]', cellBg: 'bg-[#050505]/30', border: 'border-purple-500/30', borderT: 'border-t-purple-500/50', accent: 'text-purple-400', glow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)]' }, // Purple
    ];

    // Priority matches
    if (c.includes('COLOR')) return palette[1]; // Indigo
    if (c.includes('REPRO')) return palette[2]; // Emerald
    if (c.includes('INICIO')) return palette[0]; // Cyan
    if (c.includes('GENERAL') || !cat) return palette[0]; // Fallback to Cyan
    
    // Hash based assignment
    let hash = 0;
    for (let i = 0; i < c.length; i++) {
      hash = c.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % palette.length;
    return palette[index];
  };

  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogSelection, setCatalogSelection] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const goHome = () => {
    onLeaveFullscreen?.();
    if (onNavigate) onNavigate('DASHBOARD');
    else window.dispatchEvent(new CustomEvent('feedpro:goto_dashboard'));
  };

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

  const totalLoadedKg = useMemo(() => activeDietIds.reduce((sum, id) => sum + (batchSizes[id] || 0), 0), [activeDietIds, batchSizes]);

  const handleRemoveRow = (id: string) => {
    setActiveRows(p => p.filter(r => r.id !== id));
    setConstraints(p => { const next = { ...p }; delete next[id]; return next; });
  };

  const updateConstraint = (rowId: string, dietId: string, field: 'min' | 'max', val: number | null) => {
    setConstraints(prev => ({
      ...prev, [rowId]: { ...(prev[rowId] || {}), [dietId]: {
        min: prev[rowId]?.[dietId]?.min ?? null,
        max: prev[rowId]?.[dietId]?.max ?? null,
        injected: prev[rowId]?.[dietId]?.injected ?? false,
        [field]: val, dirty: true
      }}
    }));
    setHasRun(false);
  };

  const handleBulkAdd = () => {
    const selection = Array.from(catalogSelection);
    if (!selection.length) return;
    const newRows: MatrixRow[] = [...activeRows];
    const newConstraints = { ...constraints };
    selection.forEach(id => {
      if (!newRows.find(r => r.id === id)) {
        const ing = ingredients.find(i => i.id === id);
        const nut = nutrients.find(n => n.id === id);
        if (ing) newRows.push({ id, type: 'ing', name: ing.name.toUpperCase(), price: (ing.price / (1 - (ing.shrinkage || 0) / 100)) + (ing.processingCost || 0) });
        else if (nut) newRows.push({ id, type: 'nut', name: nut.name.toUpperCase(), unit: nut.unit });
      }
      if (!newConstraints[id]) newConstraints[id] = {};
      activeDiets.forEach(d => { if (!newConstraints[id][d.id]) newConstraints[id][d.id] = { min: null, max: null, dirty: false, injected: true }; });
    });
    setActiveRows(newRows);
    setConstraints(newConstraints);
    setShowCatalog(false);
    setCatalogSelection(new Set());
    setHasRun(false);
  };

  const handleRunAll = useCallback(() => {
    if (!activeDiets.length) return;
    setIsRunning(true);
    const newRes: Record<string, DietResult> = {};
    activeDiets.forEach(diet => {
      const matrixProduct: Product = {
        ...diet,
        ingredientConstraints: activeRows.filter(r => r.type === 'ing').map(r => {
          const c = (constraints[r.id]?.[diet.id] || {}) as any;
          return { ingredientId: r.id, min: c.min ?? 0, max: c.max ?? 100 };
        }),
        constraints: activeRows.filter(r => r.type === 'nut').map(r => {
          const c = (constraints[r.id]?.[diet.id] || {}) as any;
          return { nutrientId: r.id, min: c.min ?? 0, max: c.max ?? 999 };
        })
      };
      const res = solveFeedFormulation(matrixProduct, ingredients, nutrients, batchSizes[diet.id] || 1000, isDynamic);
      const formulaMap: Record<string, number> = {};
      const shadowMap: Record<string, number> = {};
      
      res.items.forEach(item => { 
        formulaMap[item.ingredientId] = item.percentage; 
        if (item.shadowPrice) shadowMap[item.ingredientId] = item.shadowPrice; 
      });
      if (res.rejectedItems) {
        res.rejectedItems.forEach(ri => { shadowMap[ri.ingredientId] = ri.viabilityGap; });
      }
      const nutMap: Record<string, number> = {};
      res.nutrientAnalysis.forEach(na => { 
        nutMap[na.nutrientId] = na.value; 
        if (na.shadowPrice) shadowMap[na.nutrientId] = na.shadowPrice; 
      });
      newRes[diet.id] = {
        feasible: res.status === 'OPTIMAL',
        costPerKg: res.totalCost / (batchSizes[diet.id] || 1000),
        prevCostPerKg: results[diet.id]?.costPerKg,
        formula: formulaMap, nutrients: nutMap, shadowPrices: shadowMap, totalCost: res.totalCost
      };
    });
    setResults(newRes);
    setIsRunning(false);
    setHasRun(true);
    setIsDirty?.(true);
  }, [activeDiets, activeRows, constraints, batchSizes, ingredients, nutrients, isDynamic, results, setIsDirty]);

  const handleSaveMatrix = () => {
    alert("FEEDPRO 360 PREMIER: MATRIZ GUARDADA.");
    setIsDirty?.(false);
  };

  useEffect(() => { if (selectedDietIds) setActiveDietIds(selectedDietIds); }, [selectedDietIds]);
  useEffect(() => { setBatchSizes(prev => {
      const next = { ...prev };
      activeDiets.forEach(d => { if (!next[d.id]) next[d.id] = 1000; });
      return next;
    });
  }, [activeDiets]);
  
  useEffect(() => {
    setConstraints(prev => {
      const next = { ...prev };
      activeDiets.forEach(diet => {
        const hasHistory = savedFormulas.some(f => f.productId === diet.id);
        (diet.ingredientConstraints || []).forEach(ic => {
          if (!next[ic.ingredientId]) next[ic.ingredientId] = {};
          if (!next[ic.ingredientId][diet.id]) {
            if (hasHistory) next[ic.ingredientId][diet.id] = { min: ic.min, max: ic.max, dirty: false, injected: false };
            else next[ic.ingredientId][diet.id] = { min: null, max: null, dirty: false, injected: false };
          }
        });
        (diet.constraints || []).forEach(nc => {
          if (!next[nc.nutrientId]) next[nc.nutrientId] = {};
          if (!next[nc.nutrientId][diet.id]) {
            if (hasHistory) next[nc.nutrientId][diet.id] = { min: nc.min, max: nc.max, dirty: false, injected: false };
            else next[nc.nutrientId][diet.id] = { min: null, max: null, dirty: false, injected: false };
          }
        });
      });
      return next;
    });
  }, [activeDiets, savedFormulas]);

  useEffect(() => {
    const ingIds = new Set<string>();
    const nutIds = new Set<string>();
    activeDiets.forEach(d => {
      (d.ingredientConstraints || []).forEach(ic => ingIds.add(ic.ingredientId));
      (d.constraints || []).forEach(nc => nutIds.add(nc.nutrientId));
    });
    const rows: MatrixRow[] = [
      ...ingredients.filter(i => ingIds.has(i.id)).map(i => ({
        id: i.id, type: 'ing' as const, name: i.name.toUpperCase(),
        price: (i.price / (1 - (i.shrinkage || 0) / 100)) + (i.processingCost || 0)
      })),
      ...nutrients.filter(n => nutIds.has(n.id)).map(n => ({
        id: n.id, type: 'nut' as const, name: n.name.toUpperCase(), unit: n.unit
      }))
    ];
    setActiveRows(rows);
  }, [activeDiets, ingredients, nutrients]);

  useEffect(() => {
    const L = (e: KeyboardEvent) => { if (e.key === 'F4') { e.preventDefault(); handleRunAll(); } };
    window.addEventListener('keydown', L);
    onEnterFullscreen?.();
    return () => { window.removeEventListener('keydown', L); onLeaveFullscreen?.(); };
  }, [handleRunAll, onEnterFullscreen, onLeaveFullscreen]);

  return (
    <div className="flex-1 flex flex-col w-full h-full bg-[#030303] text-white overflow-hidden select-none font-sans antialiased">
      
      {showCatalog && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[200] flex items-center justify-center p-4">
           <div className="bg-[#0e0e0e] border border-slate-800 rounded-[2rem] w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
             <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-[#0f172a]/50">
               <div className="flex items-center gap-5">
                  <div className="p-4 bg-cyan-600/10 rounded-3xl border border-cyan-500/20 shadow-lg shadow-cyan-900/10"><ZapIcon className="w-6 h-6 text-[#00D1FF]" /></div>
                  <h2 className="text-base font-black text-white uppercase tracking-widest italic">Inyectar Vectores</h2>
               </div>
               <button onClick={() => setShowCatalog(false)} className="text-white/70 hover:text-white transition-all"><XCircleIcon className="w-8 h-8" /></button>
             </div>
             
             <div className="p-5 bg-black/40 flex gap-4 border-b border-slate-800">
                <input type="text" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} placeholder="EXPLORAR MAESTROS..." className="flex-1 h-11 bg-[#020617] border border-[#1e293b] rounded-2xl px-5 text-[12px] font-black uppercase text-white outline-none focus:border-[#00D1FF] transition-all placeholder-gray-400 shadow-inner" />
                <button onClick={handleBulkAdd} className="px-10 h-11 bg-[#00D1FF] text-white font-black uppercase rounded-2xl shadow-[0_10px_30px_rgba(0,209,255,0.2)] transition-all active:scale-95 text-[11px] tracking-[0.2em]">CARGAR EN MATRIZ</button>
             </div>

             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/10">
                <div className="grid grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-[#00D1FF] uppercase border-b border-[#00D1FF]/10 pb-2 tracking-[0.3em] opacity-50">Insumos</h3>
                      <div className="grid grid-cols-1 gap-1.5 focus-within:opacity-100">
                        {ingredients.filter(i => i.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(i => (
                          <label key={i.id} className={`flex items-center gap-4 p-2.5 rounded-2xl cursor-pointer border transition-all ${catalogSelection.has(i.id) ? 'bg-[#00D1FF]/10 border-[#00D1FF]/30 shadow-[0_0_15px_rgba(0,209,255,0.05)]' : 'border-transparent hover:bg-white/[0.03]'}`}>
                             <input type="checkbox" checked={catalogSelection.has(i.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(i.id)) s.delete(i.id); else s.add(i.id); setCatalogSelection(s); }} className="w-4.5 h-4.5 rounded-lg border-slate-800 bg-black text-[#00D1FF] focus:ring-0" />
                             <span className={`text-[13px] font-bold uppercase truncate ${catalogSelection.has(i.id) ? 'text-white' : 'text-slate-400'}`}>{i.name}</span>
                          </label>
                        ))}
                      </div>
                   </div>
                   <div className="space-y-4">
                      <h3 className="text-[10px] font-black text-emerald-400 uppercase border-b border-emerald-400/10 pb-2 tracking-[0.3em] opacity-50">Parámetros</h3>
                      <div className="grid grid-cols-1 gap-1.5">
                        {nutrients.filter(n => n.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(n => (
                          <label key={n.id} className={`flex items-center gap-4 p-2.5 rounded-2xl cursor-pointer border transition-all ${catalogSelection.has(n.id) ? 'bg-emerald-400/10 border-emerald-400/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]' : 'border-transparent hover:bg-white/[0.03]'}`}>
                             <input type="checkbox" checked={catalogSelection.has(n.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(n.id)) s.delete(n.id); else s.add(n.id); setCatalogSelection(s); }} className="w-4.5 h-4.5 rounded-lg border-slate-800 bg-black text-emerald-400 focus:ring-0" />
                             <span className={`text-[13px] font-bold uppercase truncate ${catalogSelection.has(n.id) ? 'text-white' : 'text-slate-400'}`}>{n.name}</span>
                          </label>
                        ))}
                      </div>
                   </div>
                </div>
             </div>
           </div>
        </div>
      )}

      <nav className="flex-none bg-[#0a0a0a] border-b border-slate-800 h-16 flex items-center px-8 gap-10 z-[100] shadow-2xl relative">
         <div className="flex items-center gap-4 shrink-0">
            <button onClick={goHome} className="p-2.5 text-[#00D1FF] hover:bg-[#00D1FF]/10 rounded-2xl transition-all active:scale-90 bg-black/40 border border-slate-800 cursor-pointer">
               <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setIsPriceModalOpen(true)}
              className="px-6 h-10 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 font-black uppercase text-[10px] rounded-2xl border border-indigo-500/30 transition-all flex items-center gap-3 tracking-[0.25em] shadow-[0_0_20px_rgba(99,102,241,0.05)] active:scale-95"
            >
               <ZapIcon className="w-4.5 h-4.5" /> PRECIOS
            </button>
            <button onClick={handleSaveMatrix} className="px-6 h-10 bg-[#0f172a] hover:bg-[#1e293b] text-white font-black uppercase text-[10px] rounded-2xl border border-[#00D1FF]/40 transition-all flex items-center gap-3 tracking-[0.25em] shadow-[0_0_20px_rgba(0,209,255,0.05)] active:scale-95">
               <CheckIcon className="w-4.5 h-4.5 text-[#00D1FF]" /> GUARDAR
            </button>
         </div>
         <div className="w-px h-8 bg-slate-800 shrink-0" />
         <div className="flex items-center gap-6">
            <button onClick={() => setShowCatalog(true)} className="flex items-center gap-3 text-[#00D1FF] hover:text-[#00D1FF]/80 text-[11px] font-black uppercase tracking-[0.2em] transition-all bg-black/40 px-5 py-2.5 rounded-2xl border border-slate-800">
               <ZapIcon className="w-5 h-5" /> SELECTOR GLOBAL
            </button>
            <div className="flex h-9 bg-black/80 rounded-[1.25rem] border border-slate-800 overflow-hidden shadow-2xl">
               <button onClick={() => setViewMode('limits')} className={`px-6 text-[11px] font-black uppercase transition-all ${viewMode === 'limits' ? 'bg-[#00D1FF] text-white' : 'text-slate-300 hover:text-slate-300'}`}>Límites</button>
               <button onClick={() => setViewMode('kg')} className={`px-6 text-[11px] font-black uppercase transition-all ${viewMode === 'kg' ? 'bg-[#00D1FF] text-white' : 'text-slate-300 hover:text-slate-300'}`}>Resultados</button>
            </div>
         </div>
         <div className="flex-1 flex items-center justify-end gap-16">
            <div className="flex flex-col items-center"><span className="text-[12px] font-black text-[#00D1FF] font-mono leading-none tracking-tighter">{activeDiets.length}</span><span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">DIETAS</span></div>
            <div className="flex flex-col items-center"><span className="text-[12px] font-black text-indigo-400 font-mono leading-none tracking-tighter">{totalLoadedKg.toLocaleString()}</span><span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">KILOS TOTAL</span></div>
            <button onClick={handleRunAll} disabled={isRunning} className="px-12 h-11 bg-emerald-700 hover:bg-emerald-600 text-white font-black uppercase rounded-[1.5rem] shadow-[0_15px_40px_rgba(16,185,129,0.2)] flex items-center gap-5 transition-all active:scale-95 tracking-[0.25em] text-[11px] border border-emerald-500/30">
               {isRunning ? <RefreshIcon className="w-6 h-6 animate-spin" /> : <CalculatorIcon className="w-6 h-6" />} OPTIMIZAR (F4)
            </button>
         </div>
      </nav>

      <main className="flex-1 flex overflow-hidden relative">
        <aside className={`shrink-0 bg-[#080808] border-r border-slate-800 transition-all duration-300 flex flex-col overflow-hidden z-50 ${isSidebarCollapsed ? 'w-0' : 'w-64'}`}>
           <div className="p-5 shrink-0 border-b border-slate-800 bg-black/40">
              <span className="text-[11px] font-black text-[#00D1FF] uppercase tracking-[0.3em] border-l-3 border-[#00D1FF] pl-4 italic opacity-90 font-mono">Entorno Clínico</span>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 bg-black/20">
              {Object.entries(dietsByCategory).map(([cat, list]) => {
                 const isExp = expandedCats[cat] ?? true;
                 const allSel = list.length > 0 && list.every(d => activeDietIds.includes(d.id));
                 const theme = getDietTheme(cat);
                 return (
                   <div key={cat} className={`rounded-3xl overflow-hidden border ${theme.border} ${theme.bg} shadow-2xl transition-all`}>
                    <button onClick={() => setExpandedCats(p => ({...p, [cat]: !isExp}))} className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors">
                       <div className="flex items-center gap-3 min-w-0">
                         <div className={`w-2 h-2 rounded-full ${theme.accent.replace('text-', 'bg-')} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
                         <span className={`text-[10px] font-black uppercase italic truncate max-w-[130px] tracking-widest whitespace-normal break-words ${theme.accent}`}>{cat}</span>
                       </div>
                       <div className="flex items-center gap-3">
                         <input type="checkbox" checked={allSel} onClick={(e) => e.stopPropagation()} onChange={() => { const ids = list.map(d => d.id); setActiveDietIds(prev => allSel ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))); }} className={`w-4 h-4 rounded-lg bg-black border-slate-800 ${theme.accent.replace('text-', 'text-')} focus:ring-0`} />
                         <ChevronDownIcon className={`w-3.5 h-3.5 text-slate-300 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                       </div>
                    </button>
                    {isExp && (
                      <div className="p-1.5 space-y-1.5 bg-[#0f172a]/30">
                        {list.map(d => (
                          <button key={d.id} onClick={() => setActiveDietIds(p => p.includes(d.id) ? p.filter(id => id !== d.id) : [...p, d.id])} 
                            className={`w-full text-left px-5 py-4 rounded-2xl text-[12px] font-black uppercase transition-all tracking-tight whitespace-normal break-words ${activeDietIds.includes(d.id) ? 'bg-[#0f172a] text-white shadow-2xl border border-[#00D1FF]/30' : 'text-slate-500 hover:bg-white/5 hover:text-slate-400'}`}>
                             {d.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
           </div>
        </aside>

        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`absolute bottom-10 z-[60] p-3 bg-slate-900/90 hover:bg-[#00D1FF] hover:text-white text-slate-400 rounded-full shadow-2xl transition-all border border-slate-800 active:scale-95 ${isSidebarCollapsed ? 'left-10' : 'left-[15.2rem]'}`}>
           {isSidebarCollapsed ? <ChevronRightIcon className="w-6 h-6" /> : <ChevronLeftIcon className="w-6 h-6" />}
        </button>

        <div className="flex-1 overflow-auto bg-[#020202] custom-scrollbar">
           <table className="border-collapse table-fixed w-max">
               <thead>
                 <tr className="sticky top-0 z-[60]">
                   <th className="sticky left-0 z-[70] bg-[#0c0c0c] border-b border-r border-slate-800/60 p-0 w-[250px] min-w-[250px] shadow-[20px_0_40px_rgba(0,0,0,0.9)]">
                      <div className="flex items-center w-full h-full pl-8 pr-8 py-8 border-t border-blue-500/30">
                         <span className="text-[16px] font-black text-white uppercase italic tracking-[0.2em] leading-tight font-mono whitespace-normal break-words">MAESTRO DE DATOS</span>
                      </div>
                   </th>
                   {activeDiets.map((diet, idx) => {
                      const theme = getDietTheme(diet.category || '');
                      return (
                        <React.Fragment key={diet.id}>
                          <th className="w-4 min-w-[16px] bg-[#030303] border-none" />
                          <th className={`p-0 text-center relative bg-[#080808] border-b border-slate-800/60 w-[180px] min-w-[180px] rounded-t-3xl ${theme.glow} border-t-2 ${theme.borderT}`}>
                             <div className="flex flex-col items-center justify-center h-28 relative">
                                <div className="absolute top-4 right-4 flex gap-1">
                                  <button onClick={() => setActiveDietIds(p => p.filter(id => id !== diet.id))} className="p-2 hover:bg-white/10 rounded-xl transition-colors group">
                                    <TrashIcon className="w-4 h-4 text-slate-500 group-hover:text-rose-500" />
                                  </button>
                                </div>
                                <h3 className={`text-[15px] font-black uppercase tracking-[0.1em] mb-3 font-mono ${theme.accent} drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]`}>{diet.name}</h3>
                                <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-full border border-slate-800/50 shadow-inner">
                                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">LT:</span>
                                  <input
                                    type="number"
                                    value={batchSizes[diet.id] || 1000}
                                    onChange={(e) => setBatchSizes(prev => ({...prev, [diet.id]: Number(e.target.value)}))}
                                    className={`w-14 bg-transparent border-none text-[13px] font-black ${theme.accent} focus:outline-none focus:ring-0 p-0 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                  />
                                </div>
                             </div>
                          </th>
                        </React.Fragment>
                      );
                    })}
                   <th className="bg-transparent w-40"></th>
                 </tr>
               </thead>
               
               <tbody className="divide-y divide-slate-800/20">
                 <tr className="bg-[#030303] sticky top-[112px] z-50 border-b border-slate-800">
                    <td className="p-0 sticky left-0 z-[55] w-[250px] min-w-[250px]">
                       <div className="bg-[#050505] h-14 flex items-center pl-8 border-r border-slate-700">
                          <span className="text-[12px] font-black text-[#00D1FF] uppercase tracking-[0.4em] font-mono italic opacity-90">Sector I: Componentes</span>
                       </div>
                    </td>
                    {activeDiets.map((diet, idx) => {
                      const theme = getDietTheme(diet.category || '');
                      return (
                        <React.Fragment key={`h1-${diet.id}`}>
                          <td className="w-4 bg-[#030303] border-none" />
                          <td className={`p-0 border-b border-slate-800/60 ${theme.bg}`}>
                             <div className="grid grid-cols-3 h-14 divide-x divide-slate-800/20">
                                <div className={`flex items-center justify-center text-[10px] font-black opacity-50 uppercase tracking-widest ${theme.accent}`}>MIN</div>
                                <div className={`flex items-center justify-center text-[10px] font-black opacity-50 uppercase tracking-widest ${theme.accent}`}>MAX</div>
                                <div className={`flex items-center justify-center text-[10px] font-black uppercase tracking-widest ${theme.accent}`}>ACT</div>
                             </div>
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="bg-transparent w-40 opacity-0"></td>
                 </tr>

                 {activeRows.filter(r => r.type === 'ing').map((row, rIdx) => (
                   <tr key={row.id} className="h-11 group hover:bg-[#00D1FF]/[0.02] transition-colors relative">
                     <td className="sticky left-0 z-40 bg-[#030303] border-t border-blue-500/30 border-r-2 border-slate-700 pl-8 pr-8 py-0 shadow-[10px_0_20px_rgba(0,0,0,0.8)] group-focus-within:bg-[#0c0c0c] transition-colors w-[250px] min-w-[250px]">
                        <div className="flex items-center justify-between h-full py-1.5 gap-4">
                          <div className="min-w-0 flex-1 flex flex-col justify-center">
                             <span className="text-[13px] font-black text-white group-hover:text-cyan-400 uppercase tracking-tighter leading-tight whitespace-normal break-words block w-full">
                               {row.name}
                             </span>
                             <span className="text-[11px] text-slate-300 font-bold uppercase italic font-mono scale-95 origin-left tracking-widest opacity-90 group-hover:opacity-100">
                               ${row.price?.toFixed(2)}
                             </span>
                          </div>
                          <button onClick={() => handleRemoveRow(row.id)} className="text-red-900/20 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-600/10 rounded-xl shrink-0">
                             <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                     </td>
                     {activeDiets.map((diet, idx) => {
                       const c = constraints[row.id]?.[diet.id];
                       const res = results[diet.id];
                       const val = res?.formula[row.id] ?? 0;
                       const theme = getDietTheme(diet.category || '');
                       return (
                         <React.Fragment key={`diagnostic-${diet.id}`}>
                           <td className="w-4 bg-[#030303] border-none" />
                           <td className={`p-0 border-b border-slate-800/10 ${theme.bg} h-11`}>
                              <div className="grid grid-cols-3 h-full divide-x divide-white/[0.03]">
                                 <DiagnosticCell row={row} dietId={diet.id} value={c?.min} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'min', v)} hasRun={hasRun} cellIndex={0} rowIndex={rIdx} />
                                 <DiagnosticCell row={row} dietId={diet.id} value={c?.max} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'max', v)} hasRun={hasRun} cellIndex={1} rowIndex={rIdx} />
                                 <DiagnosticCell row={row} dietId={diet.id} value={val} isResult resultValue={val} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={res?.feasible ?? true} min={c?.min} max={c?.max} shadowPrice={res?.shadowPrices[row.id]} hasRun={hasRun} cellIndex={2} rowIndex={rIdx} />
                              </div>
                           </td>
                         </React.Fragment>
                       );
                     })}
                     <td className="bg-transparent w-40 opacity-0"></td>
                   </tr>
                 ))}

                 <tr className="bg-[#030303] sticky top-[112px] z-50 border-b border-slate-800">
                    <td className="p-0 sticky left-0 z-[55] w-[250px] min-w-[250px]">
                       <div className="bg-[#050505] h-14 flex items-center pl-8 border-r border-slate-700">
                          <span className="text-[12px] font-black text-[#00D1FF] uppercase tracking-[0.4em] font-mono italic opacity-90">Sector II: Parámetros</span>
                       </div>
                    </td>
                    {activeDiets.map((diet, idx) => {
                      const theme = getDietTheme(diet.category || '');
                      return (
                        <React.Fragment key={`h2-${diet.id}`}>
                          <td className="w-4 bg-[#030303] border-none" />
                          <td className={`p-0 border-b border-slate-800/60 ${theme.bg}`}>
                             <div className="grid grid-cols-3 h-14 divide-x divide-slate-800/20">
                                <div className={`flex items-center justify-center text-[10px] font-black opacity-50 uppercase tracking-widest ${theme.accent}`}>MIN</div>
                                <div className={`flex items-center justify-center text-[10px] font-black opacity-50 uppercase tracking-widest ${theme.accent}`}>MAX</div>
                                <div className={`flex items-center justify-center text-[10px] font-black uppercase tracking-widest ${theme.accent}`}>ACT</div>
                             </div>
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="bg-transparent opacity-0 w-40"></td>
                 </tr>

                 {activeRows.filter(r => r.type === 'nut').map((row, rIdx) => {
                   const baseIdx = activeRows.filter(r => r.type === 'ing').length;
                   return (
                     <tr key={row.id} className="h-11 group hover:bg-[#00D1FF]/[0.02] transition-colors relative">
                       <td className="sticky left-0 z-40 bg-[#030303] border-t border-blue-500/30 border-r-2 border-slate-700 pl-8 pr-8 py-0 shadow-[10px_0_20px_rgba(0,0,0,0.8)] group-focus-within:bg-[#0c0c0c] transition-colors w-[250px] min-w-[250px]">
                          <div className="flex items-center justify-between h-full py-1.5 gap-4">
                            <div className="min-w-0 flex-1 flex flex-col justify-center">
                               <span className="text-[13px] font-black text-white group-hover:text-cyan-400 uppercase tracking-tighter leading-tight whitespace-normal break-words block w-full">
                                 {row.name}
                               </span>
                               <span className="text-[11px] text-slate-300 font-bold uppercase italic font-mono scale-95 origin-left tracking-[0.3em] opacity-90 group-hover:opacity-100">
                                 {row.unit}
                               </span>
                            </div>
                            <button onClick={() => handleRemoveRow(row.id)} className="text-red-900/20 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all p-2 hover:bg-red-600/10 rounded-xl shrink-0">
                             <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                          </div>
                       </td>
                       {activeDiets.map((diet, idx) => {
                         const c = (constraints[row.id]?.[diet.id] || {}) as any;
                         const res = results[diet.id];
                         const val = res?.nutrients[row.id] ?? 0;
                         const theme = getDietTheme(diet.category || '');
                         return (
                           <React.Fragment key={diet.id}>
                             <td className="w-4 bg-[#030303] border-none" />
                             <td className={`p-0 border-b border-slate-800/10 ${theme.cellBg} h-11`}>
                                <div className="grid grid-cols-3 h-full divide-x divide-white/[0.03]">
                                   <DiagnosticCell row={row} dietId={diet.id} value={c?.min} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'min', v)} hasRun={hasRun} cellIndex={0} rowIndex={baseIdx + rIdx} />
                                   <DiagnosticCell row={row} dietId={diet.id} value={c?.max} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'max', v)} hasRun={hasRun} cellIndex={1} rowIndex={baseIdx + rIdx} />
                                   <DiagnosticCell row={row} dietId={diet.id} value={val} isResult resultValue={val} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={res?.feasible ?? true} min={c?.min} max={c?.max} shadowPrice={res?.shadowPrices[row.id]} hasRun={hasRun} cellIndex={2} rowIndex={baseIdx + rIdx} />
                                </div>
                             </td>
                           </React.Fragment>
                         );
                       })}
                       <td className="bg-transparent w-40 opacity-0"></td>
                     </tr>
                   );
                 })}
               </tbody>

               <tfoot className="sticky bottom-0 z-[60] shadow-2xl border-t-2 border-slate-800">
                 <tr className="bg-[#050505] h-20">
                    <td className="p-6 pl-8 pr-8 sticky left-0 z-[70] bg-[#060606] border-t border-blue-500/30 border-r-2 border-slate-700 shadow-2xl w-[250px] min-w-[250px]">
                       <div className="flex flex-col">
                         <span className="text-[14px] font-black text-[#00D1FF] uppercase tracking-[0.2em] leading-none mb-2 font-mono">Diagnóstico Maestro</span>
                         <div className="h-0.5 w-12 bg-[#00D1FF]/40 rounded-full mb-2" />
                         <span className="text-[10px] text-slate-300 font-bold uppercase italic font-mono opacity-90 tracking-widest">Análisis Valorizado</span>
                       </div>
                    </td>
                    {activeDiets.map((diet, idx) => {
                      const res = results[diet.id];
                      const theme = getDietTheme(diet.category || '');
                      return (
                        <React.Fragment key={`diag-${diet.id}`}>
                           <td className="w-4 bg-[#030303] border-none" />
                           <td className={`p-6 bg-[#080808] border-b border-slate-800/60 align-top rounded-b-3xl ${theme.glow} border-b-2 ${theme.borderT.replace('border-t-', 'border-b-')}`}>
                             {res && hasRun ? (
                               <div className="space-y-3">
                                 <div className={`text-[28px] font-black font-mono leading-none tracking-tighter ${res.feasible ? 'text-white' : 'text-rose-500'}`}>
                                   ${res.costPerKg.toFixed(2)}
                                 </div>
                                 <div className="flex items-center gap-2">
                                   <div className={`h-1.5 w-1.5 rounded-full ${res.feasible ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                                   <div className={`text-[10px] uppercase tracking-[0.2em] font-black ${res.feasible ? 'text-emerald-500' : 'text-rose-500'}`}>
                                     {res.feasible ? 'Óptimo' : 'Infactible'}
                                   </div>
                                 </div>
                               </div>
                             ) : (
                               <div className="text-slate-800 text-[10px] uppercase font-bold tracking-[0.3em] pt-4 italic opacity-30">Pendiente</div>
                             )}
                          </td>
                        </React.Fragment>
                      );
                    })}
                    <td className="bg-transparent opacity-0 w-40"></td>
                 </tr>
               </tfoot>
           </table>
        </div>
      </main>
      
      <BulkPriceEditorModal 
        isOpen={isPriceModalOpen}
        onClose={() => setIsPriceModalOpen(false)}
        ingredients={ingredients}
        activeIngredientIds={activeIngredientIds}
        currentOverrides={selectedClientId ? workspaces[selectedClientId]?.ingredientOverrides : {}}
        onSavePrices={(prices) => {
          if (onUpdateIngredientPrice) onUpdateIngredientPrice(prices);
          setHasRun(false); // Reset matrix to require recalculation
        }}
      />
    </div>
  );
};
