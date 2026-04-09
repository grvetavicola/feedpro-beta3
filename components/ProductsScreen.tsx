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
                                    <div className="flex justify-between items-center mb-2 border-b border-gray-700/50 pb-1">
                                        <h3 className="font-semibold text-[13px] text-gray-200 flex items-center gap-1.5"><FlaskIcon className="w-3 h-3 text-indigo-400"/> Requerimientos</h3>
                                        <div className="w-48"><SelectionModal title="Seleccionar Nutrientes" triggerLabel="+ Añadir Nutriente" options={nutrients.map(n => ({id: n.id, name: n.name, sub: n.unit, code: n.code}))} onAdd={addNutrients} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
                                        {currentProduct.constraints.map((c, idx) => {
                                            const nut = nutrients.find(n => n.id === c.nutrientId);
                                            return (
                                                <div key={idx} className="bg-gray-900/50 p-2 rounded border border-gray-700 group flex flex-col gap-1">
                                                    <div className="flex justify-between items-start">
                                                        <div className="truncate leading-tight"><div className="text-[11px] font-bold text-gray-100">{nut?.name}</div><div className="text-[9px] text-gray-500">{nut?.unit}</div></div>
                                                        <button onClick={() => handleUpdate(p => ({...p, constraints: p.constraints.filter((_, i) => i !== idx)}))} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100"><TrashIcon className="w-3 h-3"/></button>
                                                    </div>
                                                    <div className="flex gap-1.5">
                                                        <div className="flex-1 group/field"><label className="text-[8px] text-gray-500 uppercase font-semibold block mb-0.5">Mínimo</label><input type="number" value={c.min} onChange={e => handleUpdate(p => ({...p, constraints: p.constraints.map((x, i) => i === idx ? {...x, min: parseFloat(e.target.value) || 0} : x)}))} className="w-full bg-gray-800 border border-gray-600 rounded p-1 text-[11px] text-cyan-400 focus:border-cyan-500 outline-none text-right font-mono" /></div>
                                                        <div className="flex-1 group/field"><label className="text-[8px] text-gray-500 uppercase font-semibold block mb-0.5">Máximo</label><input type="number" value={c.max} onChange={e => handleUpdate(p => ({...p, constraints: p.constraints.map((x, i) => i === idx ? {...x, max: parseFloat(e.target.value) || 0} : x)}))} className="w-full bg-gray-800 border border-gray-600 rounded p-1 text-[11px] text-cyan-400 focus:border-cyan-500 outline-none text-right font-mono" /></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Segment: Ratios (V1 Feature) */}
                                <div>
                                    <div className="flex justify-between items-center mb-2 border-b border-gray-700/50 pb-1">
                                        <h3 className="font-semibold text-[13px] text-gray-200 flex items-center gap-1.5"><RatiosIcon className="w-3 h-3 text-yellow-400"/> Relaciones (Ratios)</h3>
                                        <button onClick={addRelationship} className="bg-yellow-900/30 text-yellow-400 border border-yellow-500/50 hover:bg-yellow-900/50 px-2 py-1 rounded text-[11px] font-bold transition-all">+ Añadir</button>
                                    </div>
                                    <div className="space-y-1.5">
                                        {currentProduct.relationships.length === 0 ? <p className="text-[11px] text-gray-600 italic">No se han definido relaciones.</p> : (
                                            currentProduct.relationships.map((rel, idx) => (
                                                <div key={rel.id} className="bg-gray-900/30 border border-gray-700 rounded p-2 flex flex-col md:flex-row items-center gap-2 group">
                                                    <div className="flex-1 flex items-center gap-2 min-w-0">
                                                        <input value={rel.name} onChange={e => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, name: e.target.value} : r)}))} className="bg-transparent border-b border-gray-700 text-[11px] font-bold text-yellow-400 focus:border-yellow-500 outline-none w-32" />
                                                        <div className="flex items-center gap-1 bg-gray-800 p-1 rounded border border-gray-700">
                                                            <select value={rel.nutrientAId} onChange={e => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, nutrientAId: e.target.value} : r)}))} className="bg-transparent text-[10px] text-gray-300 outline-none max-w-[100px]">
                                                                {nutrients.map(n => <option key={n.id} value={n.id} className="bg-gray-800">#{n.code} {n.name}</option>)}
                                                            </select>
                                                            <span className="text-gray-600 text-xs">÷</span>
                                                            <select value={rel.nutrientBId} onChange={e => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, nutrientBId: e.target.value} : r)}))} className="bg-transparent text-[10px] text-gray-300 outline-none max-w-[100px]">
                                                                {nutrients.map(n => <option key={n.id} value={n.id} className="bg-gray-800">#{n.code} {n.name}</option>)}
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-1"><span className="text-[9px] text-gray-500 uppercase font-bold">Min</span><input type="number" step="0.01" value={rel.min} onChange={e => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, min: parseFloat(e.target.value) || 0} : r)}))} className="w-12 bg-gray-800 border border-gray-700 rounded p-1 text-[11px] text-right text-yellow-500 font-mono focus:border-yellow-500 outline-none" /></div>
                                                        <div className="flex items-center gap-1"><span className="text-[9px] text-gray-500 uppercase font-bold">Max</span><input type="number" step="0.01" value={rel.max} onChange={e => handleUpdate(p => ({...p, relationships: p.relationships.map(r => r.id === rel.id ? {...r, max: parseFloat(e.target.value) || 0} : r)}))} className="w-12 bg-gray-800 border border-gray-700 rounded p-1 text-[11px] text-right text-yellow-500 font-mono focus:border-yellow-500 outline-none" /></div>
                                                        <button onClick={() => removeRelation(rel.id)} className="text-gray-600 hover:text-red-400 p-1"><TrashIcon className="w-3 h-3"/></button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Segment: Ingredients Inclusion */}
                                <div className="opacity-90">
                                    <div className="flex justify-between items-center mb-2 border-b border-gray-700/50 pb-1">
                                        <h3 className="font-semibold text-[13px] text-gray-200 flex items-center gap-1.5">< FlaskIcon className="w-3 h-3 text-green-400"/> Inclusión de Ingredientes</h3>
                                        <div className="w-48"><SelectionModal title="Seleccionar Ingredientes" triggerLabel="+ Inclusión" options={ingredients.map(i => ({id: i.id, name: i.name, sub: '$' + i.price, code: i.code}))} onAdd={addIngredients} /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                        {currentProduct.ingredientConstraints.map((ic, idx) => {
                                            const ing = ingredients.find(i => i.id === ic.ingredientId);
                                            return (
                                                <div key={idx} className="bg-gray-900/30 p-1.5 rounded border border-gray-700 flex flex-col gap-1 text-[11px] relative group">
                                                    <div className="flex justify-between"><div className="font-bold text-gray-400 truncate w-24">{ing?.name}</div><button onClick={() => handleUpdate(p => ({...p, ingredientConstraints: p.ingredientConstraints.filter((_, i) => i !== idx)}))} className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100"><XCircleIcon className="w-3 h-3"/></button></div>
                                                    <div className="flex gap-1.5">
                                                        <div className="flex-1"><label className="text-[8px] text-gray-500 block">MIN%</label><input type="number" value={ic.min} onChange={e => handleUpdate(p => ({...p, ingredientConstraints: p.ingredientConstraints.map((x, i) => i === idx ? {...x, min: parseFloat(e.target.value) || 0} : x)}))} className="w-full bg-gray-800 border border-gray-700 rounded p-1 text-green-400 font-mono text-right text-[11px]" /></div>
                                                        <div className="flex-1"><label className="text-[8px] text-gray-500 block">MAX%</label><input type="number" value={ic.max} onChange={e => handleUpdate(p => ({...p, ingredientConstraints: p.ingredientConstraints.map((x, i) => i === idx ? {...x, max: parseFloat(e.target.value) || 0} : x)}))} className="w-full bg-gray-800 border border-gray-700 rounded p-1 text-green-400 font-mono text-right text-[11px]" /></div>
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
