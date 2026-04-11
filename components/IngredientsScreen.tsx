import React, { useState, useRef, useEffect } from 'react';
import { Ingredient, Nutrient } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { PencilIcon, TrashIcon, PlusIcon, UploadIcon, SaveIcon, XCircleIcon, SparklesIcon, FlaskIcon, MenuIcon } from './icons'; 
import { parseIngredientsWithGemini } from '../services/geminiService';
import { EditIngredientModal } from './EditIngredientModal';

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

export const IngredientsScreen: React.FC<IngredientsScreenProps> = ({ ingredients, setIngredients, nutrients, setNutrients, setIsDirty }) => {
    const { t } = useTranslations();
    const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'matrix'>('list');
    
    // Import States
    const [isImporting, setIsImporting] = useState(false);
    const [importPreview, setImportPreview] = useState<{ingredients: ParsedIngredient[], newNutrients: ParsedNewNutrient[]} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
            nutrients: {}
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

    // --- IMPORT LOGIC (Same as before) ---
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsImporting(true);
        try {
            let inputData: { type: 'text' | 'file', data: string, mimeType?: string } | null = null;
            const fileName = file.name.toLowerCase();
            if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
               if (window.XLSX) {
                   const data = await file.arrayBuffer();
                   const workbook = window.XLSX.read(data);
                   const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                   const csvText = window.XLSX.utils.sheet_to_csv(firstSheet);
                   inputData = { type: 'text', data: csvText };
               } else { alert("Excel lib error"); setIsImporting(false); return; }
            } else if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve((reader.result as string).split(',')[1]);
                    reader.readAsDataURL(file);
                });
                inputData = { type: 'file', data: base64, mimeType: file.type };
            }
            if (inputData) {
                const parsed = await parseIngredientsWithGemini(inputData, nutrients);
                if (parsed.ingredients && parsed.ingredients.length > 0) {
                    setImportPreview(parsed);
                } else { alert(t('ingredients.importEmptyError')); }
            }
        } catch (error) { console.error(error); alert(t('products.importError')); } finally { setIsImporting(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
    };

    const confirmImport = () => {
        if (!importPreview) return;
        const { ingredients: parsedIngredients, newNutrients } = importPreview;
        const tempIdToRealIdMap: {[key: string]: string} = {};
        if (newNutrients.length > 0 && setNutrients) {
            const addedNutrients: Nutrient[] = [];
            let nextNutCode = nutrients.length > 0 ? Math.max(...nutrients.map(n => n.code || 0)) + 1 : 1;
            newNutrients.forEach(n => {
                const realId = `n${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                tempIdToRealIdMap[n.tempId] = realId;
                addedNutrients.push({ id: realId, code: nextNutCode++, name: n.name, unit: n.unit, group: 'Imported' });
            });
            setNutrients(prev => [...prev, ...addedNutrients]);
        }
        let nextIngCode = getNextCode();
        const newIngredients = parsedIngredients.map(imp => {
            const remappedComposition: {[key: string]: number} = {};
            Object.entries(imp.nutrients).forEach(([key, value]) => {
                const finalKey = tempIdToRealIdMap[key] || key;
                remappedComposition[finalKey] = value as number;
            });
            return {
                id: `i${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                code: nextIngCode++,
                name: imp.name,
                category: 'Macro',
                price: imp.price || 0,
                stock: 0,
                nutrients: remappedComposition
            } as Ingredient;
        });
        setIngredients(prev => [...prev, ...newIngredients]);
        setImportPreview(null);
    };

    // Sort for display
    const sortedIngredients = [...ingredients].sort((a,b) => (a.code || 0) - (b.code || 0));
    const sortedNutrients = [...nutrients].sort((a,b) => (a.code || 0) - (b.code || 0));
  
    return (
        <div className="p-3 space-y-3 flex flex-col h-full">
            <div className="flex flex-col md:flex-row justify-between items-center gap-2">
                <h2 className="text-lg font-bold text-white">{t('ingredients.title')}</h2>
                <div className="flex gap-2 items-center flex-wrap justify-end">
                    
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
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white font-medium py-1 px-3 rounded flex items-center gap-2 transition-colors text-[13px]"
                    >
                        <UploadIcon className="w-3 h-3" /> 
                        {isImporting ? t('common.analyzing') : t('ingredients.importButton')}
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.csv,.pdf,image/*" onChange={handleFileSelect} disabled={isImporting} />
                    <button onClick={handleAddNew} className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold py-1 px-3 rounded flex items-center gap-2 text-[13px]">
                        <PlusIcon className="w-3 h-3" /> {t('ingredients.addButton')}
                    </button>
                </div>
            </div>
            
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
                />
            )}

            {/* IMPORT REVIEW MODAL (Unchanged) */}
            {importPreview && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 rounded-2xl border border-gray-600 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        {/* ... Modal content same as before ... */}
                        <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-800 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <SparklesIcon className="text-cyan-400 w-6 h-6" />
                                <h3 className="text-xl font-bold text-white">{t('ingredients.importReviewTitle')}</h3>
                            </div>
                            <button onClick={() => setImportPreview(null)} className="text-gray-400 hover:text-white">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {importPreview.newNutrients && importPreview.newNutrients.length > 0 && (
                                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                                    <h4 className="text-yellow-400 font-bold mb-3 flex items-center gap-2">
                                        <FlaskIcon className="w-5 h-5"/> {t('ingredients.newNutrientsDetected')} ({importPreview.newNutrients.length})
                                    </h4>
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {importPreview.newNutrients.map((nut, idx) => (
                                            <div key={idx} className="bg-gray-900 p-2 rounded text-xs text-gray-300 border border-gray-700">
                                                <div className="font-semibold text-white">{nut.name}</div>
                                                <div className="text-gray-500">{nut.unit}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <h4 className="text-gray-300 font-semibold mb-2">{t('ingredients.ingredientsPreview')} ({importPreview.ingredients.length})</h4>
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-900 sticky top-0">
                                        <tr><th className="px-4 py-3">{t('common.name')}</th><th className="px-4 py-3">{t('common.price')}</th><th className="px-4 py-3">{t('nav.nutrients')}</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {importPreview.ingredients.map((imp, idx) => (
                                            <tr key={idx} className="hover:bg-gray-700/30">
                                                <td className="px-4 py-3 font-medium text-white">{imp.name}</td>
                                                <td className="px-4 py-3">{imp.price || 0}</td>
                                                <td className="px-4 py-3 text-xs text-gray-400">{Object.keys(imp.nutrients).length} {t('ingredients.mapped')}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="p-5 border-t border-gray-700 bg-gray-800 rounded-b-2xl flex justify-end gap-3">
                            <button onClick={() => setImportPreview(null)} className="px-5 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">{t('common.cancel')}</button>
                            <button onClick={confirmImport} className="px-5 py-2 text-sm font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-lg shadow-cyan-900/20 transition-all transform hover:scale-105 flex items-center gap-2"><SaveIcon className="w-4 h-4" />{t('ingredients.confirmImportButton')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
