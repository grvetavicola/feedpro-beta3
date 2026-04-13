import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Ingredient, Nutrient, SavedFormula } from '../types';
import { solveFeedFormulation } from '../services/solver';
import { 
  CalculatorIcon, RefreshIcon, XCircleIcon, CheckIcon, 
  TrashIcon, SearchIcon, ChevronDownIcon, ChevronLeftIcon, 
  ChevronRightIcon, ArrowLeftIcon 
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
}

// ─── Sub-Components ─────────────────────────────────────────────────────────────

const StatusIcon = ({ ok }: { ok: boolean }) => (
  ok ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <XCircleIcon className="w-4 h-4 text-red-500" />
);

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
  dirty 
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
}) => {
  const isOutOfBounds = resultValue !== undefined && min !== undefined && max !== undefined && (resultValue < min - 0.01 || resultValue > max + 0.01);
  const isError = min !== undefined && max !== undefined && min > max;
  
  let bgColor = "bg-transparent";
  if (isError) bgColor = "bg-red-600/30";
  else if (dirty) bgColor = "bg-yellow-500/20";
  else if (isResult) {
    if (!feasible) bgColor = "bg-red-950/40";
    else if (isOutOfBounds) bgColor = "bg-red-500/20";
    else bgColor = "bg-emerald-500/10";
  }

  const displayValue = viewMode === 'kg' && isResult && resultValue !== undefined 
    ? ((resultValue / 100) * (batchSize || 1000)).toFixed(2) 
    : (typeof value === 'number' ? value.toFixed(2) : value);

  return (
    <div className={`h-full w-full flex flex-col justify-center px-2 transition-all duration-300 ${bgColor} ${isResult ? 'border-l border-gray-800/20' : ''}`}>
      {isResult ? (
        <span className={`text-[15px] font-black font-mono text-center ${!feasible || isOutOfBounds ? 'text-red-500' : 'text-emerald-400'}`}>
          {displayValue}
          {viewMode === 'limits' && <span className="text-[10px] ml-0.5 opacity-40">%</span>}
        </span>
      ) : (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
          className={`w-full bg-transparent text-center text-[15px] font-black font-mono outline-none transition-colors ${isError ? 'text-red-400' : 'text-white focus:text-indigo-400'} placeholder-gray-800`}
          placeholder="0.00"
        />
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────

export const GroupOptimizationScreen: React.FC<GroupOptimizationScreenProps> = ({
  products = [], ingredients = [], nutrients = [], isDynamicMatrix: initialIsDynamic,
  selectedDietIds = [], onUpdateProduct, setIsDirty,
  savedFormulas, setSavedFormulas, onRemoveDietFromSelection,
  onEnterFullscreen, onLeaveFullscreen, selectedClientId
}) => {

  // 1. HOOKS (STATES AT THE TOP)
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

  // 2. DERIVED DATA
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

  const hasValidationError = useMemo(() => {
    for (const row of activeRows) {
      for (const dietId of activeDietIds) {
        const c = constraints[row.id]?.[dietId];
        if (c && c.min > c.max) return true;
      }
    }
    return false;
  }, [activeRows, activeDietIds, constraints]);

  // 3. LOGIC HANDLERS
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

  const handleRunAll = useCallback(() => {
    if (!activeDiets.length || hasValidationError) return;
    setIsRunning(true);
    
    const newResults: Record<string, DietResult> = {};

    activeDiets.forEach(diet => {
      const matrixProduct: Product = {
        ...diet,
        ingredientConstraints: activeRows.filter(r => r.type === 'ing' && constraints[r.id]?.[diet.id]).map(r => ({ 
          ingredientId: r.id, 
          min: constraints[r.id][diet.id].min, 
          max: constraints[r.id][diet.id].max 
        })),
        constraints: activeRows.filter(r => r.type === 'nut' && constraints[r.id]?.[diet.id]).map(r => ({ 
          nutrientId: r.id, 
          min: constraints[r.id][diet.id].min, 
          max: constraints[r.id][diet.id].max 
        }))
      };
      
      const res = solveFeedFormulation(matrixProduct, ingredients, nutrients, batchSizes[diet.id] || 1000, isDynamic);
      
      const formulaMap: Record<string, number> = {};
      const shadowMap: Record<string, number> = {};
      
      res.items.forEach(item => { 
        formulaMap[item.ingredientId] = item.percentage; 
        if (item.shadowPrice) shadowMap[item.ingredientId] = item.shadowPrice;
      });
      
      const nutMap: Record<string, number> = {};
      res.nutrientAnalysis.forEach(na => { 
        nutMap[na.nutrientId] = na.value; 
        if (na.shadowPrice) shadowMap[na.nutrientId] = na.shadowPrice;
      });

      newResults[diet.id] = {
        feasible: res.status === 'OPTIMAL',
        costPerKg: res.totalCost / (batchSizes[diet.id] || 1000),
        prevCostPerKg: results[diet.id]?.costPerKg,
        formula: formulaMap,
        nutrients: nutMap,
        shadowPrices: shadowMap,
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
  }, [activeDiets, activeRows, constraints, batchSizes, ingredients, nutrients, isDynamic, results, hasValidationError, setIsDirty]);

  const handleSaveBulk = () => {
    if (!results || !setSavedFormulas || !selectedClientId) return;
    const itemsToSave = activeDiets.map(diet => {
      const r = results[diet.id];
      if (!r) return null;
      return {
        id: `sf${Date.now()}_${diet.id}`,
        clientId: selectedClientId,
        name: `${diet.name} - OPT - ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString(),
        result: {
            status: r.feasible ? 'OPTIMAL' : 'INFEASIBLE',
            totalCost: r.totalCost,
            items: Object.entries(r.formula).map(([id, p]) => ({ ingredientId: id, weight: (p / 100) * (batchSizes[diet.id] || 1000), percentage: p, cost: 0 })),
            nutrientAnalysis: Object.entries(r.nutrients).map(([id, v]) => ({ nutrientId: id, value: v, min: 0, max: 0, met: true }))
        } as any
      };
    }).filter(f => f !== null) as SavedFormula[];
    
    setSavedFormulas(prev => [...prev, ...itemsToSave]);
    alert(`✓ ${itemsToSave.length} Dietas guardadas exitosamente.`);
  };

  // 4. EFFECTS
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

  // 5. RENDER
  return (
    <div className="flex-1 flex flex-col w-full h-full bg-gray-950 text-white overflow-hidden select-none">
      
      {/* Dynamic Catalog Modal */}
      {showCatalog && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-8 animate-fade-in">
           <div className="bg-gray-900 border border-gray-800 rounded-[3rem] w-full max-w-7xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
             <div className="p-10 border-b border-gray-800 flex items-center justify-between">
               <div>
                  <h2 className="text-4xl font-black text-indigo-400 tracking-tighter italic uppercase leading-none">🛒 Explorar Catálogo</h2>
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-2">Selección maestra de insumos y parámetros</p>
               </div>
               <button onClick={() => setShowCatalog(false)} className="p-4 hover:bg-gray-800 rounded-full text-gray-400 transition-all active:scale-95"><XCircleIcon className="w-12 h-12" /></button>
             </div>
             
             <div className="p-6 bg-black/40 border-b border-gray-800 relative">
               <SearchIcon className="absolute left-10 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-600" />
               <input type="text" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} placeholder="ESCRIBE PARA FILTRAR EL CATÁLOGO..." className="w-full h-16 bg-gray-800 border border-gray-700 rounded-2xl pl-16 pr-6 text-sm font-black uppercase text-white outline-none focus:border-indigo-500 transition-all placeholder-gray-600" />
             </div>

             <div className="flex-1 overflow-y-auto p-12 grid grid-cols-2 gap-20 custom-scrollbar">
                <div className="space-y-4">
                   <h3 className="text-indigo-500 font-black text-[10px] uppercase border-b border-indigo-900 pb-3 tracking-widest italic">Insumos (Faltantes en Matriz)</h3>
                   {ingredients.filter(i => i.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(i => (
                     <label key={i.id} className={`flex items-center gap-5 p-6 rounded-[2rem] transition-all cursor-pointer border ${catalogSelection.has(i.id) ? 'bg-indigo-600 border-indigo-400 shadow-xl' : 'bg-gray-800/40 border-gray-800 hover:border-indigo-400/30'}`}>
                        <input type="checkbox" checked={catalogSelection.has(i.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(i.id)) s.delete(i.id); else s.add(i.id); setCatalogSelection(s); }} className="hidden" />
                        <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${catalogSelection.has(i.id) ? 'bg-white border-white' : 'border-gray-700'}`}>{catalogSelection.has(i.id) && <CheckIcon className="w-5 h-5 text-indigo-600" />}</div>
                        <span className={`text-[15px] font-black uppercase tracking-tight ${catalogSelection.has(i.id) ? 'text-white' : 'text-gray-400'}`}>{i.name}</span>
                     </label>
                   ))}
                </div>
                <div className="space-y-4">
                   <h3 className="text-cyan-500 font-black text-[10px] uppercase border-b border-cyan-900 pb-3 tracking-widest italic">Perfil Nutricional (Objetivos)</h3>
                   {nutrients.filter(n => n.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(n => (
                     <label key={n.id} className={`flex items-center gap-5 p-6 rounded-[2rem] transition-all cursor-pointer border ${catalogSelection.has(n.id) ? 'bg-cyan-600 border-cyan-400 shadow-xl' : 'bg-gray-800/40 border-gray-800 hover:border-cyan-400/30'}`}>
                        <input type="checkbox" checked={catalogSelection.has(n.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(n.id)) s.delete(n.id); else s.add(n.id); setCatalogSelection(s); }} className="hidden" />
                        <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all ${catalogSelection.has(n.id) ? 'bg-white border-white' : 'border-gray-700'}`}>{catalogSelection.has(n.id) && <CheckIcon className="w-5 h-5 text-cyan-600" />}</div>
                        <span className={`text-[15px] font-black uppercase tracking-tight ${catalogSelection.has(n.id) ? 'text-white' : 'text-gray-400'}`}>{n.name}</span>
                     </label>
                   ))}
                </div>
             </div>
             <div className="p-10 bg-gray-950 border-t border-gray-800 flex items-center justify-between">
                <span className="text-xs font-black text-gray-500 italic tracking-[0.2em]">{catalogSelection.size} ELEMENTOS LISTOS PARA INYECTAR</span>
                <button onClick={handleBulkAdd} className="px-16 py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase rounded-2xl shadow-2xl transition-all active:scale-95 text-sm tracking-widest">Añadir Seleccionados</button>
             </div>
           </div>
        </div>
      )}

      {/* Main navigation header */}
      <nav className="flex-none bg-gray-900 border-b-2 border-gray-800 h-28 flex flex-col shadow-xl z-[100]">
        <div className="flex-1 px-8 flex items-center justify-between bg-gray-900">
           <div className="flex items-center gap-4">
             <button onClick={() => onLeaveFullscreen?.()} className="group flex items-center gap-3 px-6 h-14 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-2xl border border-red-500/20 transition-all font-black uppercase text-[12px] tracking-widest active:scale-95">
                <ArrowLeftIcon className="w-5 h-5 transition-transform group-hover:-translate-x-1" /> VOLVER
             </button>
             <button onClick={handleSaveBulk} className="px-8 h-14 bg-gray-800 hover:bg-emerald-600 text-white font-black uppercase text-[11px] rounded-2xl border border-gray-700 transition-all flex items-center gap-3 shadow-lg active:scale-95">
                <CheckIcon className="w-5 h-5" /> GUARDAR DIETAS
             </button>
           </div>

           <div className="flex items-center gap-12 bg-black/40 px-12 h-16 rounded-[2rem] border border-gray-800 shadow-inner">
              <div className="flex flex-col items-center"><span className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">DIETAS (X)</span><span className="text-3xl font-black text-indigo-400 font-mono leading-none tracking-tighter">{activeDiets.length}</span></div>
              <div className="w-px h-10 bg-gray-800" />
              <div className="flex flex-col items-center"><span className="text-[10px] text-gray-600 font-black uppercase tracking-widest mb-1">TOTAL (KG)</span><span className="text-3xl font-black text-cyan-400 font-mono leading-none tracking-tighter">{totalLoadedKg.toLocaleString()}</span></div>
           </div>

           <button 
             onClick={handleRunAll} 
             disabled={isRunning || hasValidationError || !activeDiets.length} 
             className={`px-14 h-16 rounded-[2rem] shadow-2xl flex items-center gap-5 transition-all scale-105 active:scale-95 font-black uppercase tracking-widest text-sm ${hasValidationError ? 'bg-red-950/50 text-red-500 border border-red-500/30' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
           >
              {isRunning ? <RefreshIcon className="w-7 h-7 animate-spin" /> : <CalculatorIcon className="w-7 h-7" />} 
              {hasValidationError ? 'ERROR DE LÍMITES' : 'OPTIMIZAR (F4)'}
           </button>
        </div>

        <div className="h-10 px-8 flex items-center justify-between bg-black/60 backdrop-blur-md">
           <div className="flex items-center gap-6">
              <button onClick={() => setShowCatalog(true)} className="px-6 h-6 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[10px] font-black uppercase rounded-full border border-indigo-500/30 transition-all italic tracking-tight">🛒 EXPLORAR CATÁLOGO</button>
              
              <div className="flex h-6 bg-gray-900 rounded-full border border-gray-800 overflow-hidden shadow-inner">
                <button onClick={() => setViewMode('limits')} className={`px-5 text-[10px] font-black uppercase transition-all ${viewMode === 'limits' ? 'bg-cyan-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>LÍMITES %</button>
                <button onClick={() => setViewMode('kg')} className={`px-5 text-[10px] font-black uppercase transition-all ${viewMode === 'kg' ? 'bg-cyan-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>RESULTADOS KG</button>
              </div>

              <div className="flex h-6 bg-gray-900 rounded-full border border-gray-800 overflow-hidden ml-2 shadow-inner">
                <button onClick={() => setIsDynamic(false)} className={`px-5 text-[10px] font-black uppercase transition-all ${!isDynamic ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>ESTÁNDAR</button>
                <button onClick={() => setIsDynamic(true)} className={`px-5 text-[10px] font-black uppercase transition-all ${isDynamic ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>DINÁMICA</button>
              </div>
           </div>
           <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
             <span className="text-[10px] text-gray-600 font-bold uppercase italic tracking-widest opacity-80">Matriz de Diagnóstico Staff • FeedPro 360</span>
           </div>
        </div>
      </nav>

      {/* Main area with Sidebar and Matrix */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Retractable Sidebar */}
        <aside 
          className={`shrink-0 bg-gray-950 border-r-2 border-gray-900 transition-all duration-500 ease-in-out flex flex-col overflow-hidden shadow-2xl z-50 relative ${isSidebarCollapsed ? 'w-0' : 'w-64'}`}
        >
           <div className="p-6 shrink-0 border-b border-gray-900 bg-gray-900/10 flex items-center justify-between">
              <span className="text-[11px] font-black text-indigo-500 uppercase tracking-widest border-l-2 border-indigo-600 pl-4">Panel de Dietas</span>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
              {Object.entries(dietsByCategory).map(([cat, list]) => {
                const isExp = expandedCats[cat] ?? true;
                const allSel = list.length > 0 && list.every(d => activeDietIds.includes(d.id));
                const someSel = list.some(d => activeDietIds.includes(d.id)) && !allSel;
                
                return (
                  <div key={cat} className="rounded-3xl overflow-hidden border border-gray-900 bg-gray-900/20 hover:bg-gray-900/40 transition-all">
                    <button onClick={() => setExpandedCats(p => ({...p, [cat]: !isExp}))} className="w-full flex items-center justify-between p-5 bg-gray-900/60 transition-colors">
                       <span className="text-[12px] font-black text-gray-500 uppercase tracking-tighter truncate leading-tight mr-3 italic">{cat}</span>
                       <div className="flex items-center gap-3 shrink-0">
                         <input 
                           type="checkbox" 
                           checked={allSel} 
                           ref={i => { if (i) i.indeterminate = someSel; }}
                           onClick={(e) => e.stopPropagation()} 
                           onChange={() => { const ids = list.map(d => d.id); setActiveDietIds(prev => allSel ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))); }} 
                           className="w-5 h-5 rounded-lg border-2 border-gray-700 bg-black text-indigo-600 transition-all cursor-pointer" 
                         />
                         <ChevronDownIcon className={`w-4 h-4 text-gray-800 transition-transform duration-500 ${isExp ? 'rotate-180' : ''}`} />
                       </div>
                    </button>
                    {isExp && (
                      <div className="p-1 space-y-1 bg-black/20">
                        {list.map(d => (
                          <button key={d.id} onClick={() => setActiveDietIds(p => p.includes(d.id) ? p.filter(id => id !== d.id) : [...p, d.id])} 
                            className={`w-full text-left px-6 py-4 rounded-2xl text-[13px] font-black uppercase transition-all truncate tracking-tight ${activeDietIds.includes(d.id) ? 'bg-indigo-600 text-white shadow-2xl scale-[1.02]' : 'text-gray-600 hover:bg-gray-800 hover:text-gray-300'}`}>
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

        {/* Sidebar Collapse Toggle Button */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`absolute bottom-8 z-[60] p-4 bg-gray-800 hover:bg-indigo-600 text-white rounded-full shadow-2xl transition-all border border-gray-700 active:scale-90 ${isSidebarCollapsed ? 'left-8' : 'left-[14.5rem]'}`}
          title={isSidebarCollapsed ? "Expandir Panel" : "Colapsar Panel"}
        >
           {isSidebarCollapsed ? <ChevronRightIcon className="w-6 h-6" /> : <ChevronLeftIcon className="w-6 h-6" />}
        </button>

        {/* Matrix Implementation */}
        <div className="flex-1 overflow-auto bg-black custom-scrollbar bg-[radial-gradient(circle_at_center,_#0a0a0a_0%,_#000000_100%)]">
           <table className="border-separate border-spacing-0 w-full table-fixed min-w-[1400px]">
              <thead>
                <tr className="sticky top-0 z-[60]">
                  <th className="sticky left-0 z-[70] bg-black border-b border-r-2 border-gray-800 p-8 text-left w-96 shadow-[10px_0_30px_rgba(0,0,0,0.8)]">
                     <span className="text-sm font-black text-gray-600 uppercase italic tracking-[0.5em] leading-none">MATRIZ DE SOLUCIÓN</span>
                  </th>
                  {activeDiets.map((diet, idx) => (
                    <th key={diet.id} className="bg-gray-900 border-b border-r border-gray-800 p-4 w-[200px] transition-all">
                       <div className={`flex items-center justify-between gap-4 p-3 rounded-2xl border ${results[diet.id]?.feasible === false ? 'bg-red-950/30 border-red-500/30' : 'bg-black/50 border-gray-800/80'}`}>
                         <StatusIcon ok={results[diet.id]?.feasible ?? true} />
                         <span className="text-[14px] font-black text-gray-200 uppercase truncate text-center flex-1 tracking-tighter italic">{diet.name}</span>
                         <button onClick={() => setActiveDietIds(p => p.filter(id => id !== diet.id))} className="text-gray-700 hover:text-red-500 transition-colors active:scale-95"><TrashIcon className="w-4 h-4" /></button>
                       </div>
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-900">
                {/* INGREDIENTS GROUP */}
                <tr className="bg-gray-900/40 sticky top-[88px] z-50 backdrop-blur-md">
                   <td colSpan={activeDiets.length + 1} className="px-10 py-3 border-b border-gray-800 text-[11px] font-black text-indigo-500 uppercase tracking-[0.4em] font-mono sticky left-0 leading-tight italic">SECTOR I: VECTORES DE INSUMOS</td>
                </tr>
                {activeRows.filter(r => r.type === 'ing').map(row => (
                  <tr key={row.id} className="h-16 group transition-colors hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-40 bg-black border-r-2 border-gray-800 px-10 py-0 shadow-2xl">
                       <div className="flex items-center justify-between h-full">
                         <div className="flex flex-col gap-0 select-text">
                            <div className="flex items-center gap-3">
                              <span className="text-[17px] font-black text-white uppercase leading-none tracking-tighter">{row.name}</span>
                              {hasRun && activeDiets.some(d => results[d.id]?.feasible) && (
                                <span className="text-[10px] text-gray-500 font-black font-mono bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/10 italic">
                                  ${results[activeDietIds[0]]?.shadowPrices[row.id]?.toFixed(2) || '0.00'}
                                </span>
                              )}
                            </div>
                            <span className="text-[14px] text-gray-600 font-bold uppercase italic mt-0.5 tracking-tight">Precio: ${row.price?.toFixed(2)}</span>
                         </div>
                         <button onClick={() => handleRemoveRow(row.id)} className="text-gray-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2.5 bg-red-600/10 rounded-xl active:scale-90"><TrashIcon className="w-5 h-5" /></button>
                       </div>
                    </td>
                    {activeDiets.map(diet => {
                      const c = constraints[row.id]?.[diet.id];
                      const res = results[diet.id];
                      const val = res?.formula[row.id] ?? 0;
                      return (
                        <td key={diet.id} className="border-r border-gray-900 p-0 relative h-full">
                           <div className="grid grid-cols-3 h-16 divide-x divide-white/[0.03]">
                              <DiagnosticCell row={row} dietId={diet.id} value={c?.min ?? ''} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'min', v)} dirty={c?.dirty} />
                              <DiagnosticCell row={row} dietId={diet.id} value={c && c.max < 100 ? c.max : ''} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'max', v)} dirty={c?.dirty} />
                              <DiagnosticCell row={row} dietId={diet.id} value={val} isResult resultValue={val} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={res?.feasible ?? true} min={c?.min} max={c?.max} />
                           </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* NUTRIENTS GROUP */}
                <tr className="bg-gray-900/40 sticky top-[88px] z-50 backdrop-blur-md">
                   <td colSpan={activeDiets.length + 1} className="px-10 py-3 border-b border-gray-800 text-[11px] font-black text-cyan-500 uppercase tracking-[0.4em] font-mono sticky left-0 leading-tight italic">SECTOR II: PERFIL DE OBJETIVOS</td>
                </tr>
                {activeRows.filter(r => r.type === 'nut').map(row => (
                  <tr key={row.id} className="h-16 group transition-colors hover:bg-white/[0.02]">
                    <td className="sticky left-0 z-40 bg-black border-r-2 border-gray-800 px-10 py-0 shadow-2xl">
                       <div className="flex items-center justify-between h-full">
                         <div className="flex flex-col gap-0 select-text">
                            <div className="flex items-center gap-3">
                               <span className="text-[17px] font-black text-white uppercase leading-none tracking-tighter">{row.name}</span>
                               {hasRun && activeDiets.some(d => results[d.id]?.feasible) && (
                                 <span className="text-[10px] text-gray-500 font-black font-mono bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/10 italic">
                                   Δ {results[activeDietIds[0]]?.shadowPrices[row.id]?.toFixed(4) || '0.000'}
                                 </span>
                               )}
                            </div>
                            <span className="text-[14px] text-gray-600 font-bold uppercase italic mt-0.5 tracking-tight truncate w-full">Unidad: {row.unit}</span>
                         </div>
                         <button onClick={() => handleRemoveRow(row.id)} className="text-gray-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2.5 bg-red-600/10 rounded-xl active:scale-90"><TrashIcon className="w-5 h-5" /></button>
                       </div>
                    </td>
                    {activeDiets.map(diet => {
                      const c = constraints[row.id]?.[diet.id];
                      const res = results[diet.id];
                      const val = res?.nutrients[row.id] ?? 0;
                      return (
                        <td key={diet.id} className="border-r border-gray-900 p-0 relative h-full">
                           <div className="grid grid-cols-3 h-16 divide-x divide-white/[0.03]">
                              <DiagnosticCell row={row} dietId={diet.id} value={c?.min ?? ''} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'min', v)} dirty={c?.dirty} />
                              <DiagnosticCell row={row} dietId={diet.id} value={c && c.max < 999 ? c.max : ''} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'max', v)} dirty={c?.dirty} />
                              <DiagnosticCell row={row} dietId={diet.id} value={val} isResult resultValue={val} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={res?.feasible ?? true} min={c?.min} max={c?.max} />
                           </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

              {/* STICKY FOOTER DIAGNOSTIC */}
              <tfoot>
                <tr className="sticky bottom-0 z-[60] bg-gray-950 border-t-2 border-gray-800 shadow-[0_-15px_30px_rgba(0,0,0,0.6)]">
                   <td className="p-4 px-10 sticky left-0 z-[70] bg-black border-r-2 border-gray-800">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-black text-emerald-500 uppercase tracking-[0.2em] italic leading-none mb-1">Diagnóstico Staff</span>
                        <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest opacity-40">Resumen de costos óptimos por kg</span>
                      </div>
                   </td>
                   {activeDiets.map(diet => {
                     const r = results[diet.id];
                     const diff = r && r.prevCostPerKg ? r.costPerKg - r.prevCostPerKg : 0;
                     return (
                       <td key={diet.id} className="border-r border-gray-800 p-3 bg-black/60 backdrop-blur-xl">
                         {r ? (
                           <div className="flex flex-col items-center justify-center">
                              <div className="flex items-center gap-3 mb-0.5">
                                <div className={`w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all ${r.feasible ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50 animate-pulse'}`} />
                                <span className={`text-[20px] font-black font-mono leading-none tracking-tighter ${r.feasible ? 'text-white' : 'text-red-500'}`}>
                                  ${r.costPerKg.toFixed(2)}
                                </span>
                                {hasRun && diff !== 0 && (
                                  <span className={`text-[10px] font-black flex items-center gap-1 ${diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(3)}
                                  </span>
                                )}
                              </div>
                              <div className="text-[9px] font-black text-gray-600 uppercase tracking-widest opacity-60">Costo Formulado</div>
                           </div>
                         ) : <div className="text-[11px] text-gray-800 font-black uppercase text-center italic py-3 tracking-widest opacity-20">SIN CÁLCULO</div>}
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
