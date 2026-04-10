import React, { useState } from 'react';
import { Product, Ingredient, Nutrient, GroupFormulationRequest } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { DatabaseIcon, CubeIcon, CalculatorIcon, SparklesIcon, PlusIcon, TrashIcon } from './icons';
import { solveGroupFormulation } from '../services/solver';

interface GroupOptimizationScreenProps {
  products: Product[];
  ingredients: Ingredient[];
  nutrients: Nutrient[];
  isDynamicMatrix: boolean;
  onOpenInNewWindow?: (data: any, name: string) => void;
}

export const GroupOptimizationScreen: React.FC<GroupOptimizationScreenProps> = ({ 
    products, 
    ingredients, 
    nutrients,
    isDynamicMatrix,
    onOpenInNewWindow
}) => {
    const { t } = useTranslations();
    const [selectedAssignments, setSelectedAssignments] = useState<{ id: string, productId: string, batchSize: number }[]>([]);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [useStock, setUseStock] = useState(true);

    const handleAddProduct = () => {
        if (products.length > 0) {
            setSelectedAssignments([...selectedAssignments, { id: `as-${Date.now()}-${Math.random().toString(36).substr(2,5)}`, productId: products[0].id, batchSize: 1000 }]);
        }
    };

    const handleRemoveProduct = (index: number) => {
        setSelectedAssignments(selectedAssignments.filter((_, i) => i !== index));
    };

    const handleUpdateAssignment = (index: number, key: string, value: any) => {
        const newAssignments = [...selectedAssignments];
        (newAssignments[index] as any)[key] = value;
        setSelectedAssignments(newAssignments);
    };

    const handleRunGroupOptimization = () => {
        if (selectedAssignments.length === 0) return;
        setIsOptimizing(true);
        
        // Preparation
        const assignments = selectedAssignments.map(a => ({
            id: a.id,
            product: products.find(p => p.id === a.productId)!,
            batchSize: a.batchSize
        }));

        setTimeout(() => {
            const result = solveGroupFormulation(assignments, ingredients, nutrients, isDynamicMatrix, useStock);
            console.log("Group Result:", result);
            setIsOptimizing(false);
            if (result.feasible) {
                if (onOpenInNewWindow) {
                    onOpenInNewWindow({ result, assignments }, `Grupo: ${assignments.map(a => a.product.name).join(' + ')}`);
                } else {
                    alert("Optimización Multi-Mezcla completada con éxito. Ver consola para detalles (Fase BETA).");
                }
            } else {
                alert("El grupo es inviable con el stock actual.");
            }
        }, 1000);
    };

    return (
        <div className="p-3 space-y-4 animate-fade-in">
            <div className="bg-gradient-to-r from-emerald-900/40 to-cyan-900/40 p-3 rounded border border-emerald-500/20 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-500/20 p-1.5 rounded border border-emerald-500/30">
                        <DatabaseIcon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                        <h2 className="text-[15px] font-bold text-white uppercase tracking-tight leading-none">Optimización por Grupo (Masa de Fórmulas)</h2>
                        <p className="text-emerald-400/60 font-semibold text-[10px] uppercase tracking-wider mt-1 leading-none">Cálculo Simultáneo & Stock Compartido</p>
                    </div>
                </div>
                
                {/* Global Stock Toggle */}
                <div className={`p-2 rounded border flex items-center gap-3 transition-all ${useStock ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-gray-800 border-gray-700 opacity-60'}`}>
                    <div className="flex flex-col text-right">
                        <span className="text-[10px] font-black text-white uppercase leading-none">Restringir por Stock</span>
                        <span className="text-[8px] text-gray-500 uppercase mt-0.5">{useStock ? 'Activo' : 'Desactivado (Teórico)'}</span>
                    </div>
                    <button 
                        onClick={() => setUseStock(!useStock)}
                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors ${useStock ? 'bg-emerald-500' : 'bg-gray-600'}`}
                    >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${useStock ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                {/* Setup */}
                <div className="lg:col-span-12 space-y-3">
                    <div className="bg-gray-800/40 rounded border border-gray-700/50 p-3">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Productos del Grupo</h3>
                            <button onClick={handleAddProduct} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1 rounded transition-all flex items-center font-semibold text-[13px]">
                                <PlusIcon className="w-3 h-3 mr-1" /> Añadir
                            </button>
                        </div>

                        <div className="space-y-2">
                            {selectedAssignments.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed border-gray-700 rounded text-gray-500 text-[11px]">
                                    Añade productos para comenzar
                                </div>
                            )}
                            {selectedAssignments.map((assign, idx) => (
                                <div key={idx} className="bg-gray-900/50 p-2 rounded flex flex-wrap items-center gap-2 border border-gray-700/50">
                                    <div className="flex-1 min-w-[200px]">
                                        <select 
                                            value={assign.productId} 
                                            onChange={e => handleUpdateAssignment(idx, 'productId', e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded p-1 text-[13px] outline-none focus:border-emerald-500"
                                        >
                                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="w-24">
                                        <input 
                                            type="number" 
                                            value={assign.batchSize}
                                            onChange={e => handleUpdateAssignment(idx, 'batchSize', Number(e.target.value))}
                                            className="w-full bg-gray-800 border border-gray-700 text-white rounded p-1 text-[13px] outline-none focus:border-emerald-500 text-center"
                                        />
                                    </div>
                                    <button onClick={() => handleRemoveProduct(idx)} className="text-red-400 hover:bg-red-400/10 p-1.5 rounded transition-all">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {selectedAssignments.length > 0 && (
                            <div className="mt-4 flex justify-center">
                                <button 
                                    onClick={handleRunGroupOptimization}
                                    disabled={isOptimizing}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2 rounded shadow transition-all transform hover:scale-[1.02] flex items-center gap-2 text-[13px]"
                                >
                                    {isOptimizing ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <SparklesIcon className="w-4 h-4 animate-pulse"/>}
                                    <span className="uppercase tracking-wider">Ejecutar Optimización 360</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
