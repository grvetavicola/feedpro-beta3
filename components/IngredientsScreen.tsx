import React, { useState, useRef, useEffect } from 'react';
import { Ingredient, Nutrient } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { PencilIcon, TrashIcon, PlusIcon, UploadIcon, SaveIcon, XCircleIcon, SparklesIcon, FlaskIcon, MenuIcon } from './icons'; // Assuming MenuIcon or similar can represent list view, using icons available
import { parseIngredientsWithGemini } from '../services/geminiService';

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

// --- SMART INPUT FOR NUMBERS ---
const SmartInput = ({ value, onChange, placeholder, className, isMax = false }: { value: number, onChange: (v: number) => void, placeholder?: string, className?: string, isMax?: boolean }) => {
    const defaultVal = value === 0 || value === 999 ? '' : value.toString();
    const [localVal, setLocalVal] = useState<string>(defaultVal);

    useEffect(() => {
        if ((value === 0 || value === 999) && localVal === '') return;
        const parsed = parseFloat(localVal.replace(/,/g, '.'));
        if (parsed !== value && localVal !== value.toString() + '.' && localVal !== '0.' && localVal !== '-.') {
           setLocalVal(value === 0 || value === 999 ? '' : value.toString());
        }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/,/g, '.');
        val = val.replace(/[^0-9.]/g, ''); 
        if (val.startsWith('.')) val = '0' + val;
        const parts = val.split('.');
        if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
        setLocalVal(val);
        if (val === '' || val === '.') onChange(isMax ? 999 : 0);
        else onChange(parseFloat(val));
    };

    const handleBlur = () => {
        if (localVal.endsWith('.')) {
            const fixed = localVal.slice(0, -1);
            setLocalVal(fixed);
            onChange(parseFloat(fixed) || (isMax ? 999 : 0));
        }
        if (localVal === '') onChange(isMax ? 999 : 0);
    };

    return <input 
        type="text" 
        value={localVal} 
        onChange={handleChange} 
        onFocus={e => e.target.select()}
        onBlur={handleBlur}
        placeholder={placeholder} 
        className={`text-center font-mono ${className}`} 
    />;
};

