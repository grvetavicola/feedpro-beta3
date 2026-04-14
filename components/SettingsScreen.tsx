import React from 'react';
import { useTranslations } from '../lib/i18n/LangContext';
import { GlobeIcon, MonitorIcon, DatabaseIcon, ShieldCheckIcon, SaveIcon, PlusIcon, UserIcon, TrashIcon, SearchIcon } from './icons';
import { Client, ViewState, Ingredient, Nutrient, Product } from '../types';
import { APP_NAME } from '../constants';

interface SettingsScreenProps {
    clients: Client[];
    setClients: React.Dispatch<React.SetStateAction<Client[]>>;
    onNavigate: (view: ViewState) => void;
    uiScale: number;
    setUiScale: (scale: number) => void;
    ingredients: Ingredient[];
    setIngredients: React.Dispatch<React.SetStateAction<Ingredient[]>>;
    nutrients: Nutrient[];
    setNutrients: React.Dispatch<React.SetStateAction<Nutrient[]>>;
    products: Product[];
    setProducts: React.Dispatch<React.SetStateAction<Product[]>>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ clients, setClients, onNavigate, uiScale, setUiScale, ingredients, setIngredients, nutrients, setNutrients, products, setProducts }) => {
    const { t, language, setLanguage } = useTranslations();
    const [newClientName, setNewClientName] = React.useState('');
    const [isSaving, setIsSaving] = React.useState(false);
    
    const handleAddClient = () => {
        if (!newClientName) return;
        const newClient = { id: `c${Date.now()}`, name: newClientName };
        setClients([...clients, newClient]);
        setNewClientName('');
    };

    const handleExportMatrix = () => {
        const matrixData = {
            version: '2.0.0',
            timestamp: new Date().toISOString(),
            ingredients,
            nutrients,
            products,
            clients
        };
        const blob = new Blob([JSON.stringify(matrixData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `FeedPro_Matriz_Backup_${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
    };

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const excelInputRef = React.useRef<HTMLInputElement>(null);
    const handleImportMatrix = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (data.ingredients && Array.isArray(data.ingredients)) setIngredients(data.ingredients);
                if (data.nutrients && Array.isArray(data.nutrients)) setNutrients(data.nutrients);
                if (data.products && Array.isArray(data.products)) setProducts(data.products);
                if (data.clients && Array.isArray(data.clients)) setClients(data.clients);
                alert("Matriz importada y restaurada exitosamente.");
            } catch (error) {
                console.error("Error importing matrix:", error);
                alert("El archivo no es un backup válido de FeedPro Matrix.");
            }
        };
        reader.readAsText(file);
    };

    const NUTRIENT_SYNONYMS: Record<string, number> = {
        'proteína bruta': 500010, 'pb': 500010, 'proteina bruta': 500010,
        'proteína cruda': 500015, 'proteina cruda': 500015, 'cp': 500015,
        'materia seca': 100015, 'ms': 100015, 'dry matter': 100015,
        'humedad': 100010, 'humidity': 100010,
        'grasa (ee)': 300100, 'e. etereo': 300100, 'ee': 300100,
        'ácido linoleico': 300200, 'a linoleico (n-6)': 300200, 'linoleico': 300200,
        'fibra bruta': 400100, 'fibra cruda': 400100, 'fc': 400100,
        'calcio': 541010, 'ca': 541010,
        'fósforo total': 541020, 'fosforo total': 541020, 'p total': 541020,
        'fósforo disponible': 541050, 'fosforo disponible a': 541050, 'p disp': 541050, 'pd': 541050,
        'potasio k': 551040, 'potasio': 551040, 'k': 551040,
        'sodio na': 551020, 'sodio': 551020, 'na': 551020,
        'cloro cl': 551030, 'cloro': 551030, 'cl': 551030,
        'mongin': 531080, 'dpb': 531080,
        'energía met. ap.': 200020, 'e metabolizable a': 200020, 'em': 200020, 'me': 200020,
        'lisina total lis': 510010, 'lys total %': 510010, 'lysine': 510010,
        'lisina disponible lda': 521010, 'lys dig a %': 521010, 'lys d': 521010,
        'metionina total': 510040, 'met total %': 510040, 'met': 510040,
        'metionina disponible': 521030, 'met dig a %': 521030, 'met d': 521030,
        'metionina + cistina total': 510060, 'm+c total %': 510060, 'm+c': 510060,
        'm+c disponible': 521050, 'm+c dig a %': 521050, 'm+c d': 521050,
        'triptófano total': 510070, 'trip total %': 510070, 'trp': 510070,
        'triptófano disponible': 521060, 'trip dig a %': 521060, 'trp d': 521060,
        'treonina total': 510030, 'tre total %': 510030, 'thr': 510030,
        'treonina disponible': 521020, 'tre dig a %': 521020, 'thr d': 521020,
        'arginina total': 510140, 'arg total %': 510140, 'arg': 510140,
        'arginina disponible': 521130, 'arg dig a %': 521130, 'arg d': 521130,
        'isoleucina total': 510080, 'iso total %': 510080, 'ile': 510080,
        'isoleucina disponible': 521070, 'iso dig a %': 521070, 'ile d': 521070,
        'valina total': 510090, 'val total %': 510090, 'val': 510090,
        'valina disponible': 521080, 'val dig a %': 521080, 'val d': 521080,
        'xantofila': 531030, 'xan': 531030,
        'colina col': 561030, 'colina (mg/kg)': 561030, 'colina': 561030
    };

    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !(window as any).XLSX) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const bstr = event.target?.result;
                const XLSX = (window as any).XLSX;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
                if (data.length < 2) return;

                // 1. Detección Inteligente de Fila de Encabezados (Soporte para Doble Encabezado)
                let headerIdx = -1;
                for (let i = 0; i < Math.min(data.length, 15); i++) {
                    if (data[i] && data[i].some(c => {
                        const s = String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                        return s.includes('nombre') || s.includes('name') || s.includes('ingredient') || s.includes('insumo');
                    })) {
                        headerIdx = i;
                        break;
                    }
                }

                if (headerIdx === -1) {
                    alert("No se pudo detectar la fila de encabezados. Asegúrate de tener una columna llamada 'INGREDIENT' o 'NOMBRE'.");
                    return;
                }

                // Unir encabezados de la fila actual y la siguiente (si existe) para soportar tablas complejas
                const row1 = data[headerIdx] || [];
                const row2 = data[headerIdx + 1] || [];
                const maxCols = Math.max(row1.length, row2.length);
                const headers: string[] = [];
                for (let j = 0; j < maxCols; j++) {
                    const v1 = String(row1[j] || '').trim();
                    const v2 = String(row2[j] || '').trim();
                    headers.push((v1 + " " + v2).trim());
                }

                const rows = data.slice(headerIdx + 1); // Empezamos a procesar desde justo después del primer encabezado
                // Si la fila 2 era parte del encabezado, la primera fila de datos reales podría estar vacía o ser la que acabamos de usar en headers
                // Así que filtramos filas que parezcan encabezados repetidos (ej: que contengan "proteina" o "precio" en lugar de valores numericos)
                const dataRows = rows.filter(r => {
                    const hasData = r.some(c => c !== null && c !== '');
                    const isHeaderRepetition = r.some(c => {
                        const s = String(c).toLowerCase();
                        return (s.includes('proteina') || s.includes('precio') || s.includes('nombre')) && isNaN(parseFloat(String(c)));
                    });
                    return hasData && !isHeaderRepetition;
                });

                const nutrientMap: Record<number, string> = {};
                let nameCol = -1, codeCol = -1, priceCol = -1, stockCol = -1, catCol = -1;

                headers.forEach((h, idx) => {
                    if (!h) return;
                    const rawS = h.toString().toLowerCase().trim();
                    const s = rawS.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                                .replace(/\(.*\)/g, "") // Quitar unidades entre paréntesis ej: (%)
                                .replace(/%/g, "")      // Quitar símbolos de %
                                .trim();
                    
                    if (s.includes('nombre') || s.includes('ingrediente') || s.includes('ingredient') || s.includes('name')) {
                        if (nameCol === -1) nameCol = idx;
                    }
                    else if (s === 'codigo' || s === 'code' || s === 'id' || s.includes('codigo')) {
                        if (codeCol === -1) codeCol = idx;
                    }
                    else if (s.includes('precio') || s.includes('price') || s.includes('costo')) {
                        if (priceCol === -1) priceCol = idx;
                    }
                    else if (s.includes('stock')) {
                        if (stockCol === -1) stockCol = idx;
                    }
                    else if (s.includes('categoria') || s.includes('category')) {
                        if (catCol === -1) catCol = idx;
                    }
                    else {
                        // 1. Busqueda por Código exacto (limpiando s)
                        let n = nutrients.find(nt => nt.code.toString() === s);
                        
                        // 2. Busqueda por Nombre exacto (normalizado)
                        if (!n) n = nutrients.find(nt => nt.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim() === s);
                        
                        // 3. Busqueda por Sinónimos (comparación parcial)
                        if (!n) {
                            const foundSynonymKey = Object.keys(NUTRIENT_SYNONYMS).find(key => s.includes(key) || key.includes(s));
                            if (foundSynonymKey) {
                                const targetCode = NUTRIENT_SYNONYMS[foundSynonymKey];
                                n = nutrients.find(nt => nt.code === targetCode);
                            }
                        }

                        if (n) nutrientMap[idx] = n.id;
                    }
                });

                const currentMaxCode = ingredients.length > 0 ? Math.max(...ingredients.map(i => i.code || 0)) : 100000;

                const newIngs: Ingredient[] = dataRows.map((row, rIdx) => {
                    if (!row[nameCol] || String(row[nameCol]).toLowerCase().includes('nombre')) return null;
                    const nts: Record<string, number> = {};
                    Object.keys(nutrientMap).forEach(k => {
                        const idx = parseInt(k);
                        let val = row[idx];
                        if (typeof val === 'string') val = val.replace(',', '.').replace(/\s/g, '');
                        const numVal = parseFloat(val);
                        if (!isNaN(numVal)) nts[nutrientMap[idx]] = numVal;
                    });
                    
                    const codeFromExcel = parseInt(row[codeCol]);
                    const finalCode = !isNaN(codeFromExcel) ? codeFromExcel : (currentMaxCode + rIdx + 1);

                    return {
                        id: `i-xl-${Date.now()}-${rIdx}`,
                        code: finalCode,
                        name: row[nameCol].toString(),
                        category: row[catCol]?.toString() || 'Macro',
                        price: parseFloat(row[priceCol]) || 0,
                        stock: parseFloat(row[stockCol]) || 100000,
                        nutrients: nts
                    };
                }).filter(Boolean) as Ingredient[];

                if (newIngs.length > 0) {
                    if (window.confirm(`Detectados ${newIngs.length} insumos. ¿Deseas COMBINAR con actuales? (Cancelar para REEMPLAZAR)`)) {
                        setIngredients([...ingredients, ...newIngs]);
                    } else {
                        setIngredients(newIngs);
                    }
                    alert("Importación Exitosa.");
                }
            } catch (err) { 
                console.error(err);
                alert("Error al procesar Excel. Verifique el formato."); 
            }
        };
        reader.readAsBinaryString(file);
    };

    const handleSave = () => {
        setIsSaving(true);
        // Simulate persistence
        setTimeout(() => {
            setIsSaving(false);
            onNavigate('DASHBOARD');
        }, 1200);
    };

    const handleUpdateLogo = (clientId: string, logo: string) => {
        setClients(prev => prev.map(c => c.id === clientId ? { ...c, logo } : c));
    };
    
    return (
        <div className="p-3 space-y-6 animate-fade-in max-w-5xl mx-auto h-full overflow-y-auto custom-scrollbar pb-24">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Panel de <span className="text-cyan-400">Configuración</span></h2>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Gestión Central de la Plataforma {APP_NAME}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Gestión de Perfiles y Logos (Dominante) */}
                <div className="lg:col-span-2 bg-gray-900 shadow-2xl border border-gray-800 p-6 rounded-3xl space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-500/20 p-2 rounded-xl flex items-center justify-center">
                                <img src="/icons/clients.png" alt="Icono Clientes" className="w-6 h-6 object-contain filter saturate-200 hue-rotate-15 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white leading-none uppercase tracking-tighter">Perfiles de Clientes</h3>
                                <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-widest">Editar identidades y logotipos</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <input 
                                value={newClientName}
                                onChange={(e) => setNewClientName(e.target.value)}
                                placeholder="Nombre del nuevo cliente..."
                                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-xs text-white focus:border-cyan-500 outline-none w-48"
                             />
                             <button 
                                onClick={handleAddClient}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-lg text-xs"
                             >
                                 <PlusIcon className="w-4 h-4" /> Añadir
                             </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {clients.map(client => (
                            <div key={client.id} className="bg-gray-800/40 border border-gray-700 p-4 rounded-2xl flex items-center gap-4 group hover:border-cyan-500/30 transition-all">
                                <div className="relative w-16 h-16 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex items-center justify-center shrink-0">
                                    {client.logo ? (
                                        <img src={client.logo} alt={client.name} className="w-full h-full object-contain" />
                                    ) : (
                                        <img src="/icons/clients.png" alt="Sin Logo" className="w-8 h-8 object-contain opacity-20 grayscale brightness-150 mix-blend-screen" />
                                    )}
                                    <label className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                        <SearchIcon className="w-4 h-4 text-cyan-400" />
                                        <span className="text-[8px] text-white font-black uppercase mt-1">Cargar</span>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const reader = new FileReader();
                                                reader.onload = (ev) => handleUpdateLogo(client.id, ev.target?.result as string);
                                                reader.readAsDataURL(file);
                                            }}
                                        />
                                    </label>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-gray-400 text-[9px] font-black uppercase tracking-widest">{client.id}</p>
                                    <h4 className="text-white font-bold truncate">{client.name}</h4>
                                    <button 
                                        onClick={() => setClients(prev => prev.filter(c => c.id !== client.id))}
                                        className="mt-1 text-[10px] text-red-500/70 hover:text-red-400 font-bold uppercase tracking-tighter"
                                    >
                                        Eliminar Perfil
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    {/* 2. Language Section */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl space-y-4">

                        <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                            <div className="bg-indigo-500/20 p-2 rounded-xl flex items-center justify-center">
                                <img src="/icons/localization.png" alt="Icono Localizacion" className="w-6 h-6 object-contain drop-shadow-[0_0_5px_rgba(99,102,241,0.5)]" />
                            </div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none">Localización</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => setLanguage('es')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${language === 'es' ? 'bg-indigo-900/40 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                            >
                                <span className="text-2xl">🇪🇸</span>
                                <span className="font-black uppercase tracking-widest text-[10px]">Español</span>
                            </button>
                            <button 
                                onClick={() => setLanguage('en')}
                                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${language === 'en' ? 'bg-indigo-900/40 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'bg-gray-950 border-gray-800 text-gray-500 hover:border-gray-700'}`}
                            >
                                <span className="text-2xl">🇺🇸</span>
                                <span className="font-black uppercase tracking-widest text-[10px]">English</span>
                            </button>
                        </div>
                    </div>

                    {/* Matrix Management Section */}
                    <div className="bg-gradient-to-br from-indigo-950 to-gray-900 border border-indigo-900/50 p-6 rounded-3xl space-y-4 shadow-lg">
                        <div className="flex items-center gap-3 border-b border-indigo-900/50 pb-4">
                            <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-400">
                                <DatabaseIcon className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none">Gestión de Matriz</h3>
                        </div>
                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest leading-relaxed">
                            Respalda y restaura toda la base de datos (Insumos, Nutrientes y Dietas) en formato seguro JSON.
                        </p>
                                                <div className="flex gap-3">
                            <button 
                                onClick={handleExportMatrix}
                                className="flex-1 bg-indigo-900/40 hover:bg-indigo-800/50 text-white font-black uppercase text-[10px] py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border border-indigo-500/30 group"
                            >
                                <SaveIcon className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform"/>
                                Respaldar JSON
                            </button>
                            <button 
                                onClick={() => excelInputRef.current?.click()}
                                className="flex-1 bg-emerald-950/40 hover:bg-emerald-800/40 text-emerald-200 font-black uppercase text-[10px] py-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all border border-emerald-500/30 group"
                            >
                                <img src="/icons/excel.png" className="w-5 h-5 object-contain group-hover:scale-110 transition-transform" alt="Excel" />
                                Importar Excel
                            </button>
                            <input 
                                type="file" 
                                accept=".xlsx, .xls, .csv" 
                                className="hidden" 
                                ref={excelInputRef} 
                                onChange={handleImportExcel} 
                            />
                        </div>
                        <div className="pt-2">
                             <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full bg-gray-800/50 hover:bg-gray-700 text-gray-400 font-bold uppercase text-[9px] py-2 rounded-xl flex items-center justify-center gap-2 transition-all border border-gray-700"
                            >
                                <div className="rotate-180"><SaveIcon className="w-3 h-3"/></div>
                                Restaurar desde JSON (Backup)
                            </button>
                            <input 
                                type="file" 
                                accept=".json" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleImportMatrix} 
                            />
                        </div>
                    </div>

                    {/* 3. Display Section */}
                    <div className="bg-gray-900 border border-gray-800 p-6 rounded-3xl space-y-4">
                        <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
                            <div className="bg-cyan-500/20 p-2 rounded-xl text-cyan-400">
                                <MonitorIcon className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-white uppercase tracking-tighter leading-none">Interfaz</h3>
                        </div>
                        <div className="space-y-4">
                            <div>
                                 <label className="block text-[10px] text-gray-600 font-black uppercase mb-1 tracking-widest">Escala del Motor</label>
                                 <select 
                                    value={uiScale}
                                    onChange={(e) => setUiScale(parseFloat(e.target.value))}
                                    className="w-full bg-gray-950 border border-gray-800 text-gray-400 p-3 rounded-xl outline-none focus:border-cyan-500 font-bold text-xs appearance-none"
                                 >
                                     <option value={0.9}>90% (Ultra Compacto)</option>
                                     <option value={1.0}>100% (Estándar)</option>
                                     <option value={1.1}>110% (Panel Grande)</option>
                                 </select>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-gray-950 rounded-xl border border-gray-800">
                                <span className="text-[10px] text-gray-500 font-black uppercase">Modo de Alto Rendimiento</span>
                                <div className="w-8 h-4 bg-emerald-600 rounded-full relative">
                                    <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Floating Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-950/80 backdrop-blur-md border-t border-gray-800 flex justify-center items-center gap-6 z-50">
                <button 
                    onClick={() => {
                        if(window.confirm('¿Estás seguro de restaurar y borrar tu perfil local? Se cargarán los insumos maestros nuevamente.')) {
                            localStorage.clear();
                            window.location.reload();
                        }
                    }}
                    className="text-red-500 hover:text-red-400 font-bold px-6 py-4 rounded-2xl hover:bg-red-500/10 transition-all text-xs uppercase tracking-widest border border-transparent hover:border-red-500/30"
                >
                    Restaurar Valores de Fábrica
                </button>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-gradient-to-r from-cyan-600 to-cyan-400 text-white font-black px-12 py-4 rounded-2xl shadow-2xl shadow-cyan-900/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 uppercase tracking-[0.2em] text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <>Procesando...</>
                    ) : (
                        <>
                            <SaveIcon className="w-5 h-5" /> Guardar y Regresar
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
