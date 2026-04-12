import React, { useState, useEffect } from 'react';
import { Product, Ingredient, Nutrient } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { DatabaseIcon, CalculatorIcon, SparklesIcon, XCircleIcon, CubeIcon, RefreshIcon, BeakerIcon, ShoppingCartIcon, RatiosIcon } from './icons';
import { solveGroupFormulation } from '../services/solver';
import { GroupResultsScreen } from './GroupResultsScreen';

interface GroupOptimizationScreenProps {
  products: Product[];
  ingredients: Ingredient[];
  nutrients: Nutrient[];
  isDynamicMatrix: boolean;
  selectedDietIds: string[];
  onOpenInNewWindow?: (data: any, name: string) => void;
  onUpdateProduct?: (p: Product) => void;
  setIsDirty?: (dirty: boolean) => void;
  savedFormulas?: any[]; // Usually SavedFormula[] but simplified type here since it's passed from root
  setSavedFormulas?: (val: any) => void;
}

export const GroupOptimizationScreen: React.FC<GroupOptimizationScreenProps> = ({ 
    products, 
    ingredients, 
    nutrients,
    isDynamicMatrix,
    selectedDietIds,
    onOpenInNewWindow,
    onUpdateProduct,
    setIsDirty,
    savedFormulas,
    setSavedFormulas
}) => {
    const { t } = useTranslations();
    const [isOptimizing, setIsOptimizing] = useState(false);
    
    // Global Parameters
    const [useStock, setUseStock] = useState(true);
    const [matrixMode, setMatrixMode] = useState<'general' | 'dynamic'>(isDynamicMatrix ? 'dynamic' : 'general');
    const [globalRelation, setGlobalRelation] = useState<string>('none');
    
    // Local State
    const [batchSizes, setBatchSizes] = useState<Record<string, number>>({});
    
    // Drawer State
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [resultsData, setResultsData] = useState<{ result: any, assignments: any } | null>(null);
    const [showBulkPanel, setShowBulkPanel] = useState(false);
    const [bulkFilter, setBulkFilter] = useState<{ nutrientId?: string, ingredientId?: string, relationId?: string, min?: number, max?: number }>({});
    const [activeView, setActiveView] = useState<'matrix' | 'cards'>('matrix');
    
    // Category Color Map
    const getCategoryColor = (cat: string) => {
        const c = cat.toLowerCase();
        if (c.includes('postura') || c.includes('huevo')) return 'amber';
        if (c.includes('iniciador')) return 'cyan';
        if (c.includes('crecimiento')) return 'emerald';
        if (c.includes('terminador') || c.includes('engorde')) return 'orange';
        if (c.includes('reproductor')) return 'purple';
        if (c.includes('cerdo')) return 'pink';
        return 'indigo';
    };

    const getColorClasses = (color: string) => {
        const maps: Record<string, any> = {
            amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', badge: 'bg-amber-600', hover: 'hover:bg-amber-500/20', line: 'bg-amber-500' },
            cyan: { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', badge: 'bg-cyan-600', hover: 'hover:bg-cyan-500/20', line: 'bg-cyan-500' },
            emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', badge: 'bg-emerald-600', hover: 'hover:bg-emerald-500/20', line: 'bg-emerald-500' },
            orange: { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', badge: 'bg-orange-600', hover: 'hover:bg-orange-500/20', line: 'bg-orange-500' },
            purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', badge: 'bg-purple-600', hover: 'hover:bg-purple-500/20', line: 'bg-purple-500' },
            pink: { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/30', badge: 'bg-pink-600', hover: 'hover:bg-pink-500/20', line: 'bg-pink-500' },
            indigo: { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', badge: 'bg-indigo-600', hover: 'hover:bg-indigo-500/20', line: 'bg-indigo-500' }
        };
        return maps[color] || maps.indigo;
    };

    const selectedProducts = products.filter(p => selectedDietIds.includes(p.id));

    // Initialize batch sizes for newly selected products
    useEffect(() => {
        setBatchSizes(prev => {
            const next = { ...prev };
            selectedProducts.forEach(p => {
                if (!next[p.id]) next[p.id] = 1000;
            });
            return next;
        });
    }, [selectedDietIds]);

    const handleRunOptimization = () => {
        if (selectedProducts.length === 0) return;
        setIsOptimizing(true);
        
        const assignments = selectedProducts.map(p => ({
            id: `as-${Date.now()}-${p.id}`,
            productId: p.id,
            product: p,
            batchSize: batchSizes[p.id] || 1000
        }));

        setTimeout(() => {
            const result = solveGroupFormulation(assignments, ingredients, nutrients, matrixMode === 'dynamic', useStock);
            console.log("Unified Result:", result);
            setIsOptimizing(false);
            if (result.feasible) {
                setResultsData({ result, assignments });
                setIsDrawerOpen(true);
                setIsDirty?.(true); // Flag to prevent accidental closure
            } else {
                setResultsData({ result, assignments });
                setIsDrawerOpen(true);
            }
        }, 800);
    };

    const handleAttemptCloseDrawer = () => {
        if (confirm("¿Estás seguro de cerrar el panel? Los resultados no guardados se perderán.")) {
            setIsDrawerOpen(false);
            setResultsData(null);
            setIsDirty?.(false);
        }
    };

    return (
        <div className="p-3 space-y-4 flex flex-col h-full relative">
            {/* Toolbar Parámetros Globales */}
            <div className="bg-gray-900 border border-gray-700/80 rounded-xl p-3 shadow-lg shadow-gray-950/50 flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20">
                        <CalculatorIcon className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div>
                        <h2 className="text-[14px] font-black text-white uppercase tracking-wider leading-none">Centro de Optimización</h2>
                        <p className="text-cyan-500/70 font-bold text-[9px] uppercase tracking-widest mt-1 leading-none">Cálculo de Formulación Táctica</p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4 bg-gray-950/50 p-1.5 rounded-lg border border-gray-800">
                    {/* Stock Toggle */}
                    <div className={`px-3 py-1.5 rounded flex items-center gap-2 transition-all ${useStock ? 'bg-emerald-500/10 border-emerald-500/30 border' : 'border border-transparent'}`}>
                        <div className="flex flex-col text-right">
                            <span className="text-[9px] font-black text-gray-300 uppercase leading-none">Restringir Stock</span>
                        </div>
                        <button onClick={() => { setUseStock(!useStock); setIsDirty?.(true); }} className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${useStock ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${useStock ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    
                    <div className="w-px h-6 bg-gray-700"></div>

                    {/* Matrix Toggle */}
                    <div className={`px-3 py-1.5 rounded flex items-center gap-2 transition-all ${matrixMode === 'dynamic' ? 'bg-indigo-500/10 border-indigo-500/30 border' : 'border border-transparent'}`}>
                        <div className="flex flex-col text-right">
                            <span className="text-[9px] font-black text-gray-300 uppercase leading-none">Matriz Dinámica</span>
                        </div>
                        <button onClick={() => { setMatrixMode(matrixMode === 'dynamic' ? 'general' : 'dynamic'); setIsDirty?.(true); }} className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${matrixMode === 'dynamic' ? 'bg-indigo-500' : 'bg-gray-600'}`}>
                            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${matrixMode === 'dynamic' ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    
                    <div className="w-px h-6 bg-gray-700"></div>

                    {/* Global Relationships */}
                    <div className="px-2">
                        <select 
                            value={globalRelation}
                            onChange={(e) => setGlobalRelation(e.target.value)}
                            className="bg-gray-900 border border-gray-700 text-yellow-500 font-bold text-[10px] uppercase rounded px-2 py-1 outline-none focus:border-yellow-500"
                        >
                            <option value="none">Sin relaciones activas</option>
                            <option value="ca_p">Mínimo Global Ca:P</option>
                            <option value="na_cl">Mínimo Global Na:Cl</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Bulk Control Panel - Segmented */}
            <div className={`overflow-hidden transition-all duration-300 ${showBulkPanel ? 'max-h-[600px] mb-6' : 'max-h-0'}`}>
                <div className="bg-indigo-950/20 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-500/20 rounded-lg">
                                <SparklesIcon className="w-5 h-5 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-[14px] font-black text-white uppercase tracking-widest leading-none">Acciones Globales de Lote</h3>
                                <p className="text-[9px] text-gray-500 uppercase font-bold mt-1 tracking-tighter">Aplica ajustes estructurales a todas las dietas de la matriz</p>
                            </div>
                        </div>
                        <button onClick={() => setShowBulkPanel(false)} className="text-gray-500 hover:text-white transition-colors"><XCircleIcon className="w-6 h-6"/></button>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Section 3: Ratios/Relations */}
                        <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-8 bg-yellow-500/5 rounded-full -mr-4 -mt-4 blur-2xl"></div>
                            <div className="flex items-center gap-2 mb-4">
                                <RatiosIcon className="w-4 h-4 text-yellow-400" />
                                <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest">Relaciones y Ratios (Lote)</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[8px] font-black text-gray-500 uppercase px-1">Relación Técnica</label>
                                    <select 
                                        onChange={(e) => setBulkFilter({ ...bulkFilter, relationId: e.target.value, nutrientId: undefined, ingredientId: undefined })}
                                        className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg p-2.5 text-[11px] font-bold outline-none focus:border-yellow-500 transition-colors"
                                    >
                                        <option value="">-- Seleccionar Relación --</option>
                                        {Array.from(new Set(selectedProducts.flatMap(p => p.relationships.map(r => r.name)))).map(name => {
                                            const rel = selectedProducts.flatMap(p => p.relationships).find(r => r.name === name);
                                            return <option key={name} value={name}>{name}</option>;
                                        })}
                                    </select>
                                </div>
                                <div className="flex gap-2 items-end">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[8px] font-black text-gray-500 uppercase px-1">Ratio Mín</label>
                                        <input type="number" step="0.01" onChange={(e) => setBulkFilter({...bulkFilter, min: parseFloat(e.target.value)})} placeholder="0.0" className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg p-2.5 text-[11px] font-mono outline-none focus:border-yellow-500" />
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-[8px] font-black text-gray-500 uppercase px-1">Ratio Máx</label>
                                        <input type="number" step="0.01" onChange={(e) => setBulkFilter({...bulkFilter, max: parseFloat(e.target.value)})} placeholder="99.9" className="w-full bg-gray-950 border border-gray-800 text-white rounded-lg p-2.5 text-[11px] font-mono outline-none focus:border-yellow-500" />
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    if (!onUpdateProduct || !bulkFilter.relationId) return;
                                    selectedProducts.forEach(p => {
                                        const newP = { ...p };
                                        const idx = newP.relationships.findIndex(r => r.name === bulkFilter.relationId);
                                        if (idx >= 0) {
                                            newP.relationships[idx] = { ...newP.relationships[idx], min: bulkFilter.min ?? 0, max: bulkFilter.max ?? 999 };
                                            onUpdateProduct(newP);
                                        }
                                    });
                                }}
                                className="w-full mt-4 bg-yellow-600/10 hover:bg-yellow-600 text-yellow-500 hover:text-white border border-yellow-500/20 font-black py-2.5 rounded-lg uppercase text-[9px] tracking-[0.2em] transition-all shadow-lg"
                            >
                                Aplicar Relación a Lote
                            </button>
                        </div>
                    </div>
                </div>
            </div>
                    </div>
                </div>
            </div>

            {/* Main Command Center: Matrix View */}
            <div className="flex-1 bg-gray-900/50 rounded-2xl border border-gray-800 shadow-2xl flex flex-col overflow-hidden">
                <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-4">
                        <h3 className="text-[12px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                           Consola de Comando Matricial 
                           <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full text-[10px] border border-cyan-500/20">{selectedProducts.length} Dietas</span>
                        </h3>
                        <div className="h-4 w-px bg-gray-700"></div>
                        <button onClick={() => setShowBulkPanel(!showBulkPanel)} className="flex items-center gap-2 text-[10px] font-black text-indigo-400 hover:text-indigo-300 uppercase transition-colors">
                            <SparklesIcon className="w-3.5 h-3.5" /> Ajustes Globales
                        </button>
                    </div>
                    <div className="flex bg-gray-950 p-1 rounded-lg border border-gray-800">
                        <button onClick={() => setActiveView('matrix')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${activeView === 'matrix' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Matriz</button>
                        <button onClick={() => setActiveView('cards')} className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${activeView === 'cards' ? 'bg-gray-800 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>Tarjetas</button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    {selectedProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-40">
                            <DatabaseIcon className="w-12 h-12 mb-4 text-gray-600" />
                            <p className="text-gray-400 font-black uppercase tracking-widest text-[14px]">Sin Selección Activa</p>
                        </div>
                    ) : (
                        activeView === 'matrix' ? (
                            <table className="w-full text-left border-collapse table-fixed">
                                <thead className="sticky top-0 z-20 bg-gray-900 shadow-md">
                                    <tr className="border-b border-gray-700">
                                        <th className="p-3 w-[250px] text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-900">Dieta / Categoría</th>
                                        <th className="p-3 w-[120px] text-[10px] font-black text-cyan-500 uppercase tracking-widest bg-gray-900 border-l border-gray-800">Lote (kg)</th>
                                        {Array.from(new Set(selectedProducts.flatMap(p => p.constraints.map(c => c.nutrientId)))).map(nutId => {
                                            const nut = nutrients.find(n => n.id === nutId);
                                            return (
                                                <th key={nutId} className="p-3 w-[150px] text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-900 border-l border-gray-800 text-center">
                                                    {nut?.name} <span className="text-[8px] opacity-50 block">{nut?.unit}</span>
                                                </th>
                                            );
                                        })}
                                        {Array.from(new Set(selectedProducts.flatMap(p => p.relationships.map(r => r.name)))).map(relName => (
                                            <th key={relName} className="p-3 w-[150px] text-[10px] font-black text-yellow-500 uppercase tracking-widest bg-gray-900 border-l border-gray-800 text-center">
                                                {relName} <span className="text-[8px] opacity-50 block">Ratio A/B</span>
                                            </th>
                                        ))}
                                        {Array.from(new Set(selectedProducts.flatMap(p => p.ingredientConstraints.filter(c => c.max < 100 || c.min > 0).map(c => c.ingredientId)))).map(ingId => {
                                            const ing = ingredients.find(i => i.id === ingId);
                                            return (
                                                <th key={ingId} className="p-3 w-[150px] text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-gray-900 border-l border-gray-800 text-center">
                                                    {ing?.name} <span className="text-[8px] opacity-50 block">Inclusión %</span>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                {Object.entries(selectedProducts.reduce((acc, p) => {
                                    const cat = p.category || 'Sin Categoría';
                                    if (!acc[cat]) acc[cat] = [];
                                    acc[cat].push(p);
                                    return acc;
                                }, {} as Record<string, Product[]>)).map(([category, prods]) => {
                                    const colorKey = getCategoryColor(category);
                                    const styles = getColorClasses(colorKey);
                                    return (
                                        <React.Fragment key={category}>
                                            <tr className="bg-gray-950 border-b border-gray-800">
                                                <td colSpan={100} className="p-2 px-4">
                                                    <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${styles.badge} text-white shadow-lg`}>
                                                        {category}
                                                    </span>
                                                </td>
                                            </tr>
                                            {prods.map(product => (
                                                <tr key={product.id} className={`border-b border-gray-800/80 ${styles.hover} transition-colors group`}>
                                                    <td className="p-3 font-bold text-white text-[13px] uppercase truncate">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-1.5 h-6 ${styles.line} rounded-full transition-all group-hover:scale-y-125`}></div>
                                                            {product.name}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 border-l border-gray-800/50">
                                                        <input 
                                                            type="number" 
                                                            value={batchSizes[product.id] || 1000}
                                                            onChange={(e) => setBatchSizes({...batchSizes, [product.id]: Number(e.target.value)})}
                                                            className={`w-full bg-gray-950/50 border border-gray-800 ${styles.text} font-mono text-[11px] rounded px-2 py-1 outline-none text-right focus:border-cyan-500`}
                                                        />
                                                    </td>
                                                    {/* Nutrients */}
                                                    {Array.from(new Set(selectedProducts.flatMap(p => p.constraints.map(c => c.nutrientId)))).map(nutId => {
                                                        const con = product.constraints.find(c => c.nutrientId === nutId);
                                                        return (
                                                            <td key={nutId} className="p-3 border-l border-gray-800/50">
                                                                <div className="flex items-center gap-1">
                                                                    <input 
                                                                        type="number" step="0.01" value={con?.min ?? ''} placeholder="Mín"
                                                                        onChange={(e) => {
                                                                            if (!onUpdateProduct) return;
                                                                            const val = parseFloat(e.target.value);
                                                                            const newC = [...product.constraints];
                                                                            const idx = newC.findIndex(c => c.nutrientId === nutId);
                                                                            if (idx >= 0) newC[idx].min = isNaN(val) ? 0 : val;
                                                                            else newC.push({ nutrientId: nutId, min: isNaN(val) ? 0 : val, max: 999 });
                                                                            onUpdateProduct({ ...product, constraints: newC });
                                                                        }}
                                                                        className="w-1/2 bg-gray-950/50 border border-gray-800 text-[10px] text-gray-400 rounded px-1 py-1 text-center font-mono focus:border-cyan-500"
                                                                    />
                                                                    <input 
                                                                        type="number" step="0.01" value={con && con.max < 999 ? con.max : ''} placeholder="Máx"
                                                                        onChange={(e) => {
                                                                            if (!onUpdateProduct) return;
                                                                            const val = parseFloat(e.target.value);
                                                                            const newC = [...product.constraints];
                                                                            const idx = newC.findIndex(c => c.nutrientId === nutId);
                                                                            if (idx >= 0) newC[idx].max = isNaN(val) ? 999 : val;
                                                                            else newC.push({ nutrientId: nutId, min: 0, max: isNaN(val) ? 999 : val });
                                                                            onUpdateProduct({ ...product, constraints: newC });
                                                                        }}
                                                                        className="w-1/2 bg-gray-950/50 border border-gray-800 text-[10px] text-gray-200 font-bold rounded px-1 py-1 text-center font-mono focus:border-cyan-500"
                                                                    />
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    {/* Relationships */}
                                                    {Array.from(new Set(selectedProducts.flatMap(p => p.relationships.map(r => r.name)))).map(relName => {
                                                        const rel = product.relationships.find(r => r.name === relName);
                                                        return (
                                                            <td key={relName} className="p-3 border-l border-gray-800/50 bg-yellow-500/5">
                                                                <div className="flex items-center gap-1">
                                                                    <input 
                                                                        type="number" step="0.01" value={rel?.min ?? ''} placeholder="Mín"
                                                                        onChange={(e) => {
                                                                            if (!onUpdateProduct) return;
                                                                            const val = parseFloat(e.target.value);
                                                                            const newR = [...product.relationships];
                                                                            const idx = newR.findIndex(r => r.name === relName);
                                                                            if (idx >= 0) {
                                                                                newR[idx].min = isNaN(val) ? 0 : val;
                                                                                onUpdateProduct({ ...product, relationships: newR });
                                                                            }
                                                                        }}
                                                                        className="w-1/2 bg-yellow-950/20 border border-yellow-800/30 text-[10px] text-yellow-500 font-mono rounded px-1 py-1 text-center focus:border-yellow-500"
                                                                    />
                                                                    <input 
                                                                        type="number" step="0.01" value={rel && rel.max < 999 ? rel.max : ''} placeholder="Máx"
                                                                        onChange={(e) => {
                                                                            if (!onUpdateProduct) return;
                                                                            const val = parseFloat(e.target.value);
                                                                            const newR = [...product.relationships];
                                                                            const idx = newR.findIndex(r => r.name === relName);
                                                                            if (idx >= 0) {
                                                                                newR[idx].max = isNaN(val) ? 999 : val;
                                                                                onUpdateProduct({ ...product, relationships: newR });
                                                                            }
                                                                        }}
                                                                        className="w-1/2 bg-yellow-950/20 border border-yellow-800/30 text-[10px] text-yellow-200 font-bold rounded px-1 py-1 text-center font-mono focus:border-yellow-500"
                                                                    />
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    {/* Ingredient Inclusion */}
                                                    {Array.from(new Set(selectedProducts.flatMap(p => p.ingredientConstraints.filter(c => c.max < 100 || c.min > 0).map(c => c.ingredientId)))).map(ingId => {
                                                        const con = product.ingredientConstraints.find(c => c.ingredientId === ingId);
                                                        return (
                                                            <td key={ingId} className="p-3 border-l border-gray-800/50 bg-indigo-500/5">
                                                                <div className="flex items-center gap-1">
                                                                    <input 
                                                                        type="number" step="0.01" value={con?.min ?? ''} placeholder="Mín"
                                                                        onChange={(e) => {
                                                                            if (!onUpdateProduct) return;
                                                                            const val = parseFloat(e.target.value);
                                                                            const newC = [...product.ingredientConstraints];
                                                                            const idx = newC.findIndex(c => c.ingredientId === ingId);
                                                                            if (idx >= 0) newC[idx].min = isNaN(val) ? 0 : val;
                                                                            else newC.push({ ingredientId: ingId, min: isNaN(val) ? 0 : val, max: 100 });
                                                                            onUpdateProduct({ ...product, ingredientConstraints: newC });
                                                                        }}
                                                                        className="w-1/2 bg-indigo-950/20 border border-indigo-900/30 text-[10px] text-indigo-400 rounded px-1 py-1 text-center font-mono focus:border-indigo-500"
                                                                    />
                                                                    <input 
                                                                        type="number" step="0.01" value={con && con.max < 100 ? con.max : ''} placeholder="Máx"
                                                                        onChange={(e) => {
                                                                            if (!onUpdateProduct) return;
                                                                            const val = parseFloat(e.target.value);
                                                                            const newC = [...product.ingredientConstraints];
                                                                            const idx = newC.findIndex(c => c.ingredientId === ingId);
                                                                            if (idx >= 0) newC[idx].max = isNaN(val) ? 100 : val;
                                                                            else newC.push({ ingredientId: ingId, min: 0, max: isNaN(val) ? 100 : val });
                                                                            onUpdateProduct({ ...product, ingredientConstraints: newC });
                                                                        }}
                                                                        className="w-1/2 bg-indigo-950/20 border border-indigo-900/30 text-[10px] text-white font-bold rounded px-1 py-1 text-center font-mono focus:border-indigo-500"
                                                                    />
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                })}
                                </tbody>
                            </table>
                        ) : (
                            /* Card View (Original) */
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4">
                                {selectedProducts.map((p) => (
                                     <div key={p.id} className="bg-gray-950 border border-gray-800 p-4 rounded-xl shadow-lg relative overflow-hidden group">
                                         <div className="absolute top-0 left-0 w-1 h-full bg-cyan-600"></div>
                                         <h4 className="text-white font-black uppercase text-[15px]">{p.name}</h4>
                                         <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mt-1 mb-4">{p.category}</p>
                                         <div className="bg-gray-900 p-2 rounded-lg border border-gray-800 flex justify-between items-center">
                                             <span className="text-[10px] font-black text-gray-400 uppercase">Lote (kg)</span>
                                             <input type="number" value={batchSizes[p.id] || 1000} onChange={(e) => setBatchSizes({...batchSizes, [p.id]: Number(e.target.value)})} className="bg-transparent text-cyan-400 font-mono text-right outline-none w-20" />
                                         </div>
                                     </div>
                                ))}
                            </div>
                        )
                    )}
                </div>

                {/* Footer Optimizer Always Visible */}
                <div className="p-4 bg-gray-900 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                    <div className="flex gap-4">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Global Batch</span>
                            <span className="text-[18px] font-black font-mono text-cyan-400">{Object.values(batchSizes).reduce((a, b) => a + b, 0).toLocaleString()} <span className="text-[10px]">kg</span></span>
                        </div>
                    </div>
                    <button 
                        onClick={handleRunOptimization}
                        disabled={isOptimizing}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-12 py-3 rounded-xl shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all transform hover:scale-[1.05] flex items-center gap-3 text-[15px] uppercase tracking-[0.2em]"
                    >
                        {isOptimizing ? <RefreshIcon className="w-5 h-5 animate-spin" /> : <CalculatorIcon className="w-6 h-6"/>}
                        OPTIMIZAR TODO EL GRUPO
                    </button>
                    <div className="w-[120px]"></div> {/* Spacer */}
                </div>
            </div>

            {/* Agile Workspace Drawer (Maintains current logic for results) */}
            {isDrawerOpen && resultsData && (
                <>
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" onClick={handleAttemptCloseDrawer} />
                    <div className="fixed inset-y-0 right-0 w-[85vw] bg-gray-950 border-l border-gray-800 z-[100] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col transform animate-slide-in-right">
                        <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <SparklesIcon className="w-5 h-5 text-emerald-400" />
                                <h2 className="text-[16px] font-black text-white uppercase tracking-wide">Resultados del Lote Consolidado</h2>
                            </div>
                            <button onClick={handleAttemptCloseDrawer} className="text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-bold text-[11px] uppercase">
                                Salir <XCircleIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto relative bg-gray-900/30">
                            <GroupResultsScreen 
                                results={resultsData.result} 
                                assignments={resultsData.assignments} 
                                products={products} 
                                ingredients={ingredients} 
                                nutrients={nutrients} 
                                isDynamicMatrix={matrixMode === 'dynamic'} 
                                onUpdateProduct={onUpdateProduct || (() => {})} 
                                onCloseDrawer={() => {
                                    setIsDrawerOpen(false);
                                    setResultsData(null);
                                    setIsDirty?.(false);
                                }}
                                savedFormulas={savedFormulas}
                                setSavedFormulas={setSavedFormulas}
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
