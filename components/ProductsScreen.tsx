import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Ingredient, Nutrient, ProductConstraint, Relationship, IngredientConstraint, NutritionalBase } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { PlusIcon, DuplicateIcon, TrashIcon, UploadIcon, SaveIcon, XCircleIcon, SparklesIcon, ChevronDownIcon, SearchIcon, FlaskIcon, RatiosIcon } from './icons';
import { parseRequirementsWithGemini } from '../services/geminiService';

interface ProductsScreenProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  ingredients: Ingredient[];
  nutrients: Nutrient[];
  bases?: NutritionalBase[];
  onOpenInNewWindow?: (data: any, name: string) => void;
  onNavigate: (view: any) => void;
  setIsDirty?: (dirty: boolean) => void;
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

// --- SELECTION MODAL ---
const SelectionModal = ({
    options,
    onAdd,
    title,
    triggerLabel,
    disabled = false
}: {
    options: { id: string; name: string; sub?: string; code?: number }[];
    onAdd: (ids: string[]) => void;
    title: string;
    triggerLabel: string;
    disabled?: boolean;
}) => {
    const { t } = useTranslations();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const filteredOptions = options.filter(opt => 
        opt.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (opt.code && opt.code.toString().includes(searchTerm))
    );

    const handleToggle = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleAdd = () => {
        onAdd(Array.from(selectedIds));
        setIsOpen(false);
        setSelectedIds(new Set());
    };

    if (!isOpen) return (
        <button onClick={() => !disabled && setIsOpen(true)} disabled={disabled} className="w-full bg-gray-800 border border-gray-700 hover:border-cyan-500 rounded-lg px-4 py-2 text-sm text-gray-300 flex justify-between items-center transition-all">
            <span>{triggerLabel}</span>
            <PlusIcon className="w-4 h-4 text-cyan-400" />
        </button>
    );

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white"><XCircleIcon /></button>
                </div>
                <div className="p-4 border-b border-gray-700">
                    <input 
                        type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        placeholder={t('common.search') + "..."} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none"
                    />
                </div>
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2 custom-scrollbar">
                    {filteredOptions.map(opt => (
                        <div key={opt.id} onClick={() => handleToggle(opt.id)} className={`p-2 rounded border cursor-pointer flex items-center gap-3 ${selectedIds.has(opt.id) ? 'bg-cyan-900/30 border-cyan-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}>
                            <div className={`w-4 h-4 rounded border ${selectedIds.has(opt.id) ? 'bg-cyan-500 border-cyan-500' : 'bg-gray-800'}`}></div>
                            <div className="flex-1 truncate"><div className="text-xs font-bold text-gray-200">{opt.name}</div><div className="text-[10px] text-gray-500">{opt.sub}</div></div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
                    <button onClick={() => setIsOpen(false)} className="text-sm text-gray-400 hover:text-white font-bold">{t('common.cancel')}</button>
                    <button onClick={handleAdd} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg text-sm transition-all transform hover:scale-105">{t('common.add')} ({selectedIds.size})</button>
                </div>
            </div>
        </div>
    );
};

export const ProductsScreen: React.FC<ProductsScreenProps> = ({ 
    products, 
    setProducts, 
    ingredients, 
    nutrients, 
    bases = [], 
    onOpenInNewWindow, 
    onNavigate,
    setIsDirty 
}) => {
    const { t } = useTranslations();
    const [selectedProductId, setSelectedProductId] = useState<string | null>(products[0]?.id || null);
    const [newProductName, setNewProductName] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set([products[0]?.category || t('common.uncategorized')]));
    
    const currentProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

    const handleUpdate = (updater: (p: Product) => Product) => {
        if (!selectedProductId) return;
        setProducts(prev => prev.map(p => p.id === selectedProductId ? updater(p) : p));
        setIsDirty?.(true);
    };

    const addNutrients = (ids: string[]) => {
        handleUpdate(p => {
            const newConstraints = [...p.constraints];
            ids.forEach(id => {
                if (!newConstraints.find(c => c.nutrientId === id)) newConstraints.push({ nutrientId: id, min: 0, max: 999 });
            });
            return { ...p, constraints: newConstraints };
        });
    };

    const addIngredients = (ids: string[]) => {
        handleUpdate(p => {
            const newConstraints = [...p.ingredientConstraints];
            ids.forEach(id => {
                if (!newConstraints.find(c => c.ingredientId === id)) newConstraints.push({ ingredientId: id, min: 0, max: 100 });
            });
            return { ...p, ingredientConstraints: newConstraints };
        });
    };

    const addRelationship = () => {
        handleUpdate(p => ({
            ...p,
            relationships: [
                ...p.relationships,
                { id: `rel_${Date.now()}`, name: t('products.newRelation'), nutrientAId: nutrients[0]?.id, nutrientBId: nutrients[1]?.id, min: 0, max: 999 }
            ]
        }));
    };

    const removeRelation = (id: string) => {
        handleUpdate(p => ({ ...p, relationships: p.relationships.filter(r => r.id !== id) }));
    };

    const applyBase = (base: NutritionalBase) => {
        if (!currentProduct) return;
        if (window.confirm(`${t('products.confirmApplyBase')} "${base.name}"?`)) {
            handleUpdate(p => ({
                ...p,
                constraints: [...base.constraints],
                relationships: [...base.relationships]
            }));
        }
    };

    return (
        <div className="p-3 space-y-3 h-full flex flex-col animate-fade-in w-full">
            <div className="relative bg-gradient-to-br from-cyan-900/40 to-indigo-900/40 rounded-xl p-4 border border-cyan-500/20 overflow-hidden shadow-md flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
                <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full -mr-12 -mt-12 blur-3xl opacity-30"></div>
                <div className="relative z-10 flex items-center gap-4 w-full md:w-auto">
                     <div className="bg-cyan-950/50 p-2.5 rounded-xl border border-cyan-800/50 backdrop-blur-sm shadow-inner shrink-0 hidden sm:flex items-center justify-center">
                         <img src="/icons/products.png" className="w-8 h-8 object-contain saturate-200 hue-rotate-15 contrast-125 brightness-125 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" alt="Icon Products" />
                     </div>
                     <div className="space-y-0.5 max-w-xl text-left w-full">
                        <div className="flex items-center gap-2 text-cyan-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                          <SparklesIcon className="w-3 h-3"/> Ingeniería Nutricional
                        </div>
                        <h1 className="text-xl md:text-2xl font-black text-white leading-tight uppercase tracking-tight">{t('products.profilesTitle')}</h1>
                        <p className="text-gray-400 font-bold text-[11px] md:text-[12px] leading-snug uppercase tracking-widest">{t('products.profilesSubtitle')}</p>
                     </div>
                </div>
                <div className="flex gap-2 relative z-10 w-full md:w-auto mt-2 md:mt-0 flex-wrap justify-end">
                    <input value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder={t('products.dietNamePlaceholder')} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[13px] text-white focus:border-cyan-500 outline-none w-40 font-bold"/>
                    <input id="new-product-category" placeholder={t('common.category') + "..."} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[13px] text-white focus:border-cyan-500 outline-none w-32 font-bold"/>
                    <button onClick={() => {
                        if (!newProductName) return;
                        const catInput = document.getElementById('new-product-category') as HTMLInputElement;
                        const newId = `p_${Date.now()}`;
                        setProducts([...products, { id: newId, clientId: 'default', code: products.length + 100, name: newProductName, category: catInput.value || undefined, constraints: [], relationships: [], ingredientConstraints: [] }]);
                        setSelectedProductId(newId);
                        setNewProductName('');
                        if (catInput) catInput.value = '';
                    }} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-1.5 rounded text-[13px] transition-all flex items-center justify-center gap-1 shadow-lg shadow-cyan-900/20">
                        <PlusIcon className="w-3 h-3"/> {t('common.create')}
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
                {/* List */}
                <div className="col-span-3 bg-gray-800/40 rounded border border-gray-700 flex flex-col overflow-hidden">
                    <div className="p-2 bg-gray-800 border-b border-gray-700 font-black text-[10px] uppercase tracking-widest text-gray-500 flex justify-between items-center px-3">
                        <span>{t('products.availableProducts')}</span>
                        <span className="bg-gray-900 border border-gray-700 px-1.5 py-0.5 rounded text-[9px] text-cyan-400">{products.length}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2 p-2 custom-scrollbar bg-gray-950/20">
                        {(() => {
                            const grouped = products.reduce((acc, p) => {
                                const cat = p.category || t('common.uncategorized');
                                if (!acc[cat]) acc[cat] = [];
                                acc[cat].push(p);
                                return acc;
                            }, {} as Record<string, Product[]>);

                            const categories = Object.keys(grouped).sort((a, b) => a === t('common.uncategorized') ? 1 : b === t('common.uncategorized') ? -1 : a.localeCompare(b));

                            return categories.map((cat, catIdx) => {
                                const isOpen = expandedCategories.has(cat);
                                const items = grouped[cat];
                                const catColors = [
                                    'border-emerald-500/30 bg-emerald-500/5 text-emerald-400',
                                    'border-cyan-500/30 bg-cyan-500/5 text-cyan-400',
                                    'border-blue-500/30 bg-blue-500/5 text-blue-400',
                                    'border-indigo-500/30 bg-indigo-500/5 text-indigo-400',
                                    'border-purple-500/30 bg-purple-500/5 text-purple-400'
                                ];
                                const colorClass = cat === t('common.uncategorized') ? 'border-gray-700 bg-gray-800/40 text-gray-400' : catColors[catIdx % catColors.length];

                                return (
                                    <div key={cat} className="space-y-1">
                                        <button 
                                            onClick={() => {
                                                const newSet = new Set(expandedCategories);
                                                if (newSet.has(cat)) newSet.delete(cat);
                                                else newSet.add(cat);
                                                setExpandedCategories(newSet);
                                            }}
                                            className={`w-full flex items-center justify-between p-2.5 rounded-xl border font-black text-[11px] uppercase tracking-wider transition-all shadow-sm ${colorClass} hover:brightness-125 active:scale-[0.98] outline-none`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${cat === t('common.uncategorized') ? 'bg-gray-600' : 'bg-current pulse'}`}></div>
                                                {cat}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="opacity-40 text-[9px]">{items.length}</span>
                                                <ChevronDownIcon className={`w-3 h-3 transition-transform duration-300 ${isOpen ? '' : '-rotate-90'}`} />
                                            </div>
                                        </button>

                                        {isOpen && (
                                            <div className="space-y-1 ml-1 pl-2 border-l border-gray-800/50 animate-fade-in-down">
                                                {items.map(p => (
                                                    <div 
                                                        key={p.id} 
                                                        onClick={() => setSelectedProductId(p.id)} 
                                                        className={`p-2.5 rounded-xl cursor-pointer transition-all group flex justify-between items-center border ${p.id === selectedProductId ? 'bg-cyan-500/10 border-cyan-500/50 shadow-lg shadow-cyan-900/10' : 'hover:bg-gray-800/60 border-transparent hover:border-gray-700'}`}
                                                    >
                                                        <div className="truncate flex-1">
                                                            <div className={`text-[13px] font-black leading-tight ${p.id === selectedProductId ? 'text-cyan-300' : 'text-gray-100'}`}>{p.name}</div>
                                                            <div className="flex items-center gap-2 mt-0.5">
                                                                <span className="text-[10px] text-gray-500 font-black font-mono tracking-tighter">REF-{p.code}</span>
                                                                {p.category && <span className="text-[9px] text-emerald-500/60 font-black uppercase tracking-tighter">CAT: {p.category}</span>}
                                                            </div>
                                                        </div>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setProducts(prev => prev.filter(x => x.id !== p.id)); }} 
                                                            className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/10 rounded-lg"
                                                            title={t('products.deleteDiet')}
                                                        >
                                                            <TrashIcon className="w-3.5 h-3.5"/>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                </div>

                {/* Editor */}
                <div className="col-span-9 bg-gray-800/40 rounded border border-gray-700 flex flex-col overflow-hidden">
                    {currentProduct ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-2 px-3 border-b border-gray-700 flex justify-between items-center bg-gray-900/20">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col">
                                        <label className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">{t('products.dietNameLabel')}</label>
                                        <input value={currentProduct.name} onChange={e => handleUpdate(p => ({...p, name: e.target.value}))} className="bg-transparent text-[16px] font-black text-white focus:outline-none focus:border-b border-cyan-500 w-64" />
                                    </div>
                                    <div className="h-8 w-px bg-gray-700 mx-2"></div>
                                    <div className="flex flex-col">
                                        <label className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest leading-none mb-1">{t('common.category')}</label>
                                        <input value={currentProduct.category || ''} placeholder={t('products.categoryHelp')} onChange={e => handleUpdate(p => ({...p, category: e.target.value}))} className="bg-transparent text-[14px] font-black text-emerald-400 focus:outline-none focus:border-b border-emerald-500 w-48" />
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {bases && bases.length > 0 && bases.map(b => (
                                        <button key={b.id} onClick={() => applyBase(b)} className="text-[10px] bg-purple-900/30 text-purple-400 border border-purple-500/30 px-2 py-1 rounded hover:bg-purple-900/50 transition-colors">Base: {b.name}</button>
                                    ))}
                                    {onOpenInNewWindow && (
                                        <button onClick={() => onNavigate('OPTIMIZATION')} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-1 rounded shadow text-[11px] uppercase flex items-center gap-1 transition-all">
                                            <SparklesIcon className="w-3 h-3 animate-pulse" /> Optimizar Dieta
                                        </button>
                                    )}
                                </div>
                            </div>
                            {/* Ratios Accordion */}
                            <div className="p-3 pb-0 shrink-0">
                                <details className="group bg-yellow-900/10 border border-yellow-500/20 rounded-xl overflow-hidden shadow-sm">
                                    <summary className="cursor-pointer px-4 py-3 hover:bg-yellow-900/20 transition-colors flex justify-between items-center outline-none list-none [&::-webkit-details-marker]:hidden">
                                        <h3 className="font-black text-[13px] text-yellow-400 flex items-center gap-2 uppercase tracking-wide">
                                            <RatiosIcon className="w-4 h-4"/> {t('products.ratiosTitle')}
                                        </h3>
                                        <ChevronDownIcon className="w-4 h-4 text-yellow-500 group-open:rotate-180 transition-transform duration-300" />
                                    </summary>
                                    <div className="p-3 bg-gray-900/40 border-t border-yellow-500/20">
                                        <div className="flex justify-end mb-3">
                                            <button onClick={addRelationship} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs transition-all shadow-lg shadow-yellow-900/20 flex items-center gap-2">+ {t('products.addRelation')}</button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[30vh] overflow-y-auto custom-scrollbar pr-2">
                                            {currentProduct.relationships.length === 0 ? <p className="text-[12px] text-gray-500 italic px-2">{t('products.noRelations')}</p> : (
                                                currentProduct.relationships.map((rel, idx) => (
                                                    <div key={rel.id} className="bg-gray-800 p-3 rounded-xl border border-gray-700 hover:border-yellow-500/50 flex flex-col items-center gap-3 group shadow-sm transition-colors">
                                                        <div className="w-full flex justify-between items-center border-b border-gray-700/50 pb-2">
                                                            <input value={rel.name} onChange={e => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, name: e.target.value} : r)}))} className="bg-transparent text-[13px] font-black text-yellow-400 focus:border-b border-yellow-500 outline-none w-32 truncate" />
                                                            <button onClick={() => removeRelation(rel.id)} className="text-gray-500 hover:text-red-400 bg-gray-900 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-3.5 h-3.5"/></button>
                                                        </div>
                                                        <div className="flex w-full gap-3">
                                                            <div className="flex-1 space-y-2">
                                                                <select value={rel.nutrientAId} onChange={e => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, nutrientAId: e.target.value} : r)}))} className="w-full bg-gray-900 text-[10px] font-bold text-gray-300 p-2 rounded-lg outline-none border border-gray-700 focus:border-yellow-500">
                                                                    {nutrients.map(n => <option key={n.id} value={n.id} className="bg-gray-800">#{n.code} {n.name}</option>)}
                                                                </select>
                                                                <div className="text-center text-gray-600 text-[10px] font-black">{t('products.dividedBy')} (÷)</div>
                                                                <select value={rel.nutrientBId} onChange={e => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, nutrientBId: e.target.value} : r)}))} className="w-full bg-gray-900 text-[10px] font-bold text-gray-300 p-2 rounded-lg outline-none border border-gray-700 focus:border-yellow-500">
                                                                    {nutrients.map(n => <option key={n.id} value={n.id} className="bg-gray-800">#{n.code} {n.name}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col gap-2 w-20 justify-center">
                                                                <div className="flex flex-col"><label className="text-[9px] text-gray-400 uppercase font-bold text-center mb-1">{t('common.min')}</label><SmartInput value={rel.min} onChange={v => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, min: v} : r)}))} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-[12px] text-yellow-500 focus:border-yellow-500 outline-none font-bold transition-all" /></div>
                                                                <div className="flex flex-col"><label className="text-[9px] text-gray-400 uppercase font-bold text-center mb-1">{t('common.max')}</label><SmartInput value={rel.max} isMax={true} onChange={v => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, max: v} : r)}))} className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-[12px] text-yellow-500 focus:border-yellow-500 outline-none font-bold transition-all" /></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </details>
                            </div>

                            {/* Parallel Columns Layout */}
                            <div className="flex-1 overflow-hidden p-3 flex gap-3 min-h-0">
                                {/* Left Column: Ingredients (60%) */}
                                <div className="w-[60%] flex flex-col bg-gray-800/40 rounded-xl border border-gray-700/80 shadow-inner overflow-hidden">
                                    <div className="flex justify-between items-center p-3 bg-green-900/20 border-b border-gray-700/80 shrink-0">
                                        <h3 className="font-black text-[14px] text-green-400 flex items-center gap-2 uppercase tracking-wide"><FlaskIcon className="w-4 h-4"/> {t('products.ingredientsInclusion')}</h3>
                                        <div className="w-48"><SelectionModal title={t('products.selectIngredients')} triggerLabel={"+ " + t('common.inclusion')} options={ingredients.map(i => ({id: i.id, name: i.name, sub: '$' + i.price, code: i.code}))} onAdd={addIngredients} /></div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                                        <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-3">
                                            {currentProduct.ingredientConstraints.map((ic, idx) => {
                                                const ing = ingredients.find(i => i.id === ic.ingredientId);
                                                return (
                                                    <div key={idx} className="bg-gray-800 p-3 rounded-xl border border-gray-700 hover:border-green-500/50 transition-colors group flex flex-col gap-2 shadow-sm">
                                                        <div className="flex justify-between items-start mb-1 border-b border-gray-700/50 pb-2">
                                                            <div className="text-[13px] font-black text-white truncate w-40" title={ing?.name}>{ing?.name}</div>
                                                            <button onClick={() => handleUpdate(p => ({...p, ingredientConstraints: p.ingredientConstraints.filter((_, i) => i !== idx)}))} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 p-1.5 rounded-lg"><TrashIcon className="w-3.5 h-3.5"/></button>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <div className="flex-1"><label className="text-[9px] text-gray-400 uppercase font-bold text-center block mb-1">{t('common.min')} %</label><SmartInput value={ic.min} onChange={v => handleUpdate(p => ({...p, ingredientConstraints: p.ingredientConstraints.map((x, i) => i === idx ? {...x, min: v} : x)}))} placeholder="0" className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-[14px] text-green-400 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none font-bold transition-all" /></div>
                                                            <div className="flex-1"><label className="text-[9px] text-gray-400 uppercase font-bold text-center block mb-1">{t('common.max')} %</label><SmartInput value={ic.max} isMax={true} onChange={v => handleUpdate(p => ({...p, ingredientConstraints: p.ingredientConstraints.map((x, i) => i === idx ? {...x, max: v} : x)}))} placeholder={t('common.max')} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-[14px] text-green-400 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none font-bold transition-all" /></div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Nutrients (40%) */}
                                <div className="w-[40%] flex flex-col bg-gray-800/40 rounded-xl border border-gray-700/80 shadow-inner overflow-hidden">
                                    <div className="flex justify-between items-center p-3 bg-indigo-900/20 border-b border-gray-700/80 shrink-0">
                                        <h3 className="font-black text-[14px] text-indigo-400 flex items-center gap-2 uppercase tracking-wide"><FlaskIcon className="w-4 h-4"/> {t('nav.nutrients')}</h3>
                                        <div className="w-48"><SelectionModal title={t('products.selectNutrients')} triggerLabel={"+ " + t('common.nutrient')} options={nutrients.map(n => ({id: n.id, name: n.name, sub: n.unit, code: n.code}))} onAdd={addNutrients} /></div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                                            {currentProduct.constraints.map((c, idx) => {
                                                const nut = nutrients.find(n => n.id === c.nutrientId);
                                                return (
                                                    <div key={idx} className="bg-gray-800 p-3 rounded-xl border border-gray-700 hover:border-indigo-500/50 transition-colors group flex flex-col gap-2 shadow-sm">
                                                        <div className="flex justify-between items-start mb-1 border-b border-gray-700/50 pb-2">
                                                            <div className="truncate leading-tight flex-1"><div className="text-[13px] font-black text-white px-0.5" title={nut?.name}>{nut?.name}</div><div className="text-[10px] uppercase font-bold text-gray-400 mt-0.5">{nut?.unit}</div></div>
                                                            <button onClick={() => handleUpdate(p => ({...p, constraints: p.constraints.filter((_, i) => i !== idx)}))} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 p-1.5 rounded-lg shrink-0"><TrashIcon className="w-3.5 h-3.5"/></button>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <div className="flex-1 group/field">
                                                                <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1 text-center">{t('common.min')}</label>
                                                                <SmartInput value={c.min} onChange={v => handleUpdate(p => ({...p, constraints: p.constraints.map((x, i) => i === idx ? {...x, min: v} : x)}))} placeholder="0" className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-[14px] text-indigo-300 focus:border-indigo-500 border focus:ring-1 focus:ring-indigo-500/50 outline-none font-bold transition-all" />
                                                            </div>
                                                            <div className="flex-1 group/field">
                                                                <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1 text-center">{t('common.max')}</label>
                                                                <SmartInput value={c.max} isMax={true} onChange={v => handleUpdate(p => ({...p, constraints: p.constraints.map((x, i) => i === idx ? {...x, max: v} : x)}))} placeholder={t('common.max')} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-[14px] text-indigo-300 focus:border-indigo-500 border focus:ring-1 focus:ring-indigo-500/50 outline-none font-bold transition-all" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 italic">{t('products.selectOrCreateProduct')}</div>
                    )}
                </div>
            </div>
        </div>
    );
};
