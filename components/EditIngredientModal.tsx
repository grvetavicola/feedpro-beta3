import React, { useState, useEffect } from 'react';
import { Ingredient, Nutrient } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { TrashIcon, PlusIcon } from './icons';

interface EditIngredientModalProps {
    ingredient: Ingredient;
    nutrients: Nutrient[];
    onSave: (updatedIngredient: Ingredient) => void;
    onClose: () => void;
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

export const EditIngredientModal: React.FC<EditIngredientModalProps> = ({ ingredient, nutrients, onSave, onClose }) => {
    const { t } = useTranslations();
    const [editedIngredient, setEditedIngredient] = useState<Ingredient>(ingredient);

    const handleCompositionChange = (nutrientId: string, value: string) => {
        const val = parseFloat(value) || 0;
        const newComposition = { ...editedIngredient.nutrients, [nutrientId]: val };
        setEditedIngredient({ ...editedIngredient, nutrients: newComposition });
    };

    const handleSave = () => {
        onSave(editedIngredient);
    };

    const sortedNutrients = [...nutrients].sort((a,b) => (a.code || 0) - (b.code || 0));

    return (
        <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in shadow-black/80">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col scale-100 transition-transform">
                <div className="p-4 border-b border-gray-600 bg-gray-900/40 rounded-t-2xl">
                    <h3 className="text-lg font-bold text-cyan-400">{t('common.edit')}: {ingredient.name}</h3>
                </div>
                <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                         <div className="col-span-2">
                            <label className="text-xs text-gray-400 block mb-1 uppercase font-bold tracking-tighter">{t('common.code')}</label>
                            <input
                                type="number"
                                value={editedIngredient.code}
                                onChange={(e) => setEditedIngredient({ ...editedIngredient, code: parseInt(e.target.value) || 0 })}
                                className="w-full bg-gray-700 text-sm rounded-md p-2 border border-gray-600 text-white font-mono"
                            />
                        </div>
                        <div className="col-span-12 md:col-span-4">
                            <label className="text-xs text-gray-400 block mb-1 uppercase font-bold tracking-tighter">{t('ingredients.commercialName')}</label>
                            <input
                                type="text"
                                value={editedIngredient.name}
                                onChange={(e) => setEditedIngredient({ ...editedIngredient, name: e.target.value })}
                                className="w-full bg-gray-700 text-sm rounded-md p-2 border border-gray-600 text-white font-bold"
                            />
                        </div>
                        <div className="col-span-3">
                            <label className="text-xs text-gray-400 block mb-1 uppercase font-bold tracking-tighter">{t('ingredients.mainCategory')}</label>
                            <select 
                                value={editedIngredient.category || 'Macro'}
                                onChange={(e) => setEditedIngredient({ ...editedIngredient, category: e.target.value })}
                                className="w-full bg-gray-700 text-xs rounded-md p-2 border border-gray-600 font-bold text-white shadow-inner"
                            >
                                <option value="Macro">Macro</option>
                                <option value="Micro">Micro</option>
                            </select>
                        </div>
                        <div className="col-span-3">
                             <label className="text-xs text-gray-400 block mb-1 uppercase font-bold tracking-tighter">{t('common.subcategory')}</label>
                            <select 
                                value={editedIngredient.subcategory || 'Energético'}
                                onChange={(e) => setEditedIngredient({ ...editedIngredient, subcategory: e.target.value })}
                                className="w-full bg-gray-700 text-xs rounded-md p-2 border border-gray-600 font-bold text-white shadow-inner"
                            >
                                <option value="Energético">Energético</option>
                                <option value="Proteico">Proteico</option>
                                <option value="Fibroso">Fibroso</option>
                                <option value="Mineral">Mineral</option>
                                <option value="Vitamínico">Vitamínico</option>
                                <option value="Aditivo">Aditivo</option>
                                <option value="Otros">Otros</option>
                            </select>
                        </div>
                        <div className="col-span-3">
                             <label className="text-xs text-blue-400 block mb-1 uppercase font-bold tracking-tighter">{t('common.price')} / kg</label>
                            <input
                                type="number"
                                step="0.001"
                                value={editedIngredient.price}
                                onChange={(e) => setEditedIngredient({ ...editedIngredient, price: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-blue-900/10 text-sm rounded-md p-2 border border-blue-500/50 text-blue-300 font-bold"
                            />
                        </div>
                        <div className="col-span-3">
                             <label className="text-xs text-emerald-400 block mb-1 uppercase font-bold tracking-tighter">{t('common.stock')} ({t('common.unit')})</label>
                            <input
                                type="number"
                                value={editedIngredient.stock || 0}
                                onChange={(e) => setEditedIngredient({ ...editedIngredient, stock: parseFloat(e.target.value) || 0 })}
                                className="w-full bg-emerald-900/10 text-sm rounded-md p-2 border border-emerald-500/50 text-emerald-300 font-bold"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-600 flex justify-between items-center">
                        <h4 className="font-bold text-gray-200 uppercase text-[12px] tracking-widest">{t('ingredients.compositionMatrix')}</h4>
                        <div className="flex items-center gap-2">
                            <select id="add_nut_select" className="bg-gray-700 text-xs text-white rounded p-1 outline-none border border-gray-600">
                                <option value="">{t('ingredients.addNutrient')}</option>
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
                            }} className="bg-cyan-600 hover:bg-cyan-500 text-white rounded p-1 shadow-lg shadow-cyan-900/40">
                                <PlusIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-2 text-[10px] text-gray-500 mb-1 font-black px-1 uppercase tracking-tighter">
                        <div className="col-span-6">{t('ingredients.referenceNutrient')}</div>
                        <div className="col-span-3 text-right text-cyan-500/80">{t('ingredients.standardVal')}</div>
                        <div className="col-span-3 text-right text-purple-500/80">{t('ingredients.laboratory')}</div>
                    </div>
                    
                    <div className="space-y-1.5">
                        {sortedNutrients.filter(n => editedIngredient.nutrients[n.id] !== undefined).map(n => (
                            <div key={n.id} className="grid grid-cols-12 gap-2 items-center bg-gray-900/40 p-2 rounded border border-gray-700/50 hover:bg-gray-900/60 transition-all group">
                                <div className="col-span-5 flex items-center">
                                    <span className="text-gray-600 text-[10px] mr-2 font-mono">{n.code}</span>
                                    <span className="text-xs text-gray-200 font-bold truncate">{n.name} <span className="text-[10px] text-gray-500 font-normal">({n.unit})</span></span>
                                </div>
                                <div className="col-span-1 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => {
                                        const newCompo = {...editedIngredient.nutrients};
                                        delete newCompo[n.id];
                                        const newDyn = {...(editedIngredient.dynamicNutrients || {})};
                                        delete newDyn[n.id];
                                        setEditedIngredient({...editedIngredient, nutrients: newCompo, dynamicNutrients: newDyn});
                                    }} className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10"><TrashIcon className="w-3.5 h-3.5"/></button>
                                </div>
                                <div className="col-span-3">
                                     <SmartInput
                                        value={editedIngredient.nutrients[n.id]}
                                        onChange={(v) => handleCompositionChange(n.id, v.toString())}
                                        className="w-full bg-gray-950 text-[13px] rounded p-1.5 border border-cyan-500/30 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 outline-none text-right font-mono font-bold text-cyan-400 transition-all"
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
                                        className="w-full bg-purple-950/20 text-[13px] rounded p-1.5 border border-purple-500/30 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 outline-none text-right font-mono font-bold text-purple-400 transition-all placeholder-purple-800/50"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 border-t border-gray-700 flex justify-end gap-3 bg-gray-900/20 rounded-b-2xl">
                    <button onClick={onClose} className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-2 px-6 rounded-xl transition-all border border-gray-600">{t('common.cancel')}</button>
                    <button onClick={handleSave} className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black uppercase tracking-widest text-[12px] py-2 px-8 rounded-xl shadow-lg transition-all transform hover:scale-[1.02]">{t('common.saveChanges')}</button>
                </div>
            </div>
        </div>
    );
};
