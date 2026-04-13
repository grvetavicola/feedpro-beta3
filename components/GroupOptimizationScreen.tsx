import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Ingredient, Nutrient, SavedFormula } from '../types';
import { solveFeedFormulation } from '../services/solver';
import { 
  CalculatorIcon, RefreshIcon, XCircleIcon, CheckIcon, 
  TrashIcon, SearchIcon, ChevronDownIcon, ChevronLeftIcon, 
  ChevronRightIcon, ArrowLeftIcon, ZapIcon 
} from './icons';

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
  
  // 4. LÓGICA DE DATOS: COLORACIÓN DE CELDA COMPLETA
  let bgColor = "bg-transparent";
  let textColor = "text-white/80";

  if (hasRun) {
    if (isError) {
      bgColor = "bg-red-900/60";
      textColor = "text-white";
    } else if (isResult) {
      if (!feasible) {
        bgColor = "bg-red-600";
        textColor = "text-white font-black";
      } else if (isOutOfBounds) {
        bgColor = "bg-red-500/40";
        textColor = "text-white";
      } else {
        bgColor = "bg-emerald-600";
        textColor = "text-white font-black";
      }
    }
  }

  const displayValue = viewMode === 'kg' && isResult && resultValue !== undefined 
    ? ((resultValue / 100) * (batchSize || 1000)).toFixed(2) 
    : (typeof value === 'number' ? value.toFixed(1) : (value ?? ''));

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
    <div className={`h-full w-full flex flex-col justify-center px-0.5 border-r border-slate-800 last:border-r-0 transition-all duration-200 ${bgColor}`}>
      {isResult ? (
        <div className="flex flex-col items-center justify-center p-0 h-full">
          <span className={`text-[17px] font-black font-mono leading-none ${textColor} ${!hasRun ? 'opacity-20' : ''}`}>
            {displayValue}
            {viewMode === 'limits' && <span className="text-[10px] ml-0.2 opacity-20">%</span>}
          </span>
          {hasRun && shadowPrice && shadowPrice > 0.01 && (
            <span className={`text-[8px] font-bold font-mono scale-[0.7] leading-none mt-0.5 ${feasible ? 'text-white/40' : 'text-white/60'}`}>sp:{shadowPrice.toFixed(2)}</span>
          )}
        </div>
      ) : (
        <div className="h-[90%] w-full rounded-[2px] focus-within:ring-1 focus-within:ring-[#00D1FF]/50 transition-all bg-black/40 border border-slate-800/30">
          <input
            type="number"
            value={value === null ? '' : value}
            data-row-index={rowIndex}
            data-cell-index={cellIndex}
            data-diet-id={dietId}
            onFocus={(e) => (e.target as HTMLInputElement).select()}
            onKeyDown={handleKeyDown}
            onChange={(e) => onChange?.(e.target.value === '' ? null : parseFloat(e.target.value))}
            className={`w-full h-full bg-transparent text-center text-[17px] font-black font-mono outline-none ${isError && hasRun ? 'text-red-400' : 'text-white group-focus-within:text-[#00D1FF]'} placeholder-gray-900 border-none ring-0 focus:ring-0`}
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
  onEnterFullscreen, onLeaveFullscreen, selectedClientId, onNavigate
}) => {

  // 1. REGLA DE SALIDA: HOOKS Y NAVIGATE AL INICIO
  const navigate = useCallback((to: any) => {
    if (to === -1) {
      onLeaveFullscreen?.();
      if (onNavigate) onNavigate('DASHBOARD');
      else window.history.back();
    } else if (onNavigate) {
      onNavigate(to);
    }
  }, [onNavigate, onLeaveFullscreen]);

  const [activeDietIds, setActiveDietIds] = useState<string[]>(selectedDietIds);
  const [activeRows, setActiveRows] = useState<MatrixRow[]>([]);
  const [constraints, setConstraints] = useState<Record<string, Record<string, ConstraintSet>>>({});
  const [batchSizes, setBatchSizes] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, DietResult>>({});
  
  const [isDynamic, setIsDynamic] = useState(initialIsDynamic);
  const [viewMode, setViewMode] = useState<'limits' | 'kg'>('limits');
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  const [showCatalog, setShowCatalog] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogSelection, setCatalogSelection] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  // 2. DATA DERIVADA
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

  // 3. LOGIC HANDLERS
  const handleRemoveRow = (id: string) => {
    setActiveRows(p => p.filter(r => r.id !== id));
    setConstraints(p => { const n = { ...p }; delete n[id]; return n; });
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
        ingredientConstraints: activeRows.filter(r => r.type === 'ing' && constraints[r.id]?.[diet.id]).map(r => ({ 
          ingredientId: r.id, 
          min: constraints[r.id][diet.id].min ?? 0, 
          max: constraints[r.id][diet.id].max ?? 100 
        })),
        constraints: activeRows.filter(r => r.type === 'nut' && constraints[r.id]?.[diet.id]).map(r => ({ 
          nutrientId: r.id, 
          min: constraints[r.id][diet.id].min ?? 0, 
          max: constraints[r.id][diet.id].max ?? 999 
        }))
      };
      const res = solveFeedFormulation(matrixProduct, ingredients, nutrients, batchSizes[diet.id] || 1000, isDynamic);
      const formulaMap: Record<string, number> = {};
      const shadowMap: Record<string, number> = {};
      res.items.forEach(item => { formulaMap[item.ingredientId] = item.percentage; if (item.shadowPrice) shadowMap[item.ingredientId] = item.shadowPrice; });
      const nutMap: Record<string, number> = {};
      res.nutrientAnalysis.forEach(na => { nutMap[na.nutrientId] = na.value; if (na.shadowPrice) shadowMap[na.nutrientId] = na.shadowPrice; });
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
    alert("SISTEMA DE PERSISTENCIA: CONFIGURACIÓN GUARDADA.");
    setIsDirty?.(false);
  };

  // 4. LÓGICA DE MEMORIA E INICIO LIMPIO
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
        // Solo cargar si existe historial, sino dejar VACÍO
        (diet.ingredientConstraints || []).forEach(ic => {
          if (!next[ic.ingredientId]) next[ic.ingredientId] = {};
          if (!next[ic.ingredientId][diet.id]) {
            // Regla: No precargar si es "nuevo" (simulado por ausencia de savedFormulas para este id)
            const hasHistory = savedFormulas.some(f => f.productId === diet.id);
            if (hasHistory) next[ic.ingredientId][diet.id] = { min: ic.min, max: ic.max, dirty: false, injected: false };
            else next[ic.ingredientId][diet.id] = { min: null, max: null, dirty: false, injected: false };
          }
        });
        (diet.constraints || []).forEach(nc => {
          if (!next[nc.nutrientId]) next[nc.nutrientId] = {};
          if (!next[nc.nutrientId][diet.id]) {
            const hasHistory = savedFormulas.some(f => f.productId === diet.id);
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

  // 5. RENDERIZADO (Tabla Industrial)
  return (
    <div className="flex-1 flex flex-col w-full h-full bg-[#020202] text-white overflow-hidden select-none font-sans antialiased text-[13px]">
      
      {/* Rediseño Selector Global (Botones Blancos s/ Cian) */}
      {showCatalog && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[200] flex items-center justify-center p-4">
           <div className="bg-[#0c0c0c] border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
             <div className="p-4 border-b border-slate-800 flex items-center justify-between">
               <div className="flex items-center gap-3">
                  <ZapIcon className="w-5 h-5 text-[#00D1FF]" />
                  <h2 className="text-sm font-black text-white uppercase tracking-wider italic">SELECTOR GLOBAL</h2>
               </div>
               <button onClick={() => setShowCatalog(false)} className="text-slate-500 hover:text-white"><XCircleIcon className="w-6 h-6" /></button>
             </div>
             
             <div className="p-3 bg-black flex gap-2">
               <input type="text" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} placeholder="BUSCAR VECTOR..." className="flex-1 h-9 bg-slate-900 border border-slate-800 rounded px-3 text-[11px] font-black uppercase text-white outline-none focus:border-[#00D1FF]/40" />
               <button onClick={handleBulkAdd} className="px-5 h-9 bg-[#00D1FF] text-white font-black uppercase rounded shadow-lg active:scale-95 text-[10px] tracking-widest">INYECTAR</button>
             </div>

             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-black/20">
                <div className="grid grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <h3 className="text-[10px] font-black text-[#00D1FF] uppercase border-b border-[#00D1FF]/10 pb-1">Insumos</h3>
                      <div className="space-y-0.5">
                        {ingredients.filter(i => i.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(i => (
                          <label key={i.id} className={`flex items-center gap-3 p-1.5 rounded-md cursor-pointer border ${catalogSelection.has(i.id) ? 'bg-[#00D1FF]/10 border-[#00D1FF]/30' : 'border-transparent hover:bg-white/5'}`}>
                             <input type="checkbox" checked={catalogSelection.has(i.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(i.id)) s.delete(i.id); else s.add(i.id); setCatalogSelection(s); }} className="w-3.5 h-3.5 rounded bg-black border-slate-700 text-[#00D1FF]" />
                             <span className="text-[11px] font-bold uppercase truncate">{i.name}</span>
                          </label>
                        ))}
                      </div>
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-[10px] font-black text-emerald-400 uppercase border-b border-emerald-400/10 pb-1">Nutrientes</h3>
                      <div className="space-y-0.5">
                        {nutrients.filter(n => n.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(n => (
                          <label key={n.id} className={`flex items-center gap-3 p-1.5 rounded-md cursor-pointer border ${catalogSelection.has(n.id) ? 'bg-emerald-400/10 border-emerald-400/30' : 'border-transparent hover:bg-white/5'}`}>
                             <input type="checkbox" checked={catalogSelection.has(n.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(n.id)) s.delete(n.id); else s.add(n.id); setCatalogSelection(s); }} className="w-3.5 h-3.5 rounded bg-black border-slate-700 text-emerald-400" />
                             <span className="text-[11px] font-bold uppercase truncate">{n.name}</span>
                          </label>
                        ))}
                      </div>
                   </div>
                </div>
             </div>
           </div>
        </div>
      )}

      {/* Header Compacto de Una Sola Fila */}
      <nav className="flex-none bg-[#050505] border-b border-slate-800 h-14 flex items-center px-6 gap-6 z-[100] shadow-xl">
         <div className="flex items-center gap-3">
            {/* Botón Volver Strictly linked to navigate(-1) */}
            <button onClick={() => navigate(-1)} className="p-1.5 text-[#00D1FF] hover:bg-[#00D1FF]/10 rounded-md transition-all active:scale-90 border border-transparent hover:border-[#00D1FF]/20">
               <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <button onClick={handleSaveMatrix} className="px-4 h-8 bg-[#1f2937] hover:bg-emerald-800 text-white font-black uppercase text-[9px] rounded-md border border-slate-700 transition-all flex items-center gap-2 tracking-widest">
               <CheckIcon className="w-4 h-4" /> GUARDAR
            </button>
         </div>

         <div className="w-px h-6 bg-slate-800 mx-2" />

         <div className="flex items-center gap-4">
            <button onClick={() => setShowCatalog(true)} className="flex items-center gap-2 text-[#00D1FF] hover:text-[#00D1FF]/80 text-[10px] font-black uppercase tracking-widest transition-all">
               <ZapIcon className="w-4.5 h-4.5" /> SELECTOR GLOBAL
            </button>
            <div className="flex h-7 bg-black rounded border border-slate-800 overflow-hidden shadow-inner">
               <button onClick={() => setViewMode('limits')} className={`px-4 text-[9px] font-black uppercase transition-all ${viewMode === 'limits' ? 'bg-[#00D1FF] text-white' : 'text-slate-500 hover:text-slate-300'}`}>Límites %</button>
               <button onClick={() => setViewMode('kg')} className={`px-4 text-[9px] font-black uppercase transition-all ${viewMode === 'kg' ? 'bg-[#00D1FF] text-white' : 'text-slate-500 hover:text-slate-300'}`}>Kilos</button>
            </div>
         </div>

         <div className="flex-1 flex items-center justify-end gap-10">
            <div className="flex items-baseline gap-2"><span className="text-[10px] text-slate-600 font-black uppercase">Formulaciones:</span><span className="text-xl font-black text-indigo-400 font-mono leading-none">{activeDiets.length}</span></div>
            <div className="flex items-baseline gap-2"><span className="text-[10px] text-slate-600 font-black uppercase">Masa Total:</span><span className="text-xl font-black text-[#00D1FF] font-mono leading-none">{totalLoadedKg.toLocaleString()} KG</span></div>
            <button onClick={handleRunAll} disabled={isRunning} className="px-8 h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase rounded-lg shadow-lg flex items-center gap-3 transition-all active:scale-95 tracking-widest text-[11px] border border-emerald-400/20">
               {isRunning ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <CalculatorIcon className="w-5 h-5" />} OPTIMIZAR (F4)
            </button>
         </div>
      </nav>

      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Retractable Sidebar */}
        <aside className={`shrink-0 bg-[#060606] border-r border-slate-800 transition-all duration-300 flex flex-col overflow-hidden z-50 ${isSidebarCollapsed ? 'w-0' : 'w-64'}`}>
           <div className="p-3 shrink-0 border-b border-slate-800 bg-black/10">
              <span className="text-[10px] font-black text-[#00D1FF] uppercase tracking-widest border-l-2 border-[#00D1FF] pl-3 italic">Entorno de Trabajo</span>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5 space-y-2">
              {Object.entries(dietsByCategory).map(([cat, list]) => {
                const isExp = expandedCats[cat] ?? true;
                const allSel = list.length > 0 && list.every(d => activeDietIds.includes(d.id));
                return (
                  <div key={cat} className="rounded-lg overflow-hidden border border-slate-800/40 bg-white/[0.01]">
                    <button onClick={() => setExpandedCats(p => ({...p, [cat]: !isExp}))} className="w-full flex items-center justify-between p-2.5 hover:bg-white/5 transition-colors">
                       <span className="text-[9px] font-black text-slate-600 uppercase italic truncate max-w-[130px]">{cat}</span>
                       <div className="flex items-center gap-2">
                         <input type="checkbox" checked={allSel} onClick={(e) => e.stopPropagation()} onChange={() => { const ids = list.map(d => d.id); setActiveDietIds(prev => allSel ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))); }} className="w-3 h-3 rounded bg-black border-slate-700 text-[#00D1FF]" />
                         <ChevronDownIcon className={`w-3 h-3 text-slate-800 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                       </div>
                    </button>
                    {isExp && (
                      <div className="p-0.5 space-y-0.5 bg-black/20">
                        {list.map(d => (
                          <button key={d.id} onClick={() => setActiveDietIds(p => p.includes(d.id) ? p.filter(id => id !== d.id) : [...p, d.id])} 
                            className={`w-full text-left px-4 py-2.5 rounded text-[11px] font-black uppercase transition-all tracking-tight ${activeDietIds.includes(d.id) ? 'bg-slate-800 text-white border border-white/5 shadow-xl' : 'text-slate-700 hover:bg-white/5 hover:text-slate-400'}`}>
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

        {/* Sidebar Collapse Toggle */}
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`absolute bottom-6 z-[60] p-1.5 bg-slate-900 hover:bg-[#00D1FF] hover:text-white text-slate-400 rounded-full shadow-2xl transition-all border border-slate-700 active:scale-90 ${isSidebarCollapsed ? 'left-6' : 'left-[15.2rem]'}`}>
           {isSidebarCollapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
        </button>

        {/* Matrix Canvas (Tabla Industrial Rígida) */}
        <div className="flex-1 overflow-auto bg-[#010101] custom-scrollbar">
           <table className="border-collapse border-spacing-0 table-fixed">
              <thead>
                <tr className="sticky top-0 z-[60]">
                  {/* Columna Lateral: Ancho Fijo 280px */}
                  <th className="sticky left-0 z-[70] bg-[#040404] border-b-2 border-r-2 border-slate-800 p-4 pl-10 text-left w-[280px] shadow-xl">
                     <span className="text-[10px] font-black text-slate-600 uppercase italic tracking-[0.4em]">Vectores Maestros</span>
                  </th>
                  {activeDiets.map(diet => (
                    <th key={diet.id} className="bg-[#080808] border-b-2 border-r border-slate-800 p-0 w-[200px]">
                       <div className="flex flex-col h-full">
                          <div className="flex items-center justify-between gap-2 p-3 bg-black/80">
                            {/* Único icono de Papelera Roja */}
                            <button onClick={() => setActiveDietIds(p => p.filter(id => id !== diet.id))} className="text-red-600 hover:text-red-400 transition-all p-1">
                               <TrashIcon className="w-5 h-5" />
                            </button>
                            <span className="text-[12px] font-black text-[#00D1FF] uppercase truncate text-center flex-1 tracking-tight italic font-mono">{diet.name}</span>
                            <CheckIcon className={`w-4 h-4 ${results[diet.id]?.feasible ? 'text-emerald-500' : 'text-slate-800'}`} />
                          </div>
                          <div className="flex items-center justify-center py-2 bg-black/40 border-t border-slate-800/20 gap-2">
                             <span className="text-[9px] font-black text-slate-700 uppercase">KG Lote:</span>
                             <input type="number" value={batchSizes[diet.id] || 1000} onFocus={e => (e.target as HTMLInputElement).select()} onChange={e => { const v = parseInt(e.target.value) || 0; setBatchSizes(prev => ({...prev, [diet.id]: v})); setHasRun(false); }} className="w-16 bg-slate-900 text-[10px] font-black text-[#00D1FF] font-mono rounded outline-none text-center h-5 border border-slate-800 focus:border-[#00D1FF]/30 transition-all" />
                          </div>
                       </div>
                    </th>
                  ))}
                  {/* Espacio neutro si hay pocas dietas */}
                  <th className="bg-[#010101] border-b-2 border-slate-800 w-full min-w-[50px]"></th>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-800/40">
                {/* SECTOR I: Alineación Geométrica Precision */}
                <tr className="bg-[#050505] sticky top-[74px] z-50 border-b border-slate-800 h-8">
                   <td className="sticky left-0 bg-[#050505] z-[55] px-10 border-r-2 border-slate-800">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Sector I: Insumos</span>
                   </td>
                   {activeDiets.map(diet => (
                     <td key={`h1-${diet.id}`} className="p-0 border-r border-slate-800 bg-emerald-950/5">
                        <div className="grid grid-cols-3 h-8 divide-x divide-slate-800/20">
                           <div className="flex items-center justify-center text-[10px] font-black text-emerald-500/80 uppercase">Min</div>
                           <div className="flex items-center justify-center text-[10px] font-black text-emerald-500/80 uppercase">Max</div>
                           <div className="flex items-center justify-center text-[10px] font-black text-[#00D1FF]/80 uppercase">{viewMode === 'limits' ? 'Ok%' : 'Kg'}</div>
                        </div>
                     </td>
                   ))}
                   <td className="bg-[#010101] w-full"></td>
                </tr>

                {activeRows.filter(r => r.type === 'ing').map((row, rIdx) => (
                  <tr key={row.id} className="h-9 group hover:bg-[#00D1FF]/[0.01] transition-all">
                    <td className="sticky left-0 z-40 bg-[#030303] border-r-2 border-slate-800 px-10 py-0 shadow-xl group-focus-within:bg-slate-900 transition-colors">
                       <div className="flex items-center justify-between h-full py-0.5">
                         <div className="flex flex-col gap-0 select-text overflow-hidden">
                            <span className="text-[13px] font-black text-white/90 uppercase tracking-tight truncate leading-none mb-0.5">{row.name}</span>
                            <span className="text-[11px] text-slate-700 font-bold uppercase italic font-mono scale-90 origin-left">${row.price?.toFixed(2)} / kg</span>
                         </div>
                         <button onClick={() => handleRemoveRow(row.id)} className="text-red-800/60 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                            <TrashIcon className="w-4 h-4" />
                         </button>
                       </div>
                    </td>
                    {activeDiets.map(diet => {
                      const c = constraints[row.id]?.[diet.id];
                      const res = results[diet.id];
                      const val = res?.formula[row.id] ?? 0;
                      return (
                        <td key={diet.id} className="p-0 border-r border-slate-800/40 h-full w-[200px]">
                           <div className="grid grid-cols-3 h-9 divide-x divide-slate-800/40">
                              <DiagnosticCell row={row} dietId={diet.id} value={c?.min} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'min', v)} hasRun={hasRun} cellIndex={0} rowIndex={rIdx} />
                              <DiagnosticCell row={row} dietId={diet.id} value={c?.max} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'max', v)} hasRun={hasRun} cellIndex={1} rowIndex={rIdx} />
                              <DiagnosticCell row={row} dietId={diet.id} value={val} isResult resultValue={val} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={res?.feasible ?? true} min={c?.min} max={c?.max} shadowPrice={res?.shadowPrices[row.id]} hasRun={hasRun} cellIndex={2} rowIndex={rIdx} />
                           </div>
                        </td>
                      );
                    })}
                    <td className="bg-[#010101] w-full"></td>
                  </tr>
                ))}

                {/* SECTOR II: Nutrientes */}
                <tr className="bg-[#050505] sticky top-[74px] z-50 border-b border-slate-800 h-8">
                   <td className="sticky left-0 bg-[#050505] z-[55] px-10 border-r-2 border-slate-800">
                      <span className="text-[10px] font-black text-[#00D1FF] uppercase tracking-widest italic">Sector II: Requerimientos</span>
                   </td>
                   {activeDiets.map(diet => (
                     <td key={`h2-${diet.id}`} className="p-0 border-r border-slate-800 bg-[#00D1FF]/5">
                        <div className="grid grid-cols-3 h-8 divide-x divide-slate-800/20">
                           <div className="flex items-center justify-center text-[10px] font-black text-[#00D1FF]/80 uppercase">Min</div>
                           <div className="flex items-center justify-center text-[10px] font-black text-[#00D1FF]/80 uppercase">Max</div>
                           <div className="flex items-center justify-center text-[10px] font-black text-[#00D1FF]/80 uppercase">Actual</div>
                        </div>
                     </td>
                   ))}
                   <td className="bg-[#010101] w-full"></td>
                </tr>

                {activeRows.filter(r => r.type === 'nut').map((row, rIdx) => {
                  const baseIdx = activeRows.filter(r => r.type === 'ing').length;
                  return (
                    <tr key={row.id} className="h-9 group hover:bg-[#00D1FF]/[0.01] transition-all">
                      <td className="sticky left-0 z-40 bg-[#030303] border-r-2 border-slate-800 px-10 py-0 shadow-xl group-focus-within:bg-slate-900 transition-colors">
                         <div className="flex items-center justify-between h-full py-0.5">
                           <div className="flex flex-col gap-0 select-text overflow-hidden">
                              <span className="text-[13px] font-black text-white/90 uppercase tracking-tight truncate leading-none mb-0.5">{row.name}</span>
                              <span className="text-[11px] text-slate-700 font-bold uppercase italic font-mono scale-90 origin-left">UNI: {row.unit}</span>
                           </div>
                           <button onClick={() => handleRemoveRow(row.id)} className="text-red-800/60 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                              <TrashIcon className="w-4 h-4" />
                           </button>
                         </div>
                      </td>
                      {activeDiets.map(diet => {
                        const c = constraints[row.id]?.[diet.id];
                        const res = results[diet.id];
                        const val = res?.nutrients[row.id] ?? 0;
                        return (
                          <td key={diet.id} className="p-0 border-r border-slate-800/40 h-full w-[200px]">
                             <div className="grid grid-cols-3 h-9 divide-x divide-slate-800/40">
                                <DiagnosticCell row={row} dietId={diet.id} value={c?.min} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'min', v)} hasRun={hasRun} cellIndex={0} rowIndex={baseIdx + rIdx} />
                                <DiagnosticCell row={row} dietId={diet.id} value={c?.max} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'max', v)} hasRun={hasRun} cellIndex={1} rowIndex={baseIdx + rIdx} />
                                <DiagnosticCell row={row} dietId={diet.id} value={val} isResult resultValue={val} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={res?.feasible ?? true} min={c?.min} max={c?.max} shadowPrice={res?.shadowPrices[row.id]} hasRun={hasRun} cellIndex={2} rowIndex={baseIdx + rIdx} />
                             </div>
                          </td>
                        );
                      })}
                      <td className="bg-[#010101] w-full"></td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot className="sticky bottom-0 z-[60] shadow-[0_-10px_20px_rgba(0,0,0,0.8)] border-t-2 border-slate-800">
                <tr className="bg-[#050505] h-14">
                   <td className="p-4 px-10 sticky left-0 z-[70] bg-[#030303] border-r-2 border-slate-800 shadow-2xl">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black text-[#00D1FF] uppercase tracking-widest leading-none mb-1">DIAGNÓSTICO FINAL</span>
                        <span className="text-[10px] text-slate-700 font-bold uppercase italic font-mono scale-90 origin-left">Valorización Óptima</span>
                      </div>
                   </td>
                   {activeDiets.map(diet => {
                     const r = results[diet.id];
                     const diff = r && r.prevCostPerKg ? r.costPerKg - r.prevCostPerKg : 0;
                     return (
                       <td key={diet.id} className="border-r border-slate-800/60 p-2 bg-black/90 backdrop-blur-md w-[200px]">
                         {r && hasRun ? (
                           <div className={`flex flex-col items-center justify-center gap-1 rounded p-1.5 transition-all ${r.feasible ? 'bg-emerald-600' : 'bg-red-600'}`}>
                              <div className="flex items-center gap-3">
                                <span className="text-[22px] font-black font-mono leading-none tracking-tighter text-white">
                                  ${r.costPerKg.toFixed(2)}
                                </span>
                                {diff !== 0 && (
                                  <span className={`text-[10px] font-black ${diff > 0 ? 'text-red-200' : 'text-emerald-100'} px-1 py-0.5 rounded bg-black/40`}>
                                    {diff > 0 ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] font-black uppercase tracking-widest text-white/60 font-mono">
                                 {r.feasible ? 'OPTIMIZADO' : 'INFACTIBLE'}
                              </div>
                           </div>
                         ) : <div className="text-[10px] text-slate-800 font-black uppercase text-center italic py-2 tracking-widest opacity-20">PENDIENTE F4</div>}
                       </td>
                     );
                   })}
                   <td className="bg-[#010101] w-full"></td>
                </tr>
              </tfoot>
           </table>
        </div>
      </main>
    </div>
  );
};
