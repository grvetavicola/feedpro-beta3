import React, { useState, useEffect } from 'react';
import { Product, Ingredient, Nutrient } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { DatabaseIcon, CalculatorIcon, SparklesIcon, XCircleIcon } from './icons';
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
}

export const GroupOptimizationScreen: React.FC<GroupOptimizationScreenProps> = ({ 
    products, 
    ingredients, 
    nutrients,
    isDynamicMatrix,
    selectedDietIds,
    onOpenInNewWindow,
    onUpdateProduct
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
            } else {
                // Even if infeasible group, show it so user can fix it in agile workspace
                setResultsData({ result, assignments });
                setIsDrawerOpen(true);
            }
        }, 800);
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
                        <button onClick={() => setUseStock(!useStock)} className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${useStock ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                            <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${useStock ? 'translate-x-4' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    
                    <div className="w-px h-6 bg-gray-700"></div>

                    {/* Matrix Toggle */}
                    <div className={`px-3 py-1.5 rounded flex items-center gap-2 transition-all ${matrixMode === 'dynamic' ? 'bg-indigo-500/10 border-indigo-500/30 border' : 'border border-transparent'}`}>
                        <div className="flex flex-col text-right">
                            <span className="text-[9px] font-black text-gray-300 uppercase leading-none">Matriz Dinámica</span>
                        </div>
                        <button onClick={() => setMatrixMode(matrixMode === 'dynamic' ? 'general' : 'dynamic')} className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors ${matrixMode === 'dynamic' ? 'bg-indigo-500' : 'bg-gray-600'}`}>
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

            {/* Main Selection Canvas */}
            <div className="flex-1 bg-gray-800/40 rounded-xl border border-gray-700/50 flex flex-col overflow-hidden">
                <div className="flex justify-between items-center bg-gray-900/40 p-3 border-b border-gray-700/50 shrink-0">
                    <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">Dietas Seleccionadas para Ejecución <span className="bg-gray-800 px-1.5 py-0.5 rounded text-cyan-400">{selectedProducts.length}</span></h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {selectedProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4 border border-gray-800 shadow-inner">
                                <DatabaseIcon className="w-8 h-8 text-cyan-500/20" />
                            </div>
                            <p className="text-gray-400 font-bold text-[13px] uppercase tracking-wider">Lienzo Vacío</p>
                            <p className="text-gray-600 text-[11px] mt-2 max-w-sm">Utilice el <strong>Árbol de Dietas</strong> en la barra lateral izquierda para seleccionar los perfiles nutricionales que desea formular.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                            {selectedProducts.map((product) => (
                                <div key={product.id} className="bg-gray-900 border border-cyan-500/30 p-3 rounded-xl shadow-lg shadow-cyan-950/20 flex flex-col gap-3 relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                                    <div className="pl-2">
                                        <h4 className="text-[14px] font-black text-white truncate">{product.name}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">REF-{product.code}</span>
                                            {product.category && <span className="text-[9px] text-emerald-500/70 font-black uppercase tracking-tighter bg-emerald-500/10 px-1 rounded">CAT: {product.category}</span>}
                                        </div>
                                    </div>
                                    
                                    <div className="bg-gray-950 p-2 rounded-lg border border-gray-800 flex items-center justify-between pl-3 mt-auto">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Lote Objetivo (kg):</span>
                                        <input 
                                            type="number" 
                                            value={batchSizes[product.id] || 1000}
                                            onChange={(e) => setBatchSizes({...batchSizes, [product.id]: Number(e.target.value)})}
                                            className="w-20 bg-gray-800 border border-gray-700 text-cyan-300 font-black rounded px-2 py-1 text-[13px] outline-none focus:border-cyan-500 text-right"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Always-Visible Execute Region */}
                {selectedProducts.length > 0 && (
                    <div className="p-4 bg-gray-950/80 border-t border-cyan-500/20 flex justify-center shrink-0 backdrop-blur-md">
                        <button 
                            onClick={handleRunOptimization}
                            disabled={isOptimizing}
                            className="bg-cyan-600 hover:bg-cyan-500 text-white font-black px-12 py-3 rounded-xl shadow-[0_0_20px_rgba(8,145,178,0.3)] transition-all transform hover:scale-[1.02] flex items-center gap-3 text-[14px] uppercase tracking-widest"
                        >
                            {isOptimizing ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : <SparklesIcon className="w-5 h-5 animate-pulse"/>}
                            Ejecutar Optimización
                        </button>
                    </div>
                )}
            </div>

            {/* Agile Workspace Right-Side Drawer */}
            {isDrawerOpen && resultsData && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]" onClick={() => setIsDrawerOpen(false)} />
                    
                    {/* Drawer */}
                    <div className="fixed inset-y-0 right-0 w-[950px] bg-gray-950 border-l border-gray-800 z-[100] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col transform transition-transform animate-slide-in-right">
                        <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center shrink-0">
                            <div className="flex items-center gap-3">
                                <SparklesIcon className="w-5 h-5 text-cyan-400" />
                                <div>
                                    <h2 className="text-[16px] font-black text-white uppercase tracking-wide">Espacio de Trabajo Ágil</h2>
                                    <p className="text-[10px] text-gray-400 uppercase tracking-widest">Feedback Loop Integrado</p>
                                </div>
                            </div>
                            <button onClick={() => setIsDrawerOpen(false)} className="text-gray-500 hover:text-white bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors font-bold text-[11px] uppercase">
                                Cerrar <XCircleIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto w-full relative">
                            {/* Inside the drawer we embed the existing result screen with all its tactical power */}
                            <GroupResultsScreen 
                                results={resultsData.result} 
                                assignments={resultsData.assignments} 
                                products={products} 
                                ingredients={ingredients} 
                                nutrients={nutrients} 
                                isDynamicMatrix={matrixMode === 'dynamic'} 
                                onUpdateProduct={onUpdateProduct || (() => {})} 
                            />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
