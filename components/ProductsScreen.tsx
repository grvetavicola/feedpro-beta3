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
                        placeholder="Buscar..." className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white focus:border-cyan-500 outline-none"
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
                    <button onClick={() => setIsOpen(false)} className="text-sm text-gray-400 hover:text-white font-bold">Cancelar</button>
                    <button onClick={handleAdd} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-6 rounded-lg text-sm transition-all transform hover:scale-105">Añadir ({selectedIds.size})</button>
                </div>
            </div>
        </div>
    );
};

export const ProductsScreen: React.FC<ProductsScreenProps> = ({ products, setProducts, ingredients, nutrients, bases = [], onOpenInNewWindow }) => {
    const { t } = useTranslations();
    const [selectedProductId, setSelectedProductId] = useState<string | null>(products[0]?.id || null);
    const [newProductName, setNewProductName] = useState('');
    
    const currentProduct = useMemo(() => products.find(p => p.id === selectedProductId), [products, selectedProductId]);

    const handleUpdate = (updater: (p: Product) => Product) => {
        if (!selectedProductId) return;
        setProducts(prev => prev.map(p => p.id === selectedProductId ? updater(p) : p));
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
                { id: `rel_${Date.now()}`, name: 'Nueva Relación', nutrientAId: nutrients[0]?.id, nutrientBId: nutrients[1]?.id, min: 0, max: 999 }
            ]
        }));
    };

    const removeRelation = (id: string) => {
        handleUpdate(p => ({ ...p, relationships: p.relationships.filter(r => r.id !== id) }));
    };

    const applyBase = (base: NutritionalBase) => {
        if (!currentProduct) return;
        if (window.confirm(`¿Desea aplicar la base "${base.name}"? Esto sobrescribirá las restricciones actuales.`)) {
            handleUpdate(p => ({
                ...p,
                constraints: [...base.constraints],
                relationships: [...base.relationships]
            }));
        }
    };

    return (
        <div className="p-3 space-y-3 h-full flex flex-col">
            <div className="flex justify-between items-center bg-gray-800/40 p-2 rounded border border-gray-700">
                <div className="flex items-center gap-3">
                    <FlaskIcon className="text-cyan-400 w-5 h-5 ml-1" />
                    <div>
                        <h2 className="text-[15px] font-bold text-white leading-tight">Perfiles Nutricionales</h2>
                        <p className="text-[11px] text-gray-500 leading-tight">Configuración de requerimientos</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <input value={newProductName} onChange={e => setNewProductName(e.target.value)} placeholder="Nombre..." className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[13px] text-white focus:border-cyan-500 outline-none w-48"/>
                    <button onClick={() => {
                        if (!newProductName) return;
                        const newId = `p_${Date.now()}`;
                        setProducts([...products, { id: newId, clientId: 'default', code: products.length + 100, name: newProductName, constraints: [], relationships: [], ingredientConstraints: [] }]);
                        setSelectedProductId(newId);
                        setNewProductName('');
                    }} className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold px-3 py-1 rounded text-[13px] transition-all flex items-center gap-1">
                        <PlusIcon className="w-3 h-3"/> Crear
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-3 min-h-0">
                {/* List */}
                <div className="col-span-3 bg-gray-800/40 rounded border border-gray-700 flex flex-col overflow-hidden">
                    <div className="p-2 bg-gray-800 border-b border-gray-700 font-bold text-[10px] uppercase tracking-wider text-gray-400">Productos Disponibles</div>
                    <div className="flex-1 overflow-y-auto space-y-0.5 p-1 custom-scrollbar">
                        {products.map(p => (
                            <div key={p.id} onClick={() => setSelectedProductId(p.id)} className={`p-2 rounded cursor-pointer transition-colors group flex justify-between items-center ${p.id === selectedProductId ? 'bg-cyan-900/30 border border-cyan-500/50' : 'hover:bg-gray-700/50 border border-transparent'}`}>
                                <div className="truncate"><div className={`text-[13px] font-bold ${p.id === selectedProductId ? 'text-cyan-300' : 'text-gray-300'}`}>{p.name}</div><div className="text-[10px] text-gray-500 font-mono leading-none\">#{p.code}</div></div>
                                <button onClick={(e) => { e.stopPropagation(); setProducts(prev => prev.filter(x => x.id !== p.id)); }} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100"><TrashIcon className="w-3 h-3"/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Editor */}
                <div className="col-span-9 bg-gray-800/40 rounded border border-gray-700 flex flex-col overflow-hidden">
                    {currentProduct ? (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="p-2 px-3 border-b border-gray-700 flex justify-between items-center bg-gray-900/20">
                                <div className="flex items-center gap-3"><input value={currentProduct.name} onChange={e => handleUpdate(p => ({...p, name: e.target.value}))} className="bg-transparent text-[15px] font-bold text-cyan-400 focus:outline-none focus:border-b border-cyan-500 w-64" /></div>
                                <div className="flex gap-2">
                                    {bases && bases.length > 0 && bases.map(b => (
                                        <button key={b.id} onClick={() => applyBase(b)} className="text-[10px] bg-purple-900/30 text-purple-400 border border-purple-500/30 px-2 py-1 rounded hover:bg-purple-900/50 transition-colors">Base: {b.name}</button>
                                    ))}
                                    {onOpenInNewWindow && (
                                        <button onClick={() => onOpenInNewWindow(null, `Optimizar: ${currentProduct.name}`)} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-1 rounded shadow text-[11px] uppercase flex items-center gap-1 transition-all">
                                            <SparklesIcon className="w-3 h-3 animate-pulse" /> Optimizar
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                                
                                {/* Segment: Nutrients */}
                                <div>
                                    <div className="flex justify-between items-center mb-3 bg-indigo-900/40 p-3 rounded-xl border border-indigo-500/30 shadow-md">
                                        <h3 className="font-black text-[15px] text-indigo-300 flex items-center gap-2 uppercase tracking-wide"><FlaskIcon className="w-5 h-5 text-indigo-400"/> Requerimientos Nutricionales</h3>
                                        <div className="w-56"><SelectionModal title="Seleccionar Nutrientes" triggerLabel="+ Añadir Nutriente" options={nutrients.map(n => ({id: n.id, name: n.name, sub: n.unit, code: n.code}))} onAdd={addNutrients} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {currentProduct.constraints.map((c, idx) => {
                                            const nut = nutrients.find(n => n.id === c.nutrientId);
                                            return (
                                                <div key={idx} className="bg-gray-800 p-3 rounded-xl border border-gray-700 hover:border-indigo-500/50 transition-colors group flex flex-col gap-2 shadow-sm">
                                                    <div className="flex justify-between items-start mb-1 border-b border-gray-700/50 pb-2">
                                                        <div className="truncate leading-tight"><div className="text-[13px] font-black text-white">{nut?.name}</div><div className="text-[10px] uppercase font-bold text-gray-400 mt-0.5">{nut?.unit}</div></div>
                                                        <button onClick={() => handleUpdate(p => ({...p, constraints: p.constraints.filter((_, i) => i !== idx)}))} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 p-1.5 rounded-lg"><TrashIcon className="w-3.5 h-3.5"/></button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1 group/field">
                                                            <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1 text-center">Mínimo</label>
                                                            <SmartInput value={c.min} onChange={v => handleUpdate(p => ({...p, constraints: p.constraints.map((x, i) => i === idx ? {...x, min: v} : x)}))} placeholder="0" className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-[14px] text-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none font-bold transition-all" />
                                                        </div>
                                                        <div className="flex-1 group/field">
                                                            <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1 text-center">Máximo</label>
                                                            <SmartInput value={c.max} isMax={true} onChange={v => handleUpdate(p => ({...p, constraints: p.constraints.map((x, i) => i === idx ? {...x, max: v} : x)}))} placeholder="Máx" className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-[14px] text-indigo-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none font-bold transition-all" />
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Segment: Ratios (V1 Feature) */}
                                <div>
                                    <div className="flex justify-between items-center mb-3 bg-yellow-900/40 p-3 rounded-xl border border-yellow-500/30 shadow-md">
                                        <h3 className="font-black text-[15px] text-yellow-300 flex items-center gap-2 uppercase tracking-wide"><RatiosIcon className="w-5 h-5 text-yellow-400"/> Relaciones (Ratios)</h3>
                                        <button onClick={addRelationship} className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-lg shadow-yellow-900/20 flex items-center gap-2">+ Añadir</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {currentProduct.relationships.length === 0 ? <p className="text-[12px] text-gray-500 italic p-2">No se han definido relaciones.</p> : (
                                            currentProduct.relationships.map((rel, idx) => (
                                                <div key={rel.id} className="bg-gray-800 p-3 rounded-xl border border-gray-700 hover:border-yellow-500/50 flex flex-col items-center gap-3 group shadow-sm transition-colors">
                                                    <div className="w-full flex justify-between items-center border-b border-gray-700/50 pb-2">
                                                        <input value={rel.name} onChange={e => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, name: e.target.value} : r)}))} className="bg-transparent text-[13px] font-black text-yellow-400 focus:border-b border-yellow-500 outline-none w-48" />
                                                        <button onClick={() => removeRelation(rel.id)} className="text-gray-500 hover:text-red-400 bg-gray-900 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-3.5 h-3.5"/></button>
                                                    </div>
                                                    <div className="flex w-full gap-3">
                                                        <div className="flex-1 space-y-2">
                                                            <select value={rel.nutrientAId} onChange={e => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, nutrientAId: e.target.value} : r)}))} className="w-full bg-gray-900 text-[11px] font-bold text-gray-300 p-2 rounded-lg outline-none border border-gray-700 focus:border-yellow-500">
                                                                {nutrients.map(n => <option key={n.id} value={n.id} className="bg-gray-800">#{n.code} {n.name}</option>)}
                                                            </select>
                                                            <div className="text-center text-gray-600 text-xs font-black">DIVIDIDO POR (÷)</div>
                                                            <select value={rel.nutrientBId} onChange={e => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, nutrientBId: e.target.value} : r)}))} className="w-full bg-gray-900 text-[11px] font-bold text-gray-300 p-2 rounded-lg outline-none border border-gray-700 focus:border-yellow-500">
                                                                {nutrients.map(n => <option key={n.id} value={n.id} className="bg-gray-800">#{n.code} {n.name}</option>)}
                                                            </select>
                                                        </div>
                                                        <div className="flex flex-col gap-2 w-28 justify-center">
                                                            <div className="flex flex-col"><label className="text-[9px] text-gray-400 uppercase font-bold text-center mb-1">Min</label><SmartInput value={rel.min} onChange={v => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, min: v} : r)}))} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-[14px] text-yellow-500 focus:border-yellow-500 outline-none font-bold transition-all" /></div>
                                                            <div className="flex flex-col"><label className="text-[9px] text-gray-400 uppercase font-bold text-center mb-1">Max</label><SmartInput value={rel.max} isMax={true} onChange={v => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, max: v} : r)}))} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-[14px] text-yellow-500 focus:border-yellow-500 outline-none font-bold transition-all" /></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Segment: Ingredients Inclusion */}
                                <div className="opacity-90">
                                    <div className="flex justify-between items-center mb-3 bg-green-900/40 p-3 rounded-xl border border-green-500/30 shadow-md">
                                        <h3 className="font-black text-[15px] text-green-300 flex items-center gap-2 uppercase tracking-wide"><FlaskIcon className="w-5 h-5 text-green-400"/> Inclusión de Ingredientes</h3>
                                        <div className="w-56"><SelectionModal title="Seleccionar Ingredientes" triggerLabel="+ Inclusión" options={ingredients.map(i => ({id: i.id, name: i.name, sub: '$' + i.price, code: i.code}))} onAdd={addIngredients} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
                                        {currentProduct.ingredientConstraints.map((ic, idx) => {
                                            const ing = ingredients.find(i => i.id === ic.ingredientId);
                                            return (
                                                <div key={idx} className="bg-gray-800 p-3 rounded-xl border border-gray-700 hover:border-green-500/50 transition-colors group flex flex-col gap-2 shadow-sm">
                                                    <div className="flex justify-between items-start mb-1 border-b border-gray-700/50 pb-2">
                                                        <div className="text-[13px] font-black text-white truncate w-40" title={ing?.name}>{ing?.name}</div>
                                                        <button onClick={() => handleUpdate(p => ({...p, ingredientConstraints: p.ingredientConstraints.filter((_, i) => i !== idx)}))} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 p-1.5 rounded-lg"><TrashIcon className="w-3.5 h-3.5"/></button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <div className="flex-1"><label className="text-[9px] text-gray-400 uppercase font-bold text-center block mb-1">Mín %</label><SmartInput value={ic.min} onChange={v => handleUpdate(p => ({...p, ingredientConstraints: p.ingredientConstraints.map((x, i) => i === idx ? {...x, min: v} : x)}))} placeholder="0" className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-[14px] text-green-400 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none font-bold transition-all" /></div>
                                                        <div className="flex-1"><label className="text-[9px] text-gray-400 uppercase font-bold text-center block mb-1">Máx %</label><SmartInput value={ic.max} isMax={true} onChange={v => handleUpdate(p => ({...p, ingredientConstraints: p.ingredientConstraints.map((x, i) => i === idx ? {...x, max: v} : x)}))} placeholder="Máx" className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-[14px] text-green-400 focus:border-green-500 focus:ring-1 focus:ring-green-500/50 outline-none font-bold transition-all" /></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500 italic">Seleccione o cree un producto para comenzar.</div>
                    )}
                </div>
            </div>
        </div>
    );
};
