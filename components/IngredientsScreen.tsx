import React, { useState, useRef, useEffect } from 'react';
import { Ingredient, Nutrient, ClientWorkspace } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { PencilIcon, TrashIcon, PlusIcon, UploadIcon, SaveIcon, XCircleIcon, SparklesIcon, FlaskIcon, MenuIcon, ZapIcon } from './icons'; 
import { parseIngredientsWithGemini } from '../services/geminiService';
import { EditIngredientModal } from './EditIngredientModal';
import { BulkPriceEditorModal } from './BulkPriceEditorModal';

declare global {
    interface Window {
        XLSX: any;
    }
}

interface IngredientsScreenProps {
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  nutrients: Nutrient[];
  setNutrients?: React.Dispatch<React.SetStateAction<Nutrient[]>>;
  setIsDirty?: (dirty: boolean) => void;
  onUpdateIngredientPrice?: (prices: Record<string, number>) => void;
  workspaces?: Record<string, ClientWorkspace>;
  activeClientId?: string;
}

interface ParsedIngredient {
    name: string;
    price?: number;
  nutrients: Record<string, number>;
}

interface ParsedNewNutrient {
    tempId: string;
    name: string;
    unit: string;
}

// Shared components moved to EditIngredientModal.tsx

export const IngredientsScreen: React.FC<IngredientsScreenProps> = ({ 
    ingredients, setIngredients, nutrients, setNutrients, setIsDirty,
    onUpdateIngredientPrice, workspaces = {}, activeClientId
}) => {
    const { t } = useTranslations();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
    const [isPriceModalOpen, setIsPriceModalOpen] = useState(false);
    const [selectedMatrix, setSelectedMatrix] = useState<string>('ALL');

    // Extraer matrices únicas
    const matrices = Array.from(new Set(ingredients.map(i => i.matrix).filter(Boolean))) as string[];
    console.log("DEBUG: Matrices encontradas en ingredientes:", matrices);
    
    // Import States Removed (Transferred to SettingsScreen)
    const getNextCode = () => {
        if (ingredients.length === 0) return 100;
        const maxCode = Math.max(...ingredients.map(i => i.code || 0));
        return maxCode + 1;
    }

    const handleSaveIngredient = (updatedIngredient: Ingredient) => {
        setIngredients(ingredients.map(i => i.id === updatedIngredient.id ? updatedIngredient : i));
        setEditingIngredient(null);
        setIsDirty?.(true);
    };
    
    const handleAddNew = () => {
        const newId = `i${Date.now()}`;
        const newIngredient: Ingredient = {
            id: newId,
            code: getNextCode(),
            name: t('ingredients.newIngredientName'),
            category: 'Macro',
            price: 0,
            stock: 0,
            nutrients: {},
            matrix: selectedMatrix === 'ALL' ? undefined : selectedMatrix
        };
        setIngredients([...ingredients, newIngredient]);
        setEditingIngredient(newIngredient);
    };

    const handleDelete = (id: string) => {
        if (window.confirm(t('ingredients.deleteConfirm'))) {
            setIngredients(ingredients.filter(i => i.id !== id));
            setIsDirty?.(true);
        }
    };

    // Filtros y Orden
    const sortedIngredients = [...ingredients]
        .filter(i => {
            const matchesSearch = i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                (i.code && i.code.toString().includes(searchTerm));
            const matchesMatrix = selectedMatrix === 'ALL' || i.matrix === selectedMatrix;
            return matchesSearch && matchesMatrix;
        })
        .sort((a,b) => (a.code || 0) - (b.code || 0));
    const sortedNutrients = [...nutrients].sort((a,b) => (a.code || 0) - (b.code || 0));
  
    return (
        <div className="p-3 space-y-3 flex flex-col h-full animate-fade-in w-full">
            <div className="relative bg-gradient-to-br from-cyan-900/40 to-indigo-900/40 rounded-xl p-4 border border-cyan-500/20 overflow-hidden shadow-md flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full -mr-12 -mt-12 blur-3xl opacity-30"></div>
                <div className="relative z-10 flex items-center gap-4 w-full md:w-auto">
                     <div className="bg-cyan-950/50 p-2.5 rounded-xl border border-cyan-800/50 backdrop-blur-sm shadow-inner shrink-0 hidden sm:flex items-center justify-center">
                         <img src="/icons/ingredient.png" className="w-8 h-8 object-contain saturate-200 hue-rotate-15 contrast-125 brightness-125 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" alt="Icon Ingredients" />
                     </div>
                     <div className="space-y-0.5 max-w-xl text-left w-full">
                        <div className="flex items-center gap-2 text-cyan-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                          <SparklesIcon className="w-3 h-3"/> Módulo de Control de Matriz
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-white leading-tight uppercase tracking-tight">{t('ingredients.title')}</h1>
                        <p className="text-gray-400 font-bold text-[11px] md:text-[12px] leading-snug uppercase tracking-widest">{t('nav.ingredients')}</p>
                     </div>
                </div>

                {/* Buscador de Insumos */}
                <div className="relative z-10 w-full md:w-64">
                    <input 
                        type="text"
                        placeholder="Buscar Insumo o Código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-900/60 border border-cyan-500/30 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-cyan-400 transition-all placeholder:text-gray-500"
                    />
                </div>

                <div className="flex gap-2 items-center flex-wrap justify-end relative z-10">
                    
                    {/* View Toggle */}
                    <div className="bg-gray-800 p-1 rounded-lg border border-gray-700 flex mr-2">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            {t('common.list')}
                        </button>
                        <button 
                            onClick={() => setViewMode('matrix')}
                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'matrix' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            {t('common.matrix')}
                        </button>
                    </div>

                    <button 
                      onClick={() => setIsPriceModalOpen(true)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1.5 px-4 rounded-lg flex items-center gap-2 text-[13px] border border-indigo-400/30 transition-all shadow-lg active:scale-95"
                    >
                        <SparklesIcon className="w-4 h-4" /> CAMBIAR PRECIOS MASIVO
                    </button>

                    <button onClick={handleAddNew} className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-1 px-3 rounded flex items-center gap-2 text-[13px]">
                        <PlusIcon className="w-3 h-3" /> {t('ingredients.addButton')}
                    </button>
                </div>
            </div>

            {/* Matrix Tabs Selector */}
            {matrices.length > 0 && (
                <div className="flex items-center gap-2 px-1 overflow-x-auto pb-1 shrink-0 scrollbar-hide">
                    <button 
                        onClick={() => setSelectedMatrix('ALL')}
                        className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${selectedMatrix === 'ALL' ? 'bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/20' : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                    >
                        Todas las Matrices
                    </button>
                    {matrices.sort().map(m => (
                        <button 
                            key={m}
                            onClick={() => setSelectedMatrix(m)}
                            className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border whitespace-nowrap ${selectedMatrix === m ? 'bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/20' : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                        >
                            {m}
                        </button>
                    ))}
                    <div className="h-4 w-px bg-gray-800 mx-2"></div>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter italic">Filtrando por {selectedMatrix === 'ALL' ? 'todo el inventario' : selectedMatrix}</p>
                </div>
            )}
            
            <div className="bg-gray-800/50 p-2 rounded border border-gray-700 flex-1 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {viewMode === 'list' ? (
                        <table className="w-full text-left text-gray-300">
                            <thead className="text-[11px] font-black text-emerald-400 uppercase bg-gray-900 border-b border-gray-700 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-3 py-3 tracking-widest text-left">Cód</th>
                                    <th scope="col" className="px-3 py-3 tracking-widest text-left">{t('ingredients.tableHeaderName')}</th>
                                    <th scope="col" className="px-3 py-3 tracking-widest text-left">Cat.</th>
                                    <th scope="col" className="px-3 py-3 tracking-widest text-left">Stock (kg)</th>
                                    <th scope="col" className="px-3 py-3 tracking-widest text-left">{t('ingredients.tableHeaderPrice')}</th>
                                    <th scope="col" className="px-3 py-3 tracking-widest text-center">{t('ingredients.tableHeaderActions')}</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13px] divide-y divide-gray-800/40">
                                {sortedIngredients.map(ing => {
                                    const catColors: Record<string, string> = {
                                        'Macro': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                                        'Micro': 'text-amber-400 bg-amber-500/10 border-amber-500/20',
                                        'Proteico': 'text-blue-400 bg-blue-500/10 border-blue-500/20',
                                        'Energético': 'text-red-400 bg-red-500/10 border-red-500/20'
                                    };
                                    const catStyle = catColors[ing.category] || 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';

                                    return (
                                        <tr 
                                            key={ing.id} 
                                            className="hover:bg-gray-800/40 transition-colors group cursor-pointer"
                                            onClick={() => setEditingIngredient(ing)}
                                        >
                                            <td className="px-3 py-3 font-mono text-gray-300 font-black text-[12px]">{ing.code}</td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-white text-[15px] group-hover:text-cyan-400 transition-colors">{ing.name}</span>
                                                    {ing.code && <span className="text-[10px] text-gray-100 font-black uppercase tracking-tighter">REF-ING-{ing.code}</span>}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-col gap-1">
                                                    <span className={`text-[10px] px-2 py-1 rounded border fit-content w-fit font-black uppercase tracking-widest ${catStyle}`}>
                                                        {ing.category || 'Macro'}
                                                    </span>
                                                    {ing.subcategory && (
                                                        <span className="text-[12px] text-white font-black ml-1 uppercase tracking-tighter">
                                                            {ing.subcategory}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-col">
                                                    <span className={`font-mono font-black text-lg ${(!ing.stock || ing.stock < 1000) ? 'text-red-400' : 'text-blue-300'}`}>
                                                        {ing.stock?.toLocaleString() || 0}
                                                    </span>
                                                    <div className="h-1.5 w-16 bg-gray-900 rounded-full mt-1 overflow-hidden">
                                                        <div className={`h-full ${(!ing.stock || ing.stock < 1000) ? 'bg-red-500 w-1/4' : 'bg-blue-500 w-3/4'}`}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-white text-lg font-black">${ing.price.toFixed(2)}</span>
                                                    <span className="text-[10px] text-gray-100 uppercase font-black">por kg</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-3 text-center">
                                                <div className="flex justify-center items-center gap-1">
                                                    <button onClick={() => setEditingIngredient(ing)} className="p-2.5 hover:bg-cyan-500/10 text-white hover:text-cyan-400 rounded-lg transition-all"><PencilIcon className="w-5 h-5"/></button>
                                                    <button onClick={() => handleDelete(ing.id)} className="p-2.5 hover:bg-red-500/10 text-white hover:text-red-400 rounded-lg transition-all"><TrashIcon className="w-5 h-5"/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="relative">
                            <table className="text-xs text-left text-gray-300 border-collapse">
                                <thead className="bg-gray-900 text-gray-400 sticky top-0 z-20 shadow-md">
                                    <tr>
                                        <th className="p-2 border border-gray-700 sticky left-0 bg-gray-900 z-30 min-w-[150px]">Ingrediente / Nutriente</th>
                                        <th className="p-2 border border-gray-700 text-center w-20">Precio</th>
                                        {sortedNutrients.map(n => (
                                            <th key={n.id} className="p-2 border border-gray-700 whitespace-nowrap text-center min-w-[80px]" title={n.name}>
                                                <div className="font-bold text-cyan-400 mb-1">{n.code}</div>
                                                <div className="truncate max-w-[100px]">{n.name}</div>
                                                <div className="text-[10px] text-gray-500">{n.unit}</div>
                                            </th>
                                        ))}
                                        <th className="p-2 border border-gray-700 text-center sticky right-0 bg-gray-900 z-30">Acción</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedIngredients.map(ing => (
                                        <tr key={ing.id} className="hover:bg-gray-700/40 cursor-pointer" onClick={() => setEditingIngredient(ing)}>
                                            <td className="p-2 border border-gray-700 font-medium sticky left-0 bg-gray-800 z-20 whitespace-nowrap">
                                                <span className="text-gray-500 font-mono text-[10px] mr-1">{ing.code}</span>
                                                {ing.name}
                                            </td>
                                            <td className="p-2 border border-gray-700 text-right bg-gray-800/30">{ing.price}</td>
                                            {sortedNutrients.map(n => (
                                                <td key={n.id} className="p-2 border border-gray-700 text-right">
                                                    {ing.nutrients[n.id] !== undefined ? ing.nutrients[n.id] : '-'}
                                                </td>
                                            ))}
                                            <td className="p-2 border border-gray-700 text-center sticky right-0 bg-gray-800 z-20">
                                                <button onClick={() => setEditingIngredient(ing)} className="text-cyan-400 hover:text-cyan-300"><PencilIcon className="w-3 h-3"/></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {editingIngredient && (
                    <EditIngredientModal 
                        ingredient={editingIngredient} 
                        nutrients={nutrients} 
                        onSave={handleSaveIngredient} 
                        onClose={() => setEditingIngredient(null)} 
                        availableMatrices={matrices}
                    />
            )}

            <BulkPriceEditorModal 
                isOpen={isPriceModalOpen}
                onClose={() => setIsPriceModalOpen(false)}
                ingredients={ingredients}
                currentOverrides={activeClientId ? workspaces[activeClientId]?.ingredientOverrides : {}}
                onSavePrices={(prices) => {
                    if (onUpdateIngredientPrice) onUpdateIngredientPrice(prices);
                }}
            />

        </div>
    );
};