// --- EDIT MODAL COMPONENT (unchanged logic, just keeping it here) ---
const EditIngredientModal: React.FC<{
    ingredient: Ingredient;
    nutrients: Nutrient[];
    onSave: (updatedIngredient: Ingredient) => void;
    onClose: () => void;
}> = ({ ingredient, nutrients, onSave, onClose }) => {
    const { t } = useTranslations();
    const [editedIngredient, setEditedIngredient] = useState<Ingredient>(ingredient);

    const handleCompositionChange = (nutrientId: string, value: string) => {
        const newComposition = { ...editedIngredient.nutrients, [nutrientId]: parseFloat(value) || 0 };
        setEditedIngredient({ ...editedIngredient, nutrients: newComposition });
    };

    const handleSave = () => {
        onSave(editedIngredient);
    };

    const sortedNutrients = [...nutrients].sort((a,b) => (a.code || 0) - (b.code || 0));

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b border-gray-600">
                    <h3 className="text-lg font-bold text-cyan-400">{t('ingredients.editModalTitle')}: {ingredient.name}</h3>
                </div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                         <div className="col-span-2">
                            <label className="text-xs text-gray-400 block mb-1">Cód</label>
                            <input
                                type="number"
                                value={editedIngredient.code}
                                onChange={(e) => setEditedIngredient({ ...editedIngredient, code: parseInt(e.target.value) || 0 })}
                                className="w-full bg-gray-700 text-sm rounded-md p-2 border border-gray-600"
                            />
                        </div>
                        <div className="col-span-4">
                            <label className="text-xs text-gray-400 block mb-1">Nombre</label>
                            <input
                                type="text"
                                value={editedIngredient.name}
                                onChange={(e) => setEditedIngredient({ ...editedIngredient, name: e.target.value })}
                                className="w-full bg-gray-700 text-sm rounded-md p-2 border border-gray-600"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs text-gray-400 block mb-1">Categoría</label>
                            <select 
                                value={editedIngredient.category || 'Macro'}
                                onChange={(e) => setEditedIngredient({ ...editedIngredient, category: e.target.value as 'Macro' | 'Micro' })}
                                className="w-full bg-gray-700 text-sm rounded-md p-2 border border-gray-600"
                            >
                                <option value="Macro">Macro</option>
                                <option value="Micro">Micro</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                             <label className="text-xs text-gray-400 block mb-1">Precio</label>
                            <input
                                type="number"
                                value={editedIngredient.price}
                                onChange={(e) => setEditedIngredient({ ...editedIngredient, price: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-gray-700 text-sm rounded-md p-2 border border-gray-600"
                            />
                        </div>
                        <div className="col-span-2">
                             <label className="text-xs text-gray-400 block mb-1 text-cyan-300">Stock (kg)</label>
                            <input
                                type="number"
                                value={editedIngredient.stock || 0}
                                onChange={(e) => setEditedIngredient({ ...editedIngredient, stock: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-gray-800 text-sm rounded-md p-2 border border-cyan-600"
                            />
                        </div>
                    </div>
                    <div className="pt-4 border-t border-gray-600 flex justify-between items-center">
                        <h4 className="font-semibold text-gray-200">{t('ingredients.nutritionalComposition')}</h4>
                        <div className="flex items-center gap-2">
                            <select id="add_nut_select" className="bg-gray-700 text-xs text-white rounded p-1 outline-none">
                                <option value="">+ Agregar Nutriente</option>
                                {sortedNutrients.filter(n => editedIngredient.nutrients[n.id] === undefined).map(n => (
                                    <option key={n.id} value={n.id}>{n.name} ({n.unit})</option>
                                ))}
                            </select>
                            <button onClick={() => {
                                const sel = document.getElementById('add_nut_select') as HTMLSelectElement;
                                if (sel && sel.value) {
                                    handleCompositionChange(sel.value, '0');
                                    sel.value = '';
                                }
                            }} className="bg-cyan-600 hover:bg-cyan-500 text-white rounded p-1">
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 mb-1 font-bold px-1">
                        <div className="col-span-6">Nutriente</div>
                        <div className="col-span-3 text-right text-cyan-400" title="Tabla de Referencia">Estándar</div>
                        <div className="col-span-3 text-right text-purple-400" title="Matriz Dinámica / Laboratorio">Laboratorio</div>
                    </div>
                    <div className="space-y-2">
                        {sortedNutrients.filter(n => editedIngredient.nutrients[n.id] !== undefined).map(n => (
                            <div key={n.id} className="grid grid-cols-12 gap-2 items-center bg-gray-700/20 p-2 rounded-lg border border-gray-700/50 hover:bg-gray-700/40 transition-colors group">
                                <div className="col-span-5 flex items-center">
                                    <span className="text-gray-600 text-[10px] mr-2 font-mono">{n.code}</span>
                                    <span className="text-sm text-gray-300 truncate">{n.name} <span className="text-[10px] text-gray-500">({n.unit})</span></span>
                                </div>
                                <div className="col-span-1 shrink-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => {
                                        const newCompo = {...editedIngredient.nutrients};
                                        delete newCompo[n.id];
                                        const newDyn = {...(editedIngredient.dynamicNutrients || {})};
                                        delete newDyn[n.id];
                                        setEditedIngredient({...editedIngredient, nutrients: newCompo, dynamicNutrients: newDyn});
                                    }} className="text-red-400 hover:text-red-300"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                                <div className="col-span-3">
                                     <SmartInput
                                        value={editedIngredient.nutrients[n.id]}
                                        onChange={(v) => handleCompositionChange(n.id, v.toString())}
                                        className="w-full bg-gray-900/50 text-[14px] rounded-lg p-2 border border-cyan-900/50 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 outline-none text-right font-mono font-bold text-cyan-300 transition-all placeholder-transparent"
                                      />
                                </div>
                                <div className="col-span-3">
                                      <SmartInput
                                        value={editedIngredient.dynamicNutrients?.[n.id] || 0}
                                        placeholder="--"
                                        onChange={(v) => {
                                            const newDyn = {...(editedIngredient.dynamicNutrients || {})};
                                            if (v === 0 && (document.activeElement as HTMLInputElement)?.value === '') { delete newDyn[n.id]; }
                                            else { newDyn[n.id] = v; }
                                            setEditedIngredient({...editedIngredient, dynamicNutrients: newDyn});
                                        }}
                                        className="w-full bg-purple-900/20 text-[14px] rounded-lg p-2 border border-purple-900/50 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none text-right font-mono font-bold text-purple-300 transition-all placeholder-purple-800/50"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t border-gray-600 flex justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">{t('common.cancel')}</button>
                    <button onClick={handleSave} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg">{t('common.save')}</button>
                </div>
            </div>
        </div>
    );
};

export const IngredientsScreen: React.FC<IngredientsScreenProps> = ({ ingredients, setIngredients, nutrients, setNutrients }) => {
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
                            Lista
                        </button>
                        <button 
                            onClick={() => setViewMode('matrix')}
                            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${viewMode === 'matrix' ? 'bg-cyan-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                        >
                            Matriz
                        </button>
                    </div>

                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-gray-700 hover:bg-gray-600 border border-gray-600 text-white font-medium py-1 px-3 rounded flex items-center gap-2 transition-colors text-[13px]"
                    >
                        <UploadIcon className="w-3 h-3" /> 
                        {isImporting ? "Analizando..." : t('ingredients.importButton')}
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
                            <thead className="text-[11px] text-cyan-300 uppercase bg-gray-700/50 sticky top-0 z-10">
                                <tr>
                                    <th scope="col" className="px-2 py-1.5">Cód</th>
                                    <th scope="col" className="px-2 py-1.5">{t('ingredients.tableHeaderName')}</th>
                                    <th scope="col" className="px-2 py-1.5">Cat.</th>
                                    <th scope="col" className="px-2 py-1.5">Stock (kg)</th>
                                    <th scope="col" className="px-2 py-1.5">{t('ingredients.tableHeaderPrice')}</th>
                                    <th scope="col" className="px-2 py-1.5 text-center">{t('ingredients.tableHeaderActions')}</th>
                                </tr>
                            </thead>
                            <tbody className="text-[13px]">
                                {sortedIngredients.map(ing => (
                                    <tr key={ing.id} className="border-b border-gray-700 hover:bg-gray-700/30 h-[32px]">
                                        <td className="px-2 py-1 font-mono text-gray-500">{ing.code}</td>
                                        <td className="px-2 py-1 font-medium whitespace-nowrap text-white">{ing.name}</td>
                                        <td className="px-2 py-1">
                                            <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded border ${ing.category === 'Macro' ? 'border-green-500/50 text-green-400' : 'border-purple-500/50 text-purple-400'}`}>
                                                {ing.category || 'Macro'}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1">
                                            <span className={`font-mono font-bold ${(!ing.stock || ing.stock < 1000) ? 'text-red-400' : 'text-blue-300'}`}>
                                                {ing.stock?.toLocaleString() || 0}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1 font-mono">{ing.price.toFixed(2)}</td>
                                        <td className="px-2 py-1 flex justify-center items-center gap-3">
                                            <button onClick={() => setEditingIngredient(ing)} className="text-cyan-400 hover:text-cyan-300"><PencilIcon className="w-4 h-4"/></button>
                                            <button onClick={() => handleDelete(ing.id)} className="text-red-400 hover:text-red-300"><TrashIcon className="w-4 h-4"/></button>
                                        </td>
                                    </tr>
                                ))}
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
                                        <tr key={ing.id} className="hover:bg-gray-700/40">
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
                                        <FlaskIcon className="w-5 h-5"/> New Nutrients Detected ({importPreview.newNutrients.length})
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
                                <h4 className="text-gray-300 font-semibold mb-2">Ingredients Preview ({importPreview.ingredients.length})</h4>
                                <table className="w-full text-sm text-left text-gray-300">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-900 sticky top-0">
                                        <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Price</th><th className="px-4 py-3">Nutrients</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {importPreview.ingredients.map((imp, idx) => (
                                            <tr key={idx} className="hover:bg-gray-700/30">
                                                <td className="px-4 py-3 font-medium text-white">{imp.name}</td>
                                                <td className="px-4 py-3">{imp.price || 0}</td>
                                                <td className="px-4 py-3 text-xs text-gray-400">{Object.keys(imp.nutrients).length} mapped</td>
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
