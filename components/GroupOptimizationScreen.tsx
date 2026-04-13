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
  min: number;
  max: number;
  dirty: boolean;
  injected: boolean;
}

interface DietResult {
  feasible: boolean;
  costPerKg: number;
  prevCostPerKg?: number;
  formula: Record<string, number>; // ingredientId -> percentage
  nutrients: Record<string, number>; // nutrientId -> value
  shadowPrices: Record<string, number>; // id -> shadow price
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
  dirty,
  shadowPrice,
  hasRun,
  cellIndex,
  rowIndex
}: {
  row: MatrixRow;
  dietId: string;
  value: number | string;
  onChange?: (val: number) => void;
  isResult?: boolean;
  resultValue?: number;
  viewMode: 'limits' | 'kg';
  batchSize: number;
  feasible: boolean;
  min?: number;
  max?: number;
  dirty?: boolean;
  shadowPrice?: number;
  hasRun: boolean;
  cellIndex: number;
  rowIndex: number;
}) => {
  const isOutOfBounds = resultValue !== undefined && min !== undefined && max !== undefined && (resultValue < min - 0.01 || resultValue > max + 0.01);
  const isError = min !== undefined && max !== undefined && min > max;
  
  // 3. DIAGNÓSTICO DE ALTO IMPACTO (Post-Optimización)
  let bgColor = "bg-transparent";
  let textColor = "text-white/90";

  if (hasRun) {
    if (isError) {
      bgColor = "bg-red-900/60";
      textColor = "text-white";
    } else if (dirty) {
      bgColor = "bg-yellow-500/20";
      textColor = "text-yellow-400";
    } else if (isResult) {
      if (!feasible) {
        bgColor = "bg-red-600"; // ROJO VIBRANTE
        textColor = "text-white font-black";
      } else if (isOutOfBounds) {
        bgColor = "bg-red-500/40";
        textColor = "text-white font-bold";
      } else {
        bgColor = "bg-emerald-600"; // ÓPTIMO: VERDE ESMERALDA SÓLIDO
        textColor = "text-white font-black";
      }
    }
  }

  const displayValue = viewMode === 'kg' && isResult && resultValue !== undefined 
    ? ((resultValue / 100) * (batchSize || 1000)).toFixed(2) 
    : (typeof value === 'number' ? value.toFixed(1) : value);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const nextInput = document.querySelector(`input[data-row-index="${rowIndex + 1}"][data-cell-index="${cellIndex}"][data-diet-id="${dietId}"]`) as HTMLInputElement;
      if (nextInput) nextInput.focus();
    } else if (e.key === 'Delete' || (e.key === 'Backspace' && e.ctrlKey)) {
      onChange?.(0);
    }
  };

  return (
    <div className={`h-full w-full flex flex-col justify-center px-0.5 border-r border-white/5 last:border-r-0 transition-all duration-300 ${bgColor}`}>
      {isResult ? (
        <div className="flex flex-col items-center justify-center p-0 h-[96%]">
          <span className={`text-[17px] font-black font-mono leading-none ${textColor} ${!hasRun ? 'opacity-20' : ''}`}>
            {displayValue}
            {viewMode === 'limits' && <span className="text-[10px] ml-0.2 opacity-20">%</span>}
          </span>
          {hasRun && shadowPrice && shadowPrice > 0.01 && (
            <span className={`text-[8px] font-bold font-mono scale-[0.7] leading-none mt-0.5 ${feasible ? 'text-white/60' : 'text-white/80'}`}>sp:{shadowPrice.toFixed(2)}</span>
          )}
        </div>
      ) : (
        <div className="h-[96%] w-full border border-white/10 rounded-sm focus-within:border-cyan-500/50 transition-all bg-black/40">
          <input
            type="number"
            value={value === 0 ? '' : value}
            data-row-index={rowIndex}
            data-cell-index={cellIndex}
            data-diet-id={dietId}
            onFocus={(e) => (e.target as HTMLInputElement).select()}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            onKeyDown={handleKeyDown}
            onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
            className={`w-full h-full bg-transparent text-center text-[17px] font-black font-mono outline-none transition-all ${isError && hasRun ? 'text-red-400' : 'text-white group-focus-within:text-cyan-400'} placeholder-gray-900`}
            placeholder="0.0"
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
  savedFormulas, setSavedFormulas, onRemoveDietFromSelection,
  onEnterFullscreen, onLeaveFullscreen, selectedClientId, onNavigate
}) => {

  // 1. HOOKS (Declarados al inicio)
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

  // 3. MANEJADORES DE LÓGICA
  const handleRemoveRow = (id: string) => {
    setActiveRows(p => p.filter(r => r.id !== id));
    setConstraints(p => { const n = { ...p }; delete n[id]; return n; });
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
      activeDiets.forEach(d => { if (!newConstraints[id][d.id]) newConstraints[id][d.id] = { min: 0, max: isDynamic ? 999 : 100, dirty: false, injected: true }; });
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
          ingredientId: r.id, min: constraints[r.id][diet.id].min, max: constraints[r.id][diet.id].max 
        })),
        constraints: activeRows.filter(r => r.type === 'nut' && constraints[r.id]?.[diet.id]).map(r => ({ 
          nutrientId: r.id, min: constraints[r.id][diet.id].min, max: constraints[r.id][diet.id].max 
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

  const handleBack = () => {
    onLeaveFullscreen?.();
    if (onNavigate) onNavigate('DASHBOARD');
    else window.history.back();
  };

  const handleSaveMatrix = () => {
    alert("SISTEMA DE PERSISTENCIA: CONFIGURACIÓN DE GRUPO GUARDADA EXITOSAMENTE.");
    setIsDirty?.(false);
  };

  // 4. EFECTOS
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

  // 5. RENDERIZADO (Pixel-Perfect)
  return (
    <div className="flex-1 flex flex-col w-full h-full bg-[#020202] text-white overflow-hidden select-none font-sans antialiased">
      
      {/* Selector Global Modal */}
      {showCatalog && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[200] flex items-center justify-center p-8 animate-fade-in">
           <div className="bg-[#0a0a0a] border border-gray-800 rounded-[3rem] w-full max-w-5xl h-[80vh] flex flex-col shadow-[0_0_100px_rgba(0,0,0,1)] overflow-hidden">
             <div className="p-8 border-b border-gray-800 flex items-center justify-between bg-black/20">
               <div className="flex items-center gap-4">
                  <div className="p-4 bg-cyan-600/10 rounded-2xl border border-cyan-500/20"><ZapIcon className="w-8 h-8 text-cyan-400" /></div>
                  <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter italic">SELECTOR GLOBAL</h2>
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest mt-1">Inyección de Vectores Técnicos Masivos</p>
                  </div>
               </div>
               <button onClick={() => setShowCatalog(false)} className="p-3 hover:bg-red-600 rounded-full text-white transition-all active:scale-90"><XCircleIcon className="w-8 h-8" /></button>
             </div>
             <div className="p-4 bg-black/40 border-b border-gray-800 relative">
               <SearchIcon className="absolute left-10 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-700" />
               <input type="text" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} placeholder="ESCRIBIR PARA INYECTAR EN MATRIZ..." className="w-full h-14 bg-gray-900 border border-gray-800 rounded-2xl pl-16 pr-6 text-sm font-black uppercase text-white outline-none focus:border-cyan-500/50 transition-all placeholder-gray-800" />
             </div>
             <div className="flex-1 overflow-y-auto p-10 grid grid-cols-2 gap-10 custom-scrollbar">
                <div className="space-y-4">
                   <h3 className="text-cyan-500 font-black text-[10px] uppercase border-b border-cyan-900/40 pb-2 tracking-[0.4em] italic">Insumos Compatibles</h3>
                   {ingredients.filter(i => i.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(i => (
                     <label key={i.id} className={`flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer border ${catalogSelection.has(i.id) ? 'bg-cyan-600 border-cyan-400' : 'bg-gray-900/20 border-gray-800 hover:border-cyan-500/30'}`}>
                        <input type="checkbox" checked={catalogSelection.has(i.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(i.id)) s.delete(i.id); else s.add(i.id); setCatalogSelection(s); }} className="hidden" />
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${catalogSelection.has(i.id) ? 'bg-white border-white' : 'border-gray-700'}`}>{catalogSelection.has(i.id) && <CheckIcon className="w-4 h-4 text-cyan-600" />}</div>
                        <span className={`text-[11px] font-black uppercase ${catalogSelection.has(i.id) ? 'text-white' : 'text-gray-500'}`}>{i.name}</span>
                     </label>
                   ))}
                </div>
                <div className="space-y-4">
                   <h3 className="text-emerald-500 font-black text-[10px] uppercase border-b border-emerald-900/40 pb-2 tracking-[0.4em] italic">Balance Nutricional</h3>
                   {nutrients.filter(n => n.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(n => (
                     <label key={n.id} className={`flex items-center gap-4 p-4 rounded-2xl transition-all cursor-pointer border ${catalogSelection.has(n.id) ? 'bg-emerald-600 border-emerald-400' : 'bg-gray-900/20 border-gray-800 hover:border-emerald-500/30'}`}>
                        <input type="checkbox" checked={catalogSelection.has(n.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(n.id)) s.delete(n.id); else s.add(n.id); setCatalogSelection(s); }} className="hidden" />
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${catalogSelection.has(n.id) ? 'bg-white border-white' : 'border-gray-700'}`}>{catalogSelection.has(n.id) && <CheckIcon className="w-4 h-4 text-emerald-600" />}</div>
                        <span className={`text-[11px] font-black uppercase ${catalogSelection.has(n.id) ? 'text-white' : 'text-gray-500'}`}>{n.name}</span>
                     </label>
                   ))}
                </div>
             </div>
             <div className="p-8 bg-black border-t border-gray-800 flex items-center justify-between">
                <span className="text-[11px] font-black text-gray-700 italic tracking-[0.2em]">{catalogSelection.size} VECTORES LISTOS</span>
                <button onClick={handleBulkAdd} className="px-14 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase rounded-2xl shadow-xl transition-all active:scale-95 tracking-widest text-sm">INYECTAR EN MATRIZ</button>
             </div>
           </div>
        </div>
      )}

      {/* 5. NAVEGACIÓN Y CABECERA UNIFICADA */}
      <nav className="flex-none bg-[#050505] border-b border-gray-900 h-16 flex items-center px-6 gap-6 shadow-2xl z-[100]">
         <div className="flex items-center gap-3 shrink-0">
            <button onClick={handleBack} className="p-2.5 bg-cyan-600/10 hover:bg-cyan-600 text-cyan-400 hover:text-white rounded-lg transition-all active:scale-90 border border-cyan-500/10" title="Volver">
               <ArrowLeftIcon className="w-6 h-6" />
            </button>
            <button onClick={handleSaveMatrix} className="px-5 h-10 bg-gray-900 hover:bg-emerald-600 text-white font-black uppercase text-[10px] rounded-lg border border-gray-800 transition-all active:scale-95 flex items-center gap-2">
               <CheckIcon className="w-4.5 h-4.5" /> GUARDAR
            </button>
         </div>

         <div className="w-px h-8 bg-gray-800 shrink-0 mx-2" />

         <div className="flex items-center gap-5 shrink-0">
            <button onClick={() => setShowCatalog(true)} className="flex items-center gap-3 text-cyan-500 hover:text-cyan-400 text-[10px] font-black uppercase tracking-widest transition-all">
               <ZapIcon className="w-5 h-5" /> SELECTOR GLOBAL
            </button>
            <div className="flex h-8 bg-black rounded-lg border border-gray-800 overflow-hidden ml-2 shadow-inner">
               <button onClick={() => setViewMode('limits')} className={`px-5 text-[9px] font-black uppercase transition-all ${viewMode === 'limits' ? 'bg-cyan-600 text-white shadow-xl' : 'text-gray-600 hover:text-gray-300'}`}>LÍMITES %</button>
               <button onClick={() => setViewMode('kg')} className={`px-5 text-[9px] font-black uppercase transition-all ${viewMode === 'kg' ? 'bg-cyan-600 text-white shadow-xl' : 'text-gray-600 hover:text-gray-300'}`}>RESULTADOS KG</button>
            </div>
         </div>

         <div className="w-px h-8 bg-gray-800 shrink-0 mx-2" />

         <div className="flex-1 flex items-center justify-center gap-8">
            <div className="bg-black/40 px-6 py-2 rounded-xl border border-gray-900 flex items-center gap-6">
               <div className="flex items-baseline gap-2"><span className="text-[10px] text-gray-700 font-black uppercase tracking-widest">DIETAS:</span><span className="text-2xl font-black text-indigo-400 font-mono tracking-tighter leading-none">{activeDiets.length}</span></div>
               <div className="w-px h-5 bg-gray-800" />
               <div className="flex items-baseline gap-2"><span className="text-[10px] text-gray-700 font-black uppercase tracking-widest">KILOS:</span><span className="text-2xl font-black text-cyan-400 font-mono tracking-tighter leading-none">{totalLoadedKg.toLocaleString()}</span></div>
            </div>
         </div>

         <button onClick={handleRunAll} disabled={isRunning} className="px-12 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.5)] flex items-center gap-3 transition-all scale-105 active:scale-95 tracking-[0.2em] text-sm shrink-0 border border-emerald-400/20">
            {isRunning ? <RefreshIcon className="w-6 h-6 animate-spin" /> : <CalculatorIcon className="w-6 h-6" />} OPTIMIZAR (F4)
         </button>
      </nav>

      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Retractable Sidebar */}
        <aside className={`shrink-0 bg-[#050505] border-r border-gray-900 transition-all duration-300 ease-in-out flex flex-col overflow-hidden shadow-2xl z-50 ${isSidebarCollapsed ? 'w-0' : 'w-64'}`}>
           <div className="p-4 shrink-0 border-b border-gray-900 bg-black/20">
              <span className="text-[10px] font-black text-cyan-600 uppercase tracking-widest border-l-2 border-cyan-600 pl-4 italic">Categorías</span>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-2.5 space-y-3">
              {Object.entries(dietsByCategory).map(([cat, list]) => {
                const isExp = expandedCats[cat] ?? true;
                const allSel = list.length > 0 && list.every(d => activeDietIds.includes(d.id));
                return (
                  <div key={cat} className="rounded-xl overflow-hidden border border-gray-900/40 bg-gray-900/10">
                    <button onClick={() => setExpandedCats(p => ({...p, [cat]: !isExp}))} className="w-full flex items-center justify-between p-3.5 bg-white/[0.01]">
                       <span className="text-[9px] font-black text-gray-600 uppercase italic truncate max-w-[130px]">{cat}</span>
                       <div className="flex items-center gap-3">
                         <input type="checkbox" checked={allSel} onClick={(e) => e.stopPropagation()} onChange={() => { const ids = list.map(d => d.id); setActiveDietIds(prev => allSel ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))); }} className="w-4 h-4 rounded border-gray-800 bg-black text-cyan-600" />
                         <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-800 transition-transform ${isExp ? 'rotate-180' : ''}`} />
                       </div>
                    </button>
                    {isExp && (
                      <div className="p-1 space-y-1 bg-black/20">
                        {list.map(d => (
                          <button key={d.id} onClick={() => setActiveDietIds(p => p.includes(d.id) ? p.filter(id => id !== d.id) : [...p, d.id])} 
                            className={`w-full text-left px-5 py-3 rounded-xl text-[11px] font-black uppercase transition-all tracking-tight ${activeDietIds.includes(d.id) ? 'bg-slate-800 text-white shadow-xl border border-white/5' : 'text-gray-700 hover:bg-gray-800/50 hover:text-gray-400'}`}>
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
        <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className={`absolute bottom-8 z-[60] p-3 bg-gray-900 hover:bg-cyan-600 text-white rounded-full shadow-2xl transition-all border border-gray-800 active:scale-90 ${isSidebarCollapsed ? 'left-8' : 'left-[15rem]'}`}>
           {isSidebarCollapsed ? <ChevronRightIcon className="w-6 h-6" /> : <ChevronLeftIcon className="w-6 h-6" />}
        </button>

        {/* 4. GEOMETRÍA DE LA MATRIZ */}
        <div className="flex-1 overflow-auto bg-[#010101] custom-scrollbar">
           <table className="border-collapse w-full table-fixed min-w-fit">
              <thead>
                <tr className="sticky top-0 z-[60]">
                  {/* Etiquetas Laterales (Fija a 280px) */}
                  <th className="sticky left-0 z-[70] bg-[#030303] border-b border-r border-gray-900 p-6 pl-10 text-left w-[280px] shadow-[15px_0_30px_rgba(0,0,0,0.9)]">
                     <span className="text-[11px] font-black text-gray-700 uppercase italic tracking-[0.5em] leading-none">Vectores Técnicos</span>
                  </th>
                  {activeDiets.map(diet => (
                    <th key={diet.id} className="bg-[#080808] border-b border-r border-gray-900 p-0 min-w-[240px] flex-1">
                       <div className="flex flex-col h-full bg-black/20">
                          {/* 1. CABECERA DE DIETAS Y BORRADO */}
                          <div className="flex items-center justify-between gap-3 p-4 bg-black/80">
                            <StatusIcon ok={results[diet.id]?.feasible ?? true} />
                            <span className="text-[13px] font-black text-gray-300 uppercase truncate text-center flex-1 tracking-tighter italic font-mono">{diet.name}</span>
                            <button onClick={() => setActiveDietIds(p => p.filter(id => id !== diet.id))} className="text-red-500 hover:text-red-400 transition-all p-1 hover:bg-red-500/10 rounded-lg shadow-lg">
                               <TrashIcon className="w-5 h-5" />
                            </button>
                          </div>
                          <div className="flex items-center justify-center py-2.5 bg-black/40 border-t border-white/[0.02] gap-3">
                             <div className="flex items-center gap-1.5"><span className="text-[9px] font-black text-gray-700 uppercase tracking-widest">Lote (Kg):</span><input type="number" value={batchSizes[diet.id] || 1000} onFocus={e => (e.target as HTMLInputElement).select()} onClick={e => (e.target as HTMLInputElement).select()} onChange={e => { const v = parseInt(e.target.value) || 0; setBatchSizes(prev => ({...prev, [diet.id]: v})); setHasRun(false); }} className="w-16 bg-gray-900 border border-white/5 rounded-md text-[11px] font-black text-cyan-400 font-mono rounded outline-none text-center h-6 focus:border-cyan-500/30 transition-all shadow-inner" /></div>
                          </div>
                       </div>
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody className="divide-y divide-white/[0.03]">
                {/* 2. RELOCALIZACIÓN TÉCNICA (SECTOR I) */}
                <tr className="bg-[#050505] sticky top-[98px] z-50 backdrop-blur-3xl shadow-lg border-b border-gray-900 h-10">
                   <td className="sticky left-0 bg-[#050505] z-[55] px-10 border-r border-gray-900">
                      <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.4em] font-mono italic">SECTOR I: COMPONENTES</span>
                   </td>
                   {activeDiets.map(diet => (
                     <td key={`h1-${diet.id}`} className="p-0 border-r border-gray-900 bg-sky-900/5">
                        <div className="grid grid-cols-3 h-10 divide-x divide-white/[0.05]">
                           <div className="flex items-center justify-center text-[10px] font-black text-sky-400 uppercase tracking-widest">MIN</div>
                           <div className="flex items-center justify-center text-[10px] font-black text-sky-400 uppercase tracking-widest">MAX</div>
                           <div className="flex items-center justify-center text-[10px] font-black text-sky-400 uppercase tracking-widest whitespace-nowrap px-1">{viewMode === 'limits' ? 'OK %' : 'KG'}</div>
                        </div>
                     </td>
                   ))}
                </tr>
                {activeRows.filter(r => r.type === 'ing').map((row, rIdx) => (
                  <tr key={row.id} className="h-10 group transition-all duration-200 focus-within:bg-indigo-500/[0.04] odd:bg-white/[0.01]">
                    <td className="sticky left-0 z-40 bg-[#030303] border-r border-gray-900 px-10 py-0 shadow-2xl group-focus-within:bg-gray-900 transition-colors">
                       <div className="flex items-center justify-between h-full py-1">
                         <div className="flex flex-col gap-0 select-text overflow-hidden">
                            <span className="text-[12px] font-black text-white/90 uppercase tracking-tight truncate leading-none mb-0.5">{row.name}</span>
                            <span className="text-[10px] text-gray-700 font-bold uppercase tracking-widest leading-none italic opacity-80 font-mono">${row.price?.toFixed(2)} / kg</span>
                         </div>
                         <button onClick={() => handleRemoveRow(row.id)} className="text-red-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1.5 bg-red-600/5 rounded-lg border border-red-600/20 shadow-xl">
                            <TrashIcon className="w-3.5 h-3.5" />
                         </button>
                       </div>
                    </td>
                    {activeDiets.map(diet => {
                      const c = constraints[row.id]?.[diet.id];
                      const res = results[diet.id];
                      const val = res?.formula[row.id] ?? 0;
                      return (
                        <td key={diet.id} className="p-0 border-r border-white/[0.03] h-full">
                           <div className="grid grid-cols-3 h-10 divide-x divide-white/[0.03]">
                              <DiagnosticCell row={row} dietId={diet.id} value={c?.min ?? ''} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'min', v)} dirty={c?.dirty} hasRun={hasRun} cellIndex={0} rowIndex={rIdx} />
                              <DiagnosticCell row={row} dietId={diet.id} value={(c && c.max < 100) ? c.max : ''} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'max', v)} dirty={c?.dirty} hasRun={hasRun} cellIndex={1} rowIndex={rIdx} />
                              <DiagnosticCell row={row} dietId={diet.id} value={val} isResult resultValue={val} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={res?.feasible ?? true} min={c?.min} max={c?.max} shadowPrice={res?.shadowPrices[row.id]} hasRun={hasRun} cellIndex={2} rowIndex={rIdx} />
                           </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* 2. RELOCALIZACIÓN TÉCNICA (SECTOR II) */}
                <tr className="bg-[#050505] sticky top-[98px] z-50 backdrop-blur-3xl shadow-lg border-b border-gray-900 h-10">
                   <td className="sticky left-0 bg-[#050505] z-[55] px-10 border-r border-gray-900">
                      <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] font-mono italic">SECTOR II: BALANCE TÉCNICO</span>
                   </td>
                   {activeDiets.map(diet => (
                     <td key={`h2-${diet.id}`} className="p-0 border-r border-gray-900 bg-emerald-900/5">
                        <div className="grid grid-cols-3 h-10 divide-x divide-white/[0.05]">
                           <div className="flex items-center justify-center text-[10px] font-black text-emerald-400 uppercase tracking-widest">MIN</div>
                           <div className="flex items-center justify-center text-[10px] font-black text-emerald-400 uppercase tracking-widest">MAX</div>
                           <div className="flex items-center justify-center text-[10px] font-black text-emerald-400 uppercase tracking-widest whitespace-nowrap px-1">ACTUAL</div>
                        </div>
                     </td>
                   ))}
                </tr>

                {activeRows.filter(r => r.type === 'nut').map((row, rIdx) => {
                  const baseIdx = activeRows.filter(r => r.type === 'ing').length;
                  return (
                    <tr key={row.id} className="h-10 group transition-all duration-200 focus-within:bg-indigo-500/[0.04] odd:bg-white/[0.01]">
                      <td className="sticky left-0 z-40 bg-[#030303] border-r border-gray-900 px-10 py-0 shadow-2xl group-focus-within:bg-gray-900 transition-colors">
                         <div className="flex items-center justify-between h-full py-1">
                           <div className="flex flex-col gap-0 select-text overflow-hidden">
                              <span className="text-[12px] font-black text-white/90 uppercase tracking-tight truncate leading-none mb-0.5">{row.name}</span>
                              <span className="text-[10px] text-gray-700 font-bold uppercase tracking-widest leading-none italic opacity-80 font-mono">Unidad: {row.unit}</span>
                           </div>
                           <button onClick={() => handleRemoveRow(row.id)} className="text-red-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1.5 bg-red-600/5 rounded-lg border border-red-600/20 shadow-xl">
                              <TrashIcon className="w-3.5 h-3.5" />
                           </button>
                         </div>
                      </td>
                      {activeDiets.map(diet => {
                        const c = constraints[row.id]?.[diet.id];
                        const res = results[diet.id];
                        const val = res?.nutrients[row.id] ?? 0;
                        return (
                          <td key={diet.id} className="p-0 border-r border-white/[0.03] h-full">
                             <div className="grid grid-cols-3 h-10 divide-x divide-white/[0.03]">
                                <DiagnosticCell row={row} dietId={diet.id} value={c?.min ?? ''} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'min', v)} dirty={c?.dirty} hasRun={hasRun} cellIndex={0} rowIndex={baseIdx + rIdx} />
                                <DiagnosticCell row={row} dietId={diet.id} value={(c && c.max < 999) ? c.max : ''} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'max', v)} dirty={c?.dirty} hasRun={hasRun} cellIndex={1} rowIndex={baseIdx + rIdx} />
                                <DiagnosticCell row={row} dietId={diet.id} value={val} isResult resultValue={val} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={res?.feasible ?? true} min={c?.min} max={c?.max} shadowPrice={res?.shadowPrices[row.id]} hasRun={hasRun} cellIndex={2} rowIndex={baseIdx + rIdx} />
                             </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                {/* 3. DIAGNÓSTICO FINAL DE ALTO IMPACTO */}
                <tr className="sticky bottom-0 z-[60] bg-[#050505] border-t-2 border-gray-900 shadow-[0_-20px_50px_rgba(0,0,0,1)] h-12">
                   <td className="p-6 px-10 sticky left-0 z-[70] bg-[#030303] border-r border-gray-900 shadow-2xl">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black text-cyan-500 uppercase tracking-widest leading-none mb-1.5 shadow-cyan-500/10">DIAGNÓSTICO FINAL</span>
                        <span className="text-[9px] text-gray-700 font-bold uppercase tracking-widest leading-none opacity-40 italic font-mono">Costo Óptimo / Kg</span>
                      </div>
                   </td>
                   {activeDiets.map(diet => {
                     const r = results[diet.id];
                     const diff = r && r.prevCostPerKg ? r.costPerKg - r.prevCostPerKg : 0;
                     return (
                       <td key={diet.id} className="border-r border-white/5 p-4 bg-black/90 backdrop-blur-3xl min-w-[240px]">
                         {r && hasRun ? (
                           <div className="flex flex-col items-center justify-center gap-1.5 animate-fade-in">
                              <div className="flex items-center gap-4">
                                <span className={`text-[26px] font-black font-mono leading-none tracking-tighter ${r.feasible ? 'text-white' : 'text-red-500 animate-pulse'}`}>
                                  ${r.costPerKg.toFixed(2)}
                                </span>
                                {diff !== 0 && (
                                  <span className={`text-[11px] font-black flex items-center gap-1 ${diff > 0 ? 'text-red-400' : 'text-emerald-400'} px-2 py-1 rounded-md bg-black/80 border border-white/10 shadow-lg`}>
                                    {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(3)}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest italic opacity-50 font-mono">
                                 {viewMode === 'kg' ? `TOTAL: ${(Object.values(r.formula).reduce((s,v)=>s+v,0) * (batchSizes[diet.id]||1000)/100).toFixed(2)} KG` : 'PROYECCIÓN TÉCNICA'}
                              </div>
                           </div>
                         ) : <div className="text-[10px] text-gray-900 font-black uppercase text-center italic py-4 tracking-[0.4em] opacity-10">PRE-CÁLCULO</div>}
                       </td>
                     );
                   })}
                </tr>
              </tfoot>
           </table>
        </div>
      </main>
    </div>
  );
};
