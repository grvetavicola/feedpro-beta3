import React, { useState, useMemo, useEffect } from 'react';
import { Product, Ingredient, Nutrient, FormulationResult, Client, SavedFormula } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { SparklesIcon, CalculatorIcon, PrintIcon, SaveIcon, FolderIcon, TrashIcon, ExclamationIcon, ClockIcon, SearchIcon, ChevronDownIcon, EyeIcon, DuplicateIcon, MenuIcon } from './icons';
import { solveFeedFormulation } from '../services/solver';
import { OptimizationResults } from './OptimizationResults';
import { EditIngredientModal } from './EditIngredientModal';

interface FormulationScreenProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  ingredients: Ingredient[];
  nutrients: Nutrient[];
  userSubscription?: 'free' | 'pro';
  onUpgradeRequest?: () => void;
  clients?: Client[];
  selectedClientId?: string;
  savedFormulas?: SavedFormula[];
  setSavedFormulas?: React.Dispatch<React.SetStateAction<SavedFormula[]>>;
  isDynamicMatrix: boolean;
  onOpenInNewWindow?: (result: FormulationResult, name: string) => void;
  forceResult?: FormulationResult;
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
}

const LoadingSpinner: React.FC = () => (
    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
);

export const FormulationScreen: React.FC<FormulationScreenProps> = ({ 
    products, 
    setProducts,
    ingredients, 
    nutrients, 
    userSubscription = 'pro', 
    onUpgradeRequest,
    clients = [],
    selectedClientId,
    savedFormulas = [],
    setSavedFormulas,
    isDynamicMatrix,
    onOpenInNewWindow,
    forceResult,
    setIngredients
}) => {
    const { t } = useTranslations();
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [batchSize, setBatchSize] = useState<number>(1000);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(products[0]?.id || null);
  const [localResult, setLocalResult] = useState<FormulationResult | null>(forceResult || null);
  const [showResultsModal, setShowResultsModal] = useState(!!forceResult);

  useEffect(() => {
      if (forceResult) {
          setLocalResult(forceResult);
          setShowResultsModal(true);
      }
  }, [forceResult]);
  const [availableIngredientIds, setAvailableIngredientIds] = useState<Set<string>>(new Set(ingredients.map(i => i.id)));

  const currentProductData = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

  const handleOptimizeSingle = () => {
    if (!currentProductData) return;
    const activeIngredients = ingredients.filter(i => availableIngredientIds.has(i.id) && i.price > 0);
    
    if (activeIngredients.length === 0) {
      alert("No hay ingredientes activos con precio para optimizar.");
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
        try {
            const previousCost = localResult?.totalCost || undefined;
            const result = solveFeedFormulation(currentProductData, activeIngredients, nutrients, batchSize, isDynamicMatrix);
            if (previousCost) result.previousCost = previousCost;
            setLocalResult(result);
            if (result.status === 'OPTIMAL') {
                if (onOpenInNewWindow) {
                    onOpenInNewWindow(result, `Dieta: ${currentProductData.name}`);
                } else {
                    setShowResultsModal(true);
                }
            } else {
                alert("La dieta es matemáticamente inviable con las restricciones actuales.");
            }
        } catch (error: any) {
            console.error(error);
            alert(`Error en la optimización: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, 500);
  };

  const handleSaveFormula = () => {
      if (!localResult || !selectedClientId || !setSavedFormulas || !currentProductData) return;
      const newFormula: SavedFormula = {
          id: `sf${Date.now()}`,
          clientId: selectedClientId,
          name: `${currentProductData.name} - ${new Date().toLocaleDateString()}`,
          date: new Date().toISOString(),
          result: localResult
      };
      setSavedFormulas(prev => [...prev, newFormula]);
      setShowResultsModal(false);
      alert("✓ Dieta guardada y enviada a producción.");
  };

  const sortedIngredients = [...ingredients].sort((a,b) => (a.code || 0) - (b.code || 0));
  const sortedNutrients = [...nutrients].sort((a,b) => (a.code || 0) - (b.code || 0));

  return (
    <div className="p-3 space-y-3 flex flex-col h-full bg-gray-950/20">
      
      {/* Header Panel */}
      <div className="bg-gray-800 rounded p-2 px-4 border border-gray-700 shadow flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
              <CalculatorIcon className="text-cyan-400 w-5 h-5 ml-1"/>
              <div><h2 className="text-[15px] font-bold text-white tracking-tight leading-none">Consola de Optimización</h2><p className="text-[11px] text-gray-500 font-medium leading-none mt-1">Motor táctica de optimización multivariable.</p></div>
          </div>
          <div className="flex gap-2 bg-gray-900/50 p-1.5 rounded border border-gray-700/50">
             <div className="flex flex-col"><label className="text-[9px] text-gray-500 font-bold uppercase ml-1 mb-0.5">Dieta</label><select value={selectedProductId || ''} onChange={e => setSelectedProductId(e.target.value)} className="bg-gray-800 text-[13px] text-white px-2 py-1 rounded border border-gray-700 outline-none focus:border-cyan-500 min-w-[150px]">{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
             <div className="flex flex-col"><label className="text-[9px] text-gray-500 font-bold uppercase ml-1 mb-0.5">Lote (kg)</label><input type="number" value={batchSize} onChange={e => setBatchSize(Number(e.target.value))} className="bg-gray-800 text-[13px] text-white px-2 py-1 rounded border border-gray-700 outline-none focus:border-cyan-500 w-20 text-center" /></div>
          </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3 min-h-0 overflow-hidden">
          {/* Insumos Picker */}
          <div className="bg-gray-800/40 rounded border border-gray-700 flex flex-col overflow-hidden shadow-sm">
              <div className="p-2 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                  <h3 className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Insumos & Disponibilidad</h3>
                  <div className="flex gap-1"><button onClick={() => setAvailableIngredientIds(new Set(ingredients.map(i => i.id)))} className="text-[9px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 hover:text-white uppercase">Todos</button><button onClick={() => setAvailableIngredientIds(new Set())} className="text-[9px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-400 hover:text-white uppercase">Cero</button></div>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                  {sortedIngredients.map(ing => (
                      <div key={ing.id} className={`group flex items-center justify-between p-1.5 px-2 rounded border transition-all ${availableIngredientIds.has(ing.id) ? 'bg-cyan-900/30 border-cyan-500/50' : 'bg-gray-900/20 border-transparent opacity-50 grayscale'}`}>
                          <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
                              const ns = new Set(availableIngredientIds);
                              if (ns.has(ing.id)) ns.delete(ing.id); else ns.add(ing.id);
                              setAvailableIngredientIds(ns);
                          }}>
                              <div className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-colors ${availableIngredientIds.has(ing.id) ? 'bg-cyan-600 border-cyan-500' : 'bg-gray-800 border-gray-700'}`}>{availableIngredientIds.has(ing.id) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}</div>
                              <div 
                                onClick={(e) => { e.stopPropagation(); setEditingIngredient(ing); }}
                                className="font-medium text-gray-200 text-[13px] hover:text-cyan-400 hover:underline decoration-cyan-500/30 underline-offset-4"
                                title="Click para editar composición completa"
                              >
                                  {ing.name}
                              </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-600 font-normal uppercase">$</span>
                              <input 
                                  type="number" 
                                  step="0.001"
                                  value={ing.price}
                                  onChange={(e) => {
                                      const newPrice = parseFloat(e.target.value) || 0;
                                      setIngredients(prev => prev.map(i => i.id === ing.id ? { ...i, price: newPrice } : i));
                                  }}
                                  className="bg-gray-900/80 text-cyan-400 font-mono font-bold text-[13px] w-14 text-right rounded border border-cyan-500/10 focus:border-cyan-500/50 outline-none p-0.5"
                                  title="Editar precio directamente"
                              />
                              <span className="text-[10px] text-gray-600 font-normal">/ kg</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>

          {/* Constraints Monitor */}
          <div className="bg-gray-800/40 rounded border border-gray-700 flex flex-col overflow-hidden shadow-sm">
              <div className="p-2 bg-gray-800 border-b border-gray-700 font-bold text-[10px] text-gray-300 uppercase tracking-widest">Requerimientos del Perfil</div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                  {currentProductData ? (
                      <div className="space-y-2">
                        <div className="bg-gray-900/50 rounded p-2 border border-gray-700/50">
                            <p className="text-[9px] text-gray-500 font-bold uppercase mb-1.5 border-b border-gray-700/50 pb-0.5">Nutrientes ({currentProductData.constraints.length})</p>
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-3 gap-y-1">
                                {currentProductData.constraints.map(c => {
                                    const nut = nutrients.find(n => n.id === c.nutrientId);
                                    return (
                                        <div key={c.nutrientId} className="flex justify-between items-center text-[11px] p-1 rounded hover:bg-gray-800 transition-colors overflow-hidden">
                                            <span className="text-gray-400 truncate mr-2">{nut?.name}</span>
                                            <div className="flex items-center gap-1 font-mono text-gray-500 shrink-0 text-[10px]">
                                                <span>{c.min}</span><span className="text-gray-700">-</span><span>{c.max}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {currentProductData.relationships.length > 0 && (
                            <div className="bg-yellow-900/05 rounded p-2 border border-yellow-700/10">
                                <p className="text-[9px] text-yellow-600/80 font-bold uppercase mb-1.5 border-b border-yellow-700/10 pb-0.5">Ratios Bio-Técnicos</p>
                                <div className="space-y-1">
                                    {currentProductData.relationships.map(r => (
                                        <div key={r.id} className="flex justify-between text-[11px] p-1 border-l-2 border-yellow-500/20 bg-yellow-500/05 rounded-r">
                                            <span className="text-gray-300">{r.name}</span>
                                            <span className="text-yellow-500/60 font-mono text-[10px]">{r.min} - {r.max}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                      </div>
                  ) : <div className="p-6 text-center text-[13px] text-gray-500 italic">No hay producto seleccionado.</div>}
              </div>
              <div className="p-3 bg-gray-900/50 border-t border-gray-700 flex justify-center shrink-0">
                  <button onClick={handleOptimizeSingle} disabled={isLoading || !currentProductData} className="bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-white font-semibold py-2 px-8 rounded shadow text-[13px] transform hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale uppercase">
                      {isLoading ? <LoadingSpinner/> : <SparklesIcon className="w-4 h-4 animate-pulse"/>}
                      <span>{isLoading ? 'Calculando...' : 'Optimizar Dieta'}</span>
                  </button>
              </div>
          </div>
      </div>

      {showResultsModal && localResult && currentProductData && (
          <OptimizationResults 
            result={localResult}
            product={currentProductData}
            user={{ name: 'Admin', subscription: 'pro' }}
            onClose={() => setShowResultsModal(false)}
            onUpgradeRequest={() => alert("Función exclusiva de la versión PRO.")}
            onProduce={handleSaveFormula}
            onReoptimize={(newConstraints) => {
                const updatedProduct = { ...currentProductData, constraints: newConstraints };
                setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
                setIsLoading(true);
                setTimeout(() => {
                    try {
                        const previousCost = localResult?.totalCost || undefined;
                        const activeIngredients = ingredients.filter(i => availableIngredientIds.has(i.id) && i.price > 0);
                        const result = solveFeedFormulation(updatedProduct, activeIngredients, nutrients, batchSize, isDynamicMatrix);
                        if (previousCost) result.previousCost = previousCost;
                        setLocalResult(result);
                        if (result.status !== 'OPTIMAL') {
                            alert("La dieta es matemáticamente inviable con los nuevos requerimientos.");
                        }
                    } catch (error: any) {
                        alert(`Error en la optimización: ${error.message}`);
                    } finally {
                        setIsLoading(false);
                    }
                }, 500);
            }}
            ingredients={ingredients}
            nutrients={nutrients}
          />
      )}

      {editingIngredient && (
          <EditIngredientModal 
            ingredient={editingIngredient}
            nutrients={nutrients}
            onSave={(updated) => {
                setIngredients(prev => prev.map(i => i.id === updated.id ? updated : i));
                setEditingIngredient(null);
            }}
            onClose={() => setEditingIngredient(null)}
          />
      )}
    </div>
  );
};
