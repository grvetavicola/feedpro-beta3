import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Ingredient, Nutrient, ProductConstraint, Relationship, IngredientConstraint, NutritionalBase } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { SparklesIcon, SaveIcon, DuplicateIcon, UploadIcon, SearchIcon, XCircleIcon, TrashIcon, FlaskIcon, PlusIcon, ChevronDownIcon, ChevronRightIcon, ChevronDoubleRightIcon, RatiosIcon, ExclamationIcon, NutrientsIcon, IngredientsIcon } from './icons';
import { parseRequirementsWithGemini } from '../services/geminiService';

interface ProductsScreenProps {
  products: Product[];
  setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
  ingredients: Ingredient[];
  setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
  nutrients: Nutrient[];
  bases?: NutritionalBase[];
  setBases?: React.Dispatch<React.SetStateAction<NutritionalBase[]>>;
  onOpenInNewWindow?: (data: any, name: string) => void;
  onNavigate: (view: any) => void;
  onSelectDiets?: (ids: string[]) => void;
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
    triggerClassName,
    disabled = false
}: {
    options: { id: string; name: string; sub?: string; code?: number }[];
    onAdd: (ids: string[]) => void;
    title: string;
    triggerLabel: string;
    triggerClassName?: string;
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
        <button 
            onClick={() => !disabled && setIsOpen(true)} 
            disabled={disabled} 
            className={triggerClassName || "w-full bg-gray-800 border border-gray-700 hover:border-cyan-500 rounded-lg px-4 py-2 text-sm text-gray-300 flex justify-between items-center transition-all"}
        >
            <span className="font-black uppercase tracking-widest">{triggerLabel}</span>
            <PlusIcon className="w-4 h-4" />
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
    setIngredients,
    nutrients, 
    bases = [], 
    setBases,
    onOpenInNewWindow, 
    onNavigate,
    onSelectDiets,
    setIsDirty 
}) => {
    const { t } = useTranslations();
    const [selectedProductId, setSelectedProductId] = useState<string | null>(products[0]?.id || null);
    const [newProductName, setNewProductName] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
    // Homologation State
    const [isHomologating, setIsHomologating] = useState(false);
    const [unmappedNutrients, setUnmappedNutrients] = useState<string[]>([]);
    const [unmappedIngredients, setUnmappedIngredients] = useState<string[]>([]);
    const [homologationMappings, setHomologationMappings] = useState<Record<string, string>>({});
    const [pendingExcelData, setPendingExcelData] = useState<{ dietNames: string[], nutrientRows: any[], ingredientRows: any[] } | null>(null);

    const getBestMatch = (source: string, candidates: {id: string, name: string}[], threshold = 0.3) => {
        const normSource = source.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        let bestId: string | undefined;
        let bestScore = 0;

        candidates.forEach(c => {
            const normTarget = c.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
            let score = 0;
            if (normSource === normTarget) score = 1;
            else if (normSource.includes(normTarget) || normTarget.includes(normSource)) score = 0.8;
            else {
                const w1 = normSource.split(/\s+/);
                const w2 = normTarget.split(/\s+/);
                const intersection = w1.filter(w => w.length > 2 && w2.includes(w));
                score = (intersection.length * 2) / (w1.length + w2.length);
            }
            if (score > bestScore) {
                bestScore = score;
                bestId = c.id;
            }
        });

        return bestScore >= threshold ? bestId : undefined;
    };

    const [showBasesModal, setShowBasesModal] = useState(false);
    const excelBasesInputRef = useRef<HTMLInputElement>(null);
    
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
                relationships: [...base.relationships],
                ingredientConstraints: base.ingredientConstraints ? [...base.ingredientConstraints] : []
            }));
            alert(`✓ Base "${base.name}" aplicada correctamente a ${currentProduct?.name}.`);
        }
    };

    const handleSaveAsBase = (manualName?: string) => {
        if (!currentProduct || !setBases) return;
        const baseName = typeof manualName === 'string' ? manualName : window.prompt(t('products.baseNamePrompt') || 'Nombre de la Base:', currentProduct.name);
        if (!baseName) return;

        const newBase: NutritionalBase = {
            id: `base_${Date.now()}`,
            name: baseName,
            description: `Generada desde ${currentProduct.name}`,
            constraints: [...currentProduct.constraints],
            relationships: [...currentProduct.relationships],
            ingredientConstraints: [...currentProduct.ingredientConstraints]
        };

        setBases(prev => [...prev, newBase]);
        setIsDirty?.(true);
        // Toast style notification instead of alert if possible, but alert is fine for now
        alert(`✓ ${t('products.baseSavedSuccess') || 'Base guardada exitosamente'}: ${baseName}`);
    };

    const NUTRIENT_SYNONYMS: Record<string, string[]> = {
        'n100010': ['HUMEDAD', 'HUM', 'H'],
        'n100015': ['MATERIA SECA', 'MS', 'DRY MATTER', 'DM'],
        'n500010': ['PROTEINA BRUTA', 'PB', 'CRUDE PROTEIN', 'CP BRUTA'],
        'n500015': ['PROTEINA CRUDA', 'PC', 'CP', 'PROTEINA'],
        'n200020': ['EM AVES', 'EMA', 'ME', 'ENERGIA METABOLIZABLE', 'ENERGIA MET.'],
        'n541010': ['CALCIO', 'CA'],
        'n541020': ['FOSFORO TOTAL', 'PT', 'PHOS TOTAL'],
        'n541050': ['FOSFORO DISP', 'PD', 'PHOS DISP', 'AVP', 'P DISP'],
        'n510010': ['LYS TOTAL', 'LISINA TOTAL', 'LYST'],
        'n521010': ['LYS DIG', 'LISINA DIG', 'LYSD'],
        'n300100': ['GRASA', 'EE', 'FAT', 'EXTRACTO ETEREO'],
        'n400100': ['FIBRA BRUTA', 'FB', 'CRUDE FIBER', 'CF'],
        'n551020': ['SODIO', 'NA'],
        'n551030': ['CLORO', 'CL'],
        'n510060': ['M+C TOTAL', 'MET+CIST TOTAL', 'MET+CYS'],
        'n510040': ['MET TOTAL', 'M T']
    };

    const handleImportBasesExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !(window as any).XLSX || !setBases) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const bstr = event.target?.result;
                const XLSX = (window as any).XLSX;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                if (data.length < 5) return;

                // 1. Identificar Columnas de Dieta (C en adelante => idx 2+)
                const dietNames: string[] = [];
                const firstRow = data[0] || [];
                const secondRow = data[1] || [];
                
                // Buscar nombres de dietas en las primeras filas
                for (let j = 2; j < firstRow.length; j++) {
                    const name = String(firstRow[j] || secondRow[j] || '').trim();
                    if (name && name !== 'DIETAS') dietNames.push(name);
                }

                if (dietNames.length === 0) {
                    alert("No se detectaron nombres de dietas en el encabezado (Columnas C en adelante).");
                    return;
                }

                // 2. Mapear Filas
                const ingredientRows: { name: string, values: any[] }[] = [];
                const nutrientRows: { name: string, unit?: string, values: any[] }[] = [];
                
                let section: 'INSUMOS' | 'NUTRIENTES' | null = null;
                
                data.forEach(row => {
                    const firstCell = String(row[0] || '').trim().toUpperCase();
                    if (firstCell === 'INSUMOS') { section = 'INSUMOS'; return; }
                    if (firstCell === 'NUTRIENTES') { section = 'NUTRIENTES'; return; }
                    
                    if (!section || !row[0]) return;
                    
                    const name = String(row[0]).trim();
                    const values = row.slice(2); // Valores desde C en adelante
                    
                    if (section === 'INSUMOS') {
                        ingredientRows.push({ name, values });
                    } else {
                        nutrientRows.push({ name, unit: String(row[1] || '').trim(), values });
                    }
                });

                const rawNutrientRows = nutrientRows;
                const rawIngredientRows = ingredientRows;

                // 3. Verificar Homologación
                const missingNuts = new Set<string>();
                rawNutrientRows.forEach(nr => {
                    const normName = nr.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                    const found = nutrients.find(n => {
                        const sysName = n.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                        if (sysName === normName) return true;
                        const synonyms = NUTRIENT_SYNONYMS[n.id] || [];
                        return synonyms.some(s => s === normName);
                    });
                    if (!found) missingNuts.add(nr.name);
                });

                const missingIngs = new Set<string>();
                rawIngredientRows.forEach(ir => {
                    const normName = ir.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                    const found = ingredients.find(i => i.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === normName);
                    if (!found) missingIngs.add(ir.name);
                });

                if (missingNuts.size > 0 || missingIngs.size > 0) {
                    setUnmappedNutrients(Array.from(missingNuts));
                    setUnmappedIngredients(Array.from(missingIngs));
                    setPendingExcelData({ dietNames, nutrientRows: rawNutrientRows, ingredientRows: rawIngredientRows });
                    setIsHomologating(true);
                } else {
                    executeFinalImport(dietNames, rawNutrientRows, rawIngredientRows, {});
                }

            } catch (err) {
                console.error(err);
                alert("Error al procesar el Excel. Verifique el formato de la matriz.");
            }
        };
        reader.readAsBinaryString(file);
    };

    const executeFinalImport = (dietNames: string[], nrList: any[], irList: any[], maps: Record<string, string>) => {
        const newIngredients: Ingredient[] = [];
        const finalMappings = { ...maps };
        
        // 1. Crear nuevos ingredientes si es necesario
        Object.entries(maps).forEach(([sourceName, targetId]) => {
            if (targetId === 'CREATE_NEW') {
                const newId = `ing_new_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                const newIng: Ingredient = {
                    id: newId,
                    name: sourceName,
                    code: ingredients.length + newIngredients.length + 101, // Mayorista para evitar colisiones
                    category: t('common.uncategorized'),
                    price: 0,
                    stock: 999999,
                    nutrients: {}
                };
                newIngredients.push(newIng);
                finalMappings[sourceName] = newId;
            }
        });

        if (newIngredients.length > 0) {
            setIngredients(prev => [...prev, ...newIngredients]);
        }

        const newBases: NutritionalBase[] = dietNames.map((name, dietIdx) => {
            const constraints: any[] = [];
            const ingredientConstraints: any[] = [];

            nrList.forEach(nr => {
                const val = parseFloat(String(nr.values[dietIdx]).replace(',', '.'));
                if (isNaN(val) || val === 0) return;

                let targetNutId = finalMappings[nr.name];
                if (!targetNutId) {
                     const normName = nr.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                     const found = nutrients.find(n => {
                        const sysName = n.name.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                        if (sysName === normName) return true;
                        const synonyms = NUTRIENT_SYNONYMS[n.id] || [];
                        return synonyms.some(s => s === normName);
                     });
                     targetNutId = found?.id;
                }

                // Auto-conversión de Energía (Mcal -> kcal/kg)
                let finalVal = val;
                if (targetNutId && targetNutId.startsWith('n2') && val < 20) {
                    finalVal = val * 1000;
                }

                if (targetNutId && targetNutId !== 'IGNORE') {
                    constraints.push({ nutrientId: targetNutId, min: finalVal, max: 999 });
                }
            });

            irList.forEach(ir => {
                const val = parseFloat(String(ir.values[dietIdx]).replace(',', '.'));
                if (isNaN(val) || val === 0) return;

                let targetIngId = finalMappings[ir.name];
                if (!targetIngId) {
                    const normName = ir.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                    const found = ingredients.find(i => i.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === normName);
                    targetIngId = found?.id;
                }

                if (targetIngId && targetIngId !== 'IGNORE') {
                    ingredientConstraints.push({ ingredientId: targetIngId, min: val, max: 100 });
                }
            });

            return {
                id: `base_xl_${Date.now()}_${dietIdx}`,
                name,
                description: `Importada desde Excel ${new Date().toLocaleDateString()}`,
                constraints,
                relationships: [],
                ingredientConstraints
            } as any;
        });

        if (newBases.length > 0) {
            setBases?.(prev => [...prev, ...newBases]);
            setIsDirty?.(true);
            alert(`✓ Sincronización Exitosa: Se han importado ${newBases.length} bases nutricionales.`);
        }
        setIsHomologating(false);
        setUnmappedNutrients([]);
        setUnmappedIngredients([]);
        setPendingExcelData(null);
        setHomologationMappings({});
    };

    const handleMigrate = () => {
        const idsToMigrate = products.map(p => p.id);
        if (idsToMigrate.length === 0) {
            alert("No hay dietas disponibles para migrar.");
            return;
        }
        onSelectDiets?.(idsToMigrate);
        onNavigate?.('OPTIMIZATION');
        alert(`✓ ${idsToMigrate.length} dietas migradas a Optimización correctamente.`);
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
                    <input id="new-product-category" list="category-list" placeholder={t('common.category') + "..."} className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-[13px] text-white focus:border-cyan-500 outline-none w-32 font-bold"/>
                    <datalist id="category-list">
                        {Array.from(new Set(products.map(p => p.category).filter(Boolean))).map(cat => (
                           <option key={cat} value={cat} />
                        ))}
                    </datalist>
                    <button onClick={() => {
                        if (!newProductName) return;
                        const catInput = document.getElementById('new-product-category') as HTMLInputElement;
                        const normalizedCat = catInput.value.trim().toUpperCase() || undefined;
                        const newId = `p_${Date.now()}`;
                        setProducts([...products, { id: newId, clientId: 'default', code: products.length + 100, name: newProductName, category: normalizedCat, constraints: [], relationships: [], ingredientConstraints: [] }]);
                        setSelectedProductId(newId);
                        setNewProductName('');
                        if (catInput) catInput.value = '';
                    }} className="bg-cyan-600 hover:bg-cyan-500 text-white font-black px-4 py-1.5 rounded text-[13px] transition-all flex items-center justify-center gap-1 shadow-lg shadow-cyan-900/20">
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
                                
                                // DYNAMIC COLOR GENERATOR (100+ Variations)
                                const getCategoryTheme = (name: string) => {
                                    const n = name.toUpperCase();
                                    const colors = [
                                        '#00D1FF', '#818cf8', '#34d399', '#fbbf24', '#3b82f6', '#a78bfa', 
                                        '#fb7185', '#a3e635', '#fb923c', '#e879f9', '#38bdf8', '#c084fc',
                                        '#2dd4bf', '#f472b6', '#facc15', '#94a3b8', '#10b981', '#6366f1',
                                        '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
                                    ];
                                    
                                    let hash = 0;
                                    for (let i = 0; i < n.length; i++) {
                                        hash = n.charCodeAt(i) + ((hash << 5) - hash);
                                    }
                                    
                                    // Priority legacy matches
                                    let colorIndex = Math.abs(hash) % colors.length;
                                    if (n.includes('REPRO')) colorIndex = 2; // Emerald
                                    if (n.includes('COLOR')) colorIndex = 1; // Indigo
                                    if (n.includes('INICIO')) colorIndex = 0; // Cyan
                                    
                                    const mainColor = colors[colorIndex];
                                    return {
                                        main: mainColor,
                                        border: `${mainColor}4d`, // 30% alpha
                                        bg: `${mainColor}0d`,     // 5% alpha
                                        accent: mainColor
                                    };
                                };

                                const theme = cat === t('common.uncategorized') 
                                    ? { main: '#64748b', border: '#334155', bg: '#1e293b66', accent: '#475569' }
                                    : getCategoryTheme(cat);

                                return (
                                    <div key={cat} className="space-y-1">
                                        <button 
                                            onClick={() => {
                                                const newSet = new Set(expandedCategories);
                                                if (newSet.has(cat)) newSet.delete(cat);
                                                else newSet.add(cat);
                                                setExpandedCategories(newSet);
                                            }}
                                            style={{ borderColor: theme.border, backgroundColor: theme.bg, color: theme.main }}
                                            className="w-full flex items-center justify-between p-2.5 rounded-xl border font-black text-[11px] uppercase tracking-wider transition-all shadow-sm hover:brightness-125 active:scale-[0.98] outline-none"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div style={{ backgroundColor: theme.accent }} className="w-1.5 h-1.5 rounded-full pulse shadow-[0_0_8px_rgba(0,0,0,0.3)]"></div>
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
                                        <input list="category-list" value={currentProduct.category || ''} placeholder={t('products.categoryHelp')} onChange={e => handleUpdate(p => ({...p, category: e.target.value.toUpperCase()}))} className="bg-transparent text-[14px] font-black text-emerald-400 focus:outline-none focus:border-b border-emerald-500 w-48" />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 bg-purple-900/20 p-1 rounded-xl border border-purple-500/20 backdrop-blur-sm">
                                        <button 
                                            onClick={() => setShowBasesModal(true)}
                                            className="flex items-center gap-2 hover:bg-purple-900/40 text-purple-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all group"
                                        >
                                            <DuplicateIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                            APLICAR BASE
                                        </button>
                                        <div className="w-px h-5 bg-purple-500/30" />
                                        <button 
                                            onClick={() => handleSaveAsBase()}
                                            className="flex items-center gap-2 hover:bg-emerald-900/40 text-emerald-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all group"
                                        >
                                            <SaveIcon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                            GUARDAR COMO BASE
                                        </button>
                                    </div>

                                    <div className="h-8 w-px bg-gray-700 mx-1"></div>

                                    <button 
                                        onClick={() => excelBasesInputRef.current?.click()}
                                        className="text-[10px] bg-indigo-950/40 text-indigo-400 border border-indigo-500/20 px-3 py-1.5 rounded-xl hover:bg-indigo-900/50 transition-all uppercase font-black tracking-widest flex items-center gap-2"
                                    >
                                        <UploadIcon className="w-3.5 h-3.5" /> IMPORTAR EXCEL
                                    </button>
                                    <input type="file" ref={excelBasesInputRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportBasesExcel} />
                                </div>

                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={handleMigrate}
                                        className="flex items-center gap-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-tighter shadow-[0_4px_20px_rgba(6,182,212,0.3)] hover:shadow-[0_6px_25px_rgba(6,182,212,0.4)] transition-all transform hover:scale-105 active:scale-95 group border border-cyan-400/30"
                                    >
                                        <ChevronDoubleRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        <span>MIGRAR DIETAS</span>
                                    </button>
                                    
                                    <button onClick={() => setSelectedProductId(null)} className="text-gray-500 hover:text-white transition-all transform hover:rotate-90">
                                        <XCircleIcon className="w-7 h-7" />
                                    </button>
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
                                        <div className="w-44">
                                            <SelectionModal 
                                                title={t('products.selectIngredients')} 
                                                triggerLabel="+ Insumos" 
                                                triggerClassName="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl px-4 py-2 text-[11px] font-black flex justify-between items-center transition-all shadow-lg shadow-green-900/20"
                                                options={ingredients.map(i => ({id: i.id, name: i.name, sub: '$' + i.price, code: i.code}))} 
                                                onAdd={addIngredients} 
                                            />
                                        </div>
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
                                        <div className="w-44">
                                            <SelectionModal 
                                                title={t('products.selectNutrients')} 
                                                triggerLabel="+ Nutrientes" 
                                                triggerClassName="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-4 py-2 text-[11px] font-black flex justify-between items-center transition-all shadow-lg shadow-purple-900/20"
                                                options={nutrients.map(n => ({id: n.id, name: n.name, sub: n.unit, code: n.code}))} 
                                                onAdd={addNutrients} 
                                            />
                                        </div>
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
                                                                <SmartInput value={c.min} onChange={v => {
                                                                    let finalV = v;
                                                                    const isEnergy = nut?.id?.startsWith('n2');
                                                                    if (isEnergy && v > 0 && v < 20) finalV = v * 1000;
                                                                    handleUpdate(p => ({...p, constraints: p.constraints.map((x, i) => i === idx ? {...x, min: finalV} : x)}));
                                                                }} placeholder="0" className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-[14px] text-indigo-300 focus:border-indigo-500 border focus:ring-1 focus:ring-indigo-500/50 outline-none font-bold transition-all" />
                                                            </div>
                                                            <div className="flex-1 group/field">
                                                                <label className="text-[9px] text-gray-400 uppercase font-bold block mb-1 text-center">{t('common.max')}</label>
                                                                <SmartInput value={c.max} isMax={true} onChange={v => {
                                                                    let finalV = v;
                                                                    const isEnergy = nut?.id?.startsWith('n2');
                                                                    if (isEnergy && v > 0 && v < 20) finalV = v * 1000;
                                                                    handleUpdate(p => ({...p, constraints: p.constraints.map((x, i) => i === idx ? {...x, max: finalV} : x)}));
                                                                }} placeholder={t('common.max')} className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-[14px] text-indigo-300 focus:border-indigo-500 border focus:ring-1 focus:ring-indigo-500/50 outline-none font-bold transition-all" />
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
            {/* Base Selection Modal */}
            {showBasesModal && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
                    <div className="bg-gray-800 border-2 border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] w-full max-w-xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-gray-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-cyan-500/10 rounded-lg shadow-inner">
                                    <DuplicateIcon className="w-6 h-6 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-wider">Seleccionar Base Nutricional</h3>
                                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">Aplica requerimientos estandarizados a la dieta</p>
                                </div>
                            </div>
                            <button onClick={() => setShowBasesModal(false)} className="text-gray-500 hover:text-white transition-all transform hover:rotate-90 p-2 hover:bg-gray-700 rounded-full">
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-4 border-b border-gray-700 bg-gray-900/30">
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input 
                                    type="text" 
                                    placeholder="Buscar base por nombre..."
                                    className="w-full bg-gray-950 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                            {bases.length === 0 ? (
                                <div className="text-center py-12 px-6">
                                    <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-600">
                                        <FlaskIcon className="w-8 h-8 text-gray-500" />
                                    </div>
                                    <p className="text-gray-400 font-medium italic">No hay bases guardadas.</p>
                                    <p className="text-gray-500 text-xs mt-2">Importa un Excel o guarda la dieta actual como base.</p>
                                </div>
                            ) : (
                                bases.map(base => (
                                    <button 
                                        key={base.id}
                                        onClick={() => {
                                            applyBase(base);
                                            setShowBasesModal(false);
                                        }}
                                        className="w-full p-4 rounded-xl border border-gray-700 bg-gray-800/40 hover:bg-gray-700/60 hover:border-cyan-500/50 hover:shadow-lg transition-all flex justify-between items-center group text-left"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center border border-gray-700 group-hover:bg-cyan-900/20 group-hover:border-cyan-500/30 transition-all">
                                                <SparklesIcon className="w-5 h-5 text-gray-400 group-hover:text-cyan-400" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-200 group-hover:text-white uppercase tracking-tight">{base.name}</div>
                                                <div className="text-[10px] text-gray-500 uppercase font-mono mt-0.5">{base.description}</div>
                                            </div>
                                        </div>
                                        <ChevronRightIcon className="w-5 h-5 text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                                    </button>
                                ))
                            )}
                        </div>
                        
                        <div className="p-6 border-t border-gray-700 bg-gray-800/50 flex justify-between items-center">
                            <span className="text-[10px] text-gray-500 font-mono tracking-tighter uppercase">Total Bases: {bases.length}</span>
                            <button 
                                onClick={() => setShowBasesModal(false)}
                                className="text-sm text-gray-400 hover:text-white font-bold px-4 py-2 hover:bg-gray-700 rounded-lg transition-all"
                            >
                                CERRAR
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Homologation Resolver Modal */}
            {isHomologating && pendingExcelData && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
                    <div className="bg-gray-800 border-2 border-yellow-500/50 rounded-2xl shadow-[0_0_60px_rgba(234,179,8,0.2)] w-full max-w-4xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in duration-300">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center bg-yellow-500/10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-yellow-500/20 rounded-xl">
                                    <ExclamationIcon className="w-8 h-8 text-yellow-500" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Resolutor de Homologación</h3>
                                    <p className="text-yellow-500/70 text-xs font-bold uppercase tracking-widest mt-1">Se detectaron términos no reconocidos en el archivo Excel</p>
                                </div>
                            </div>
                            <button onClick={() => setIsHomologating(false)} className="text-gray-400 hover:text-white p-2 hover:bg-gray-700/50 rounded-full transition-all">
                                <XCircleIcon className="w-8 h-8" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Nutrients Section */}
                            {unmappedNutrients.length > 0 && (
                                <section className="space-y-4">
                                    <div className="flex justify-between items-center">
                                       <h4 className="text-sm font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                                           <NutrientsIcon className="w-6 h-6" /> Nutrientes ({unmappedNutrients.length})
                                       </h4>
                                       <div className="flex gap-2">
                                           <button 
                                               onClick={() => {
                                                   const newMaps = { ...homologationMappings };
                                                   unmappedNutrients.forEach(name => {
                                                       const suggestionId = getBestMatch(name, nutrients);
                                                       if (suggestionId) newMaps[name] = suggestionId;
                                                   });
                                                   setHomologationMappings(newMaps);
                                               }}
                                               className="text-[9px] bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded hover:bg-cyan-900/50 uppercase font-black"
                                           >
                                               Mapear Sugeridos
                                           </button>
                                           <button 
                                               onClick={() => {
                                                   const newMaps = { ...homologationMappings };
                                                   unmappedNutrients.forEach(name => newMaps[name] = 'IGNORE');
                                                   setHomologationMappings(newMaps);
                                               }}
                                               className="text-[9px] bg-red-950/40 text-red-500 border border-red-500/20 px-2 py-1 rounded hover:bg-red-900/50 uppercase font-black"
                                           >
                                               Omitir Todos
                                           </button>
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
                                        {unmappedNutrients.map(name => {
                                            const suggestionId = getBestMatch(name, nutrients);
                                            const suggestedNut = nutrients.find(n => n.id === suggestionId);
                                            return (
                                                <div key={name} className="flex flex-col md:flex-row items-center gap-4 bg-gray-800/80 p-3 rounded-lg border border-gray-700">
                                                    <div className="flex-1 flex items-center gap-3 min-w-0">
                                                        <span className="text-xs font-black text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded truncate uppercase">{name}</span>
                                                        <ChevronRightIcon className="w-4 h-4 text-gray-600 shrink-0" />
                                                        {suggestedNut && (
                                                            <button 
                                                               onClick={() => setHomologationMappings(prev => ({ ...prev, [name]: suggestionId }))}
                                                               className="text-[10px] text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded bg-cyan-500/5 hover:bg-cyan-500/10 flex items-center gap-1 shrink-0 italic"
                                                            >
                                                               Sugerido: {suggestedNut.name}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <select 
                                                        value={homologationMappings[name] || ''}
                                                        onChange={e => setHomologationMappings(prev => ({ ...prev, [name]: e.target.value }))}
                                                        className="w-full md:w-64 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none font-bold"
                                                    >
                                                        <option value="">-- Seleccionar Nutriente --</option>
                                                        <option value="IGNORE">⚠️ IGNORAR FILA</option>
                                                        {nutrients.map(n => (
                                                            <option key={n.id} value={n.id}>{n.name} ({n.unit})</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* Ingredients Section */}
                            {unmappedIngredients.length > 0 && (
                                <section className="space-y-4">
                                    <div className="flex justify-between items-center">
                                       <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                                           <IngredientsIcon className="w-6 h-6" /> Insumos ({unmappedIngredients.length})
                                       </h4>
                                       <div className="flex gap-2">
                                           <button 
                                               onClick={() => {
                                                   const newMaps = { ...homologationMappings };
                                                   unmappedIngredients.forEach(name => newMaps[name] = 'CREATE_NEW');
                                                   setHomologationMappings(newMaps);
                                               }}
                                               className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded hover:bg-emerald-900/50 uppercase font-black"
                                           >
                                               Crear Todos (Nuevos)
                                           </button>
                                           <button 
                                               onClick={() => {
                                                   const newMaps = { ...homologationMappings };
                                                   unmappedIngredients.forEach(name => newMaps[name] = 'IGNORE');
                                                   setHomologationMappings(newMaps);
                                               }}
                                               className="text-[9px] bg-red-950/40 text-red-500 border border-red-500/20 px-2 py-1 rounded hover:bg-red-900/50 uppercase font-black"
                                           >
                                               Omitir Todos
                                           </button>
                                       </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 bg-gray-900/50 p-4 rounded-xl border border-gray-700/50">
                                        {unmappedIngredients.map(name => {
                                            const suggestionId = getBestMatch(name, ingredients);
                                            const suggestedIng = ingredients.find(i => i.id === suggestionId);
                                            return (
                                                <div key={name} className="flex flex-col md:flex-row items-center gap-4 bg-gray-800/80 p-3 rounded-lg border border-gray-700">
                                                    <div className="flex-1 flex items-center gap-3 min-w-0">
                                                        <span className="text-xs font-black text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded truncate uppercase">{name}</span>
                                                        <ChevronRightIcon className="w-4 h-4 text-gray-600 shrink-0" />
                                                        {suggestedIng && (
                                                            <button 
                                                               onClick={() => setHomologationMappings(prev => ({ ...prev, [name]: suggestionId }))}
                                                               className="text-[10px] text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded bg-emerald-500/5 hover:bg-emerald-500/10 flex items-center gap-1 shrink-0 italic"
                                                            >
                                                               Sugerido: {suggestedIng.name}
                                                            </button>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-2 w-full md:w-auto">
                                                        <select 
                                                            value={homologationMappings[name] || ''}
                                                            onChange={e => setHomologationMappings(prev => ({ ...prev, [name]: e.target.value }))}
                                                            className="flex-1 md:w-64 bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:border-cyan-500 outline-none font-bold"
                                                        >
                                                            <option value="">-- Seleccionar Insumo --</option>
                                                            <option value="CREATE_NEW">➕ CREAR COMO NUEVO</option>
                                                            <option value="IGNORE">⚠️ IGNORAR FILA</option>
                                                            {ingredients.map(i => (
                                                                <option key={i.id} value={i.id}>{i.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="p-6 border-t border-gray-700 bg-gray-900/50 flex justify-between items-center">
                            <button 
                                onClick={() => setIsHomologating(false)}
                                className="text-xs font-black text-gray-500 hover:text-white uppercase tracking-widest"
                            >
                                Cancelar Importación
                            </button>
                            <button 
                                onClick={() => {
                                    const allMapped = [...unmappedNutrients, ...unmappedIngredients].every(name => homologationMappings[name]);
                                    if (!allMapped) {
                                        if (!window.confirm("Hay términos sin mapear. Se ignorarán las filas no resueltas. ¿Continuar?")) return;
                                    }
                                    executeFinalImport(pendingExcelData.dietNames, pendingExcelData.nutrientRows, pendingExcelData.ingredientRows, homologationMappings);
                                }}
                                className="bg-yellow-600 hover:bg-yellow-500 text-white font-black px-10 py-3 rounded-xl shadow-lg shadow-yellow-900/20 transform hover:scale-105 active:scale-95 transition-all uppercase tracking-tighter"
                            >
                                Finalizar Sincronización
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
