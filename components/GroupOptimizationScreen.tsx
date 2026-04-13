import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Ingredient, Nutrient, SavedFormula } from '../types';
import { solveFeedFormulation } from '../services/solver';
import { CubeIcon, BeakerIcon, CalculatorIcon, RefreshIcon, XCircleIcon, CheckIcon, TrashIcon, SearchIcon, ChevronDownIcon } from './icons';

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
  
  let bgColor = "bg-transparent";
  if (dirty) bgColor = "bg-yellow-500/20";
  else if (isResult) {
    if (!feasible) bgColor = "bg-red-950/40";
    else if (isOutOfBounds) bgColor = "bg-red-500/20";
    else bgColor = "bg-emerald-500/10";
  }

  const displayValue = viewMode === 'kg' && isResult && resultValue !== undefined 
    ? ((resultValue / 100) * batchSize).toFixed(2) 
    : (typeof value === 'number' ? value.toFixed(2) : value);

  return (
    <div className={`h-full w-full flex flex-col justify-center px-2 transition-all ${bgColor} ${isResult ? 'border-l border-gray-800/30' : ''}`}>
      {isResult ? (
        <span className={`text-[15px] font-black font-mono text-center ${!feasible || isOutOfBounds ? 'text-red-500' : 'text-emerald-400'}`}>
          {displayValue}
          {viewMode === 'limits' && <span className="text-[10px] ml-0.5 opacity-50">%</span>}
        </span>
      ) : (
        <input
          type="number"
          value={value}
          onChange={(e) => onChange?.(parseFloat(e.target.value) || 0)}
          className="w-full bg-transparent text-center text-[15px] font-black font-mono text-white outline-none focus:text-indigo-400 placeholder-gray-800"
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

  // 1. STATE
  const [activeDietIds, setActiveDietIds] = useState<string[]>(selectedDietIds);
  const [activeRows, setActiveRows] = useState<MatrixRow[]>([]);
  const [constraints, setConstraints] = useState<Record<string, Record<string, ConstraintSet>>>({});
  const [batchSizes, setBatchSizes] = useState<Record<string, number>>({});
  const [results, setResults] = useState<Record<string, DietResult>>({});
  
  const [isDynamic, setIsDynamic] = useState(initialIsDynamic);
  const [viewMode, setViewMode] = useState<'limits' | 'kg'>('limits');
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  
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

  // 3. HANDLERS
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
    if (!activeDiets.length) return;
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
  }, [activeDiets, activeRows, constraints, batchSizes, ingredients, nutrients, isDynamic, results, setIsDirty]);

  const handleSaveBulk = () => {
    if (!results || !setSavedFormulas || !selectedClientId) return;
    const newFormulas: SavedFormula[] = activeDiets.map(diet => {
      const r = results[diet.id];
      if (!r) return null;
      return {
        id: `sf${Date.now()}_${diet.id}`,
        clientId: selectedClientId,
        name: `${diet.name} - ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString(),
        result: {
            status: r.feasible ? 'OPTIMAL' : 'INFEASIBLE',
            totalCost: r.totalCost,
            items: Object.entries(r.formula).map(([id, p]) => ({ ingredientId: id, weight: (p / 100) * (batchSizes[diet.id] || 1000), percentage: p, cost: 0 })),
            nutrientAnalysis: Object.entries(r.nutrients).map(([id, v]) => ({ nutrientId: id, value: v, min: 0, max: 0, met: true }))
        } as any
      };
    }).filter(f => f !== null) as SavedFormula[];
    setSavedFormulas(prev => [...prev, ...newFormulas]);
    alert("✓ Éxito: Todas las dietas han sido guardadas.");
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
    <div className="flex-1 flex flex-col w-full h-full min-h-0 bg-gray-950 text-white font-sans antialiased overflow-hidden select-none">
      
      {/* Selector Global Modal */}
      {showCatalog && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-8 transition-all animate-fade-in text-white">
           <div className="bg-gray-900 border border-gray-800 rounded-[3rem] w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden">
             <div className="p-10 border-b border-gray-800 flex items-center justify-between shrink-0">
               <div>
                 <h2 className="text-4xl font-black text-indigo-400 uppercase tracking-tighter italic leading-none">Explorar Catálogo</h2>
                 <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest mt-2">Gestión masiva de vectores técnicos</p>
               </div>
               <button onClick={() => setShowCatalog(false)} className="p-4 hover:bg-gray-800 rounded-full text-gray-500 transition-all"><XCircleIcon className="w-12 h-12" /></button>
             </div>
             
             <div className="p-6 bg-gray-950/50 border-b border-gray-800 relative shrink-0">
               <SearchIcon className="absolute left-10 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600" />
               <input type="text" value={catalogSearch} onChange={e => setCatalogSearch(e.target.value)} placeholder="ESCRIBE PARA FILTRAR..." className="w-full h-14 bg-gray-900 border border-gray-800 rounded-2xl pl-16 pr-6 text-sm font-black uppercase text-white outline-none focus:border-indigo-600 transition-all placeholder-gray-700" />
             </div>

             <div className="flex-1 overflow-y-auto p-10 grid grid-cols-2 gap-16 custom-scrollbar bg-black/20">
                <div className="space-y-4">
                  <div className="text-indigo-400 font-black text-[10px] uppercase border-b border-indigo-900 pb-3 tracking-widest">Insumos Formulación</div>
                  {ingredients.filter(i => i.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(i => (
                    <label key={i.id} className={`flex items-center gap-4 p-5 rounded-3xl transition-all cursor-pointer border ${catalogSelection.has(i.id) ? 'bg-indigo-600 border-indigo-400 shadow-lg' : 'bg-gray-900/40 border-gray-800 hover:border-indigo-500/30'}`}>
                      <input type="checkbox" checked={catalogSelection.has(i.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(i.id)) s.delete(i.id); else s.add(i.id); setCatalogSelection(s); }} className="hidden" />
                      <div className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${catalogSelection.has(i.id) ? 'bg-white border-white' : 'border-gray-700'}`}>{catalogSelection.has(i.id) && <CheckIcon className="w-4 h-4 text-indigo-600" />}</div>
                      <span className={`text-sm font-black uppercase ${catalogSelection.has(i.id) ? 'text-white' : 'text-gray-400'}`}>{i.name}</span>
                    </label>
                  ))}
                </div>
                <div className="space-y-4">
                  <div className="text-cyan-400 font-black text-[10px] uppercase border-b border-cyan-900 pb-3 tracking-widest">Parámetros Nutricionales</div>
                  {nutrients.filter(n => n.name.toLowerCase().includes(catalogSearch.toLowerCase())).map(n => (
                    <label key={n.id} className={`flex items-center gap-4 p-5 rounded-3xl transition-all cursor-pointer border ${catalogSelection.has(n.id) ? 'bg-cyan-600 border-cyan-400 shadow-lg' : 'bg-gray-900/40 border-gray-800 hover:border-cyan-500/30'}`}>
                      <input type="checkbox" checked={catalogSelection.has(n.id)} onChange={() => { const s = new Set(catalogSelection); if (s.has(n.id)) s.delete(n.id); else s.add(n.id); setCatalogSelection(s); }} className="hidden" />
                      <div className={`w-6 h-6 rounded border flex items-center justify-center transition-all ${catalogSelection.has(n.id) ? 'bg-white border-white' : 'border-gray-700'}`}>{catalogSelection.has(n.id) && <CheckIcon className="w-4 h-4 text-cyan-600" />}</div>
                      <span className={`text-sm font-black uppercase ${catalogSelection.has(n.id) ? 'text-white' : 'text-gray-400'}`}>{n.name}</span>
                    </label>
                  ))}
                </div>
             </div>
             <div className="p-10 border-t border-gray-800 bg-gray-950 flex items-center justify-between shrink-0">
                <span className="text-xs font-black text-gray-500 uppercase italic tracking-widest">{catalogSelection.size} elementos para inyectar</span>
                <button onClick={handleBulkAdd} className="px-16 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase rounded-2xl shadow-xl transition-all active:scale-95">Inyectar en Matriz</button>
             </div>
           </div>
        </div>
      )}

      {/* Header Panel */}
      <nav className="flex-none bg-gray-900 border-b-2 border-gray-800 h-28 flex flex-col shadow-2xl">
        <div className="flex-1 px-8 flex items-center justify-between border-b border-gray-800 bg-gray-900">
           <div className="flex items-center gap-3">
             <button onClick={() => onLeaveFullscreen?.()} className="p-3 bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"><XCircleIcon className="w-6 h-6" /></button>
             <button onClick={handleSaveBulk} className="px-6 h-12 bg-gray-800 hover:bg-emerald-600 text-white font-black uppercase text-[11px] rounded-2xl border border-gray-700 transition-all flex items-center gap-2 active:scale-95">
                <CheckIcon className="w-4 h-4" /> Guardar Cambios
             </button>
           </div>
           
           <div className="flex items-center gap-8 bg-black/40 px-10 h-14 rounded-2xl border border-gray-800 shadow-inner">
              <div className="flex flex-col items-center"><span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-0.5">Vectores</span><span className="text-2xl font-black text-indigo-400 font-mono leading-none tracking-tighter">{activeDiets.length}</span></div>
              <div className="w-px h-8 bg-gray-800" />
              <div className="flex flex-col items-center"><span className="text-[9px] text-gray-500 font-black uppercase tracking-widest mb-0.5">Carga Kg</span><span className="text-2xl font-black text-cyan-400 font-mono leading-none tracking-tighter">{totalLoadedKg.toLocaleString()}</span></div>
           </div>

           <button onClick={handleRunAll} disabled={isRunning || !activeDiets.length} className="px-12 h-14 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white font-black uppercase rounded-2xl shadow-2xl flex items-center gap-4 transition-all scale-105 active:scale-95">
              {isRunning ? <RefreshIcon className="w-6 h-6 animate-spin" /> : <CalculatorIcon className="w-6 h-6" />} Optimizar (F4)
           </button>
        </div>

        <div className="h-10 px-8 flex items-center justify-between bg-gray-950/80">
           <div className="flex items-center gap-4">
              <button onClick={() => setShowCatalog(true)} className="px-5 h-6 bg-indigo-600/20 hover:bg-indigo-600 text-indigo-400 hover:text-white text-[9px] font-black uppercase rounded-full border border-indigo-500/30 transition-all italic tracking-tight">🛒 EXPLORAR CATÁLOGO</button>
              <div className="flex h-6 bg-gray-900 rounded-full border border-gray-800 overflow-hidden">
                <button onClick={() => setIsDynamic(false)} className={`px-4 text-[9px] font-black uppercase transition-all ${!isDynamic ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Estándar</button>
                <button onClick={() => setIsDynamic(true)} className={`px-4 text-[9px] font-black uppercase transition-all ${isDynamic ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Dinámica</button>
              </div>
              <div className="flex h-6 bg-gray-900 rounded-full border border-gray-800 overflow-hidden ml-2">
                <button onClick={() => setViewMode('limits')} className={`px-4 text-[9px] font-black uppercase transition-all ${viewMode === 'limits' ? 'bg-cyan-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Límites %</button>
                <button onClick={() => setViewMode('kg')} className={`px-4 text-[9px] font-black uppercase transition-all ${viewMode === 'kg' ? 'bg-cyan-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Resultados KG</button>
              </div>
           </div>
           <div className="text-[10px] text-gray-600 font-bold uppercase italic tracking-widest opacity-60">Feedpro 360 • Matriz de Diagnóstico de Precisión</div>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Accordion */}
        <aside className="w-64 shrink-0 bg-gray-950 border-r-2 border-gray-900 flex flex-col overflow-hidden shadow-2xl z-40">
           <div className="p-6 shrink-0 border-b border-gray-900 bg-gray-900/10">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block border-l-2 border-indigo-600 pl-3">Selección de Dietas</span>
           </div>
           <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
              {Object.entries(dietsByCategory).map(([cat, list]) => {
                const isExp = expandedCats[cat] ?? true;
                const allSel = list.length > 0 && list.every(d => activeDietIds.includes(d.id));
                return (
                  <div key={cat} className="rounded-2xl overflow-hidden border border-gray-900 bg-gray-900/20 transition-all hover:bg-gray-900/40">
                    <button onClick={() => setExpandedCats(p => ({...p, [cat]: !isExp}))} className="w-full flex items-center justify-between p-4 bg-gray-900/60 transition-colors">
                       <span className="text-[11px] font-black text-gray-400 uppercase tracking-tighter truncate leading-tight mr-2">{cat}</span>
                       <div className="flex items-center gap-3 shrink-0">
                         <input type="checkbox" checked={allSel} onClick={(e) => e.stopPropagation()} onChange={() => { const ids = list.map(d => d.id); setActiveDietIds(prev => allSel ? prev.filter(id => !ids.includes(id)) : Array.from(new Set([...prev, ...ids]))); }} className="w-4 h-4 rounded border-gray-700 bg-black text-indigo-600 transition-all cursor-pointer" />
                         <ChevronDownIcon className={`w-4 h-4 text-gray-700 transition-transform duration-300 ${isExp ? 'rotate-180' : ''}`} />
                       </div>
                    </button>
                    {isExp && (
                      <div className="p-1 space-y-1 bg-black/10">
                        {list.map(d => (
                          <button key={d.id} onClick={() => setActiveDietIds(p => p.includes(d.id) ? p.filter(id => id !== d.id) : [...p, d.id])} 
                            className={`w-full text-left px-5 py-3 rounded-xl text-[12px] font-black uppercase transition-all truncate ${activeDietIds.includes(d.id) ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-600 hover:bg-gray-800 hover:text-gray-300'}`}>
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

        {/* Matrix Canvas */}
        <div className="flex-1 overflow-auto bg-black custom-scrollbar relative">
           <table className="border-separate border-spacing-0 w-full table-fixed min-w-[1200px]">
              <thead>
                <tr className="sticky top-0 z-50">
                  <th className="sticky left-0 z-[60] bg-black border-b border-r-2 border-gray-800 p-6 text-left w-80 shadow-2xl">
                     <span className="text-sm font-black text-gray-600 uppercase italic tracking-[0.4em] leading-none">Matriz Técnica</span>
                  </th>
                  {activeDiets.map(diet => (
                    <th key={diet.id} className="bg-gray-900 border-b border-r border-gray-800 p-3 w-[180px]">
                       <div className="flex items-center justify-between gap-3 bg-black/40 p-2 rounded-xl border border-gray-800/50">
                         <StatusIcon ok={results[diet.id]?.feasible ?? true} />
                         <span className="text-[13px] font-black text-gray-200 uppercase truncate text-center flex-1 tracking-tighter">{diet.name}</span>
                         <button onClick={() => setActiveDietIds(p => p.filter(id => id !== diet.id))} className="text-gray-700 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                       </div>
                    </th>
                  ))}
                </tr>
              </thead>
              
              <tbody className="divide-y divide-gray-900">
                {/* CATEGORY: INGREDIENTS */}
                <tr className="bg-gray-900/50 sticky top-[75px] z-40">
                   <td colSpan={activeDiets.length + 1} className="px-8 py-2 border-b border-gray-800 text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] font-mono sticky left-0 leading-tight">Vectores de Insumos</td>
                </tr>
                {activeRows.filter(r => r.type === 'ing').map(row => (
                  <tr key={row.id} className="h-16 group">
                    <td className="sticky left-0 z-30 bg-black border-r-2 border-gray-800 px-8 py-0 shadow-xl">
                       <div className="flex items-center justify-between h-full">
                         <div className="flex flex-col gap-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[17px] font-black text-white uppercase leading-none tracking-tighter">{row.name}</span>
                              {hasRun && activeDiets.some(d => results[d.id]?.shadowPrices[row.id] > 0) && (
                                <span className="text-[10px] text-indigo-400 font-black font-mono bg-indigo-500/10 px-1.5 rounded" title="Sombra/Oportunidad">
                                  ${results[activeDietIds[0]]?.shadowPrices[row.id]?.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <span className="text-[14px] text-gray-600 font-bold mt-1 uppercase italic tracking-widest opacity-60">Base: ${row.price?.toFixed(2)}</span>
                         </div>
                         <button onClick={() => handleRemoveRow(row.id)} className="text-gray-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 bg-red-600/10 rounded-lg"><TrashIcon className="w-5 h-5" /></button>
                       </div>
                    </td>
                    {activeDiets.map(diet => {
                      const c = constraints[row.id]?.[diet.id];
                      const res = results[diet.id];
                      const val = res?.formula[row.id] ?? 0;
                      return (
                        <td key={diet.id} className="border-r border-gray-900 p-0 relative h-full">
                           <div className="grid grid-cols-3 h-16 divide-x divide-gray-900/30">
                              <DiagnosticCell row={row} dietId={diet.id} value={c?.min ?? ''} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'min', v)} dirty={c?.dirty} />
                              <DiagnosticCell row={row} dietId={diet.id} value={c && c.max < 100 ? c.max : ''} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={true} onChange={v => updateConstraint(row.id, diet.id, 'max', v)} dirty={c?.dirty} />
                              <DiagnosticCell row={row} dietId={diet.id} value={val} isResult resultValue={val} viewMode={viewMode} batchSize={batchSizes[diet.id]} feasible={res?.feasible ?? true} min={c?.min} max={c?.max} />
                           </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* CATEGORY: NUTRIENTS */}
                <tr className="bg-gray-900/50 sticky top-[75px] z-40">
                   <td colSpan={activeDiets.length + 1} className="px-8 py-2 border-b border-gray-800 text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] font-mono sticky left-0 leading-tight">Balance Nutricional</td>
                </tr>
                {activeRows.filter(r => r.type === 'nut').map(row => (
                  <tr key={row.id} className="h-16 group">
                    <td className="sticky left-0 z-30 bg-black border-r-2 border-gray-800 px-8 py-0 shadow-xl">
                       <div className="flex items-center justify-between h-full">
                         <div className="flex flex-col gap-0">
                            <div className="flex items-center gap-2">
                               <span className="text-[17px] font-black text-white uppercase leading-none tracking-tighter">{row.name}</span>
                               {hasRun && activeDiets.some(d => results[d.id]?.shadowPrices[row.id] > 0) && (
                                 <span className="text-[10px] text-cyan-400 font-black font-mono bg-cyan-500/10 px-1.5 rounded" title="Incremental/Marginal">
                                   Δ {results[activeDietIds[0]]?.shadowPrices[row.id]?.toFixed(4)}
                                 </span>
                               )}
                            </div>
                            <span className="text-[14px] text-gray-600 font-bold mt-1 uppercase italic tracking-widest opacity-60">Unidad: {row.unit}</span>
                         </div>
                         <button onClick={() => handleRemoveRow(row.id)} className="text-gray-800 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-2 bg-red-600/10 rounded-lg"><TrashIcon className="w-5 h-5" /></button>
                       </div>
                    </td>
                    {activeDiets.map(diet => {
                      const c = constraints[row.id]?.[diet.id];
                      const res = results[diet.id];
                      const val = res?.nutrients[row.id] ?? 0;
                      return (
                        <td key={diet.id} className="border-r border-gray-900 p-0 relative h-full">
                           <div className="grid grid-cols-3 h-16 divide-x divide-gray-900/30">
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

              {/* STICKY FOOTER: DIAGNOSTIC STRIPS */}
              <tfoot>
                <tr className="sticky bottom-0 z-50 bg-black border-t border-gray-800 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
                   <td className="p-4 px-8 sticky left-0 z-[60] bg-black border-r-2 border-gray-800">
                      <div className="flex flex-col">
                        <span className="text-[12px] font-black text-emerald-500 uppercase tracking-widest italic leading-none mb-1">Diagnóstico Final</span>
                        <span className="text-[9px] text-gray-600 font-bold uppercase tracking-widest opacity-60">Costos Calculados • Diarios</span>
                      </div>
                   </td>
                   {activeDiets.map(diet => {
                     const r = results[diet.id];
                     const diff = r && r.prevCostPerKg ? r.costPerKg - r.prevCostPerKg : 0;
                     return (
                       <td key={diet.id} className="border-r border-gray-800 p-2.5 bg-gray-950/80 backdrop-blur-md">
                         {r ? (
                           <div className="flex flex-col items-center justify-center">
                              <div className="flex items-center gap-2 mb-0.5">
                                <StatusDot ok={r.feasible} />
                                <span className={`text-[19px] font-black font-mono leading-none tracking-tighter ${r.feasible ? 'text-white' : 'text-red-500 animate-pulse'}`}>
                                  <span className="text-emerald-500 text-[10px] mr-1">$</span>{r.costPerKg.toFixed(2)}
                                </span>
                                {hasRun && diff !== 0 && (
                                  <span className={`text-[10px] font-black flex items-center gap-0.5 ${diff > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                    {diff > 0 ? '↑' : '↓'} {Math.abs(diff).toFixed(3)}
                                  </span>
                                )}
                              </div>
                              <div className="text-[8px] font-black text-gray-600 uppercase tracking-[0.2em]">Costo por Unidad</div>
                           </div>
                         ) : <div className="text-[10px] text-gray-800 font-black uppercase py-2 text-center italic tracking-widest opacity-20">PENDIENTE</div>}
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

// ─── STYLES & HELPERS ─────────────────────────────────────────────────────────────

const StatusDot = ({ ok }: { ok: boolean }) => (
  <div className={`w-2 h-2 rounded-full transition-all duration-500 ${ok ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse'}`} />
);
