import React from 'react';
import { Client, Product, ViewState } from '../types';
import { Users, FileText, ChevronRight, LayoutGrid, Calculator, FlaskConical, Beaker, Package, Settings, PlayCircle, Plus } from 'lucide-react';
import { APP_NAME, APP_VERSION } from '../constants';

interface ProductsSidebarProps {
  clients: Client[];
  products: Product[];
  selectedClientId?: string;
  onSelectClient: (id: string) => void;
  onSelectProduct: (product: Product) => void;
  selectedDietIds: string[];
  onToggleDietSelection: (ids: string[], isSelected: boolean) => void;
  onEditProduct?: (id: string) => void;
  onDeleteProduct?: (id: string) => void;
  onEditCategory?: (category: string) => void;
  onDeleteCategory?: (category: string) => void;
  onNavigate: (view: ViewState) => void;
  activeView: ViewState;
  onManageProfile?: () => void;
}

export const ProductsSidebar: React.FC<ProductsSidebarProps> = ({
  clients,
  products,
  selectedClientId,
  onSelectClient,
  onSelectProduct,
  selectedDietIds,
  onToggleDietSelection,
  onEditProduct,
  onDeleteProduct,
  onEditCategory,
  onDeleteCategory,
  onNavigate,
  activeView,
  onManageProfile
}) => {
  const filteredProducts = products.filter(p => !selectedClientId || p.clientId === selectedClientId);

  const attemptDeleteProduct = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm("¿Estás seguro de que deseas eliminar esta dieta? Esta acción no se puede deshacer.")) {
      onDeleteProduct?.(id);
    }
  };

  const attemptDeleteCategory = (e: React.MouseEvent, cat: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (window.confirm("¿Estás seguro de que deseas eliminar la categoría completa? Esta acción no se puede deshacer.")) {
      onDeleteCategory?.(cat);
    }
  };

  return (
    <aside className="w-[240px] bg-gray-950 border-r border-gray-800 flex flex-col h-full overflow-hidden">
      {/* Nivel 1, 2 y 3: Identidad y Selección */}
      <div className="p-6 border-b border-gray-800 flex flex-col gap-4">
        
        {/* Nivel 1: Marca (Clickable) */}
        <button 
          onClick={onManageProfile}
          className="flex flex-col items-start gap-1 group text-left outline-none transition-transform active:scale-95"
          title="Gestión de Fábrica"
        >
          <h1 className="text-[18px] font-black text-white italic tracking-tighter leading-none group-hover:text-cyan-400 transition-colors">
            {APP_NAME}
          </h1>
          <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.3em] leading-none opacity-80 decoration-none">
            EXECUTIVE
          </p>
        </button>

        {/* Nivel 2: Logo del Cliente Activo */}
        <div className="flex justify-start items-center">
            <div className="w-16 h-16 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center overflow-hidden shadow-inner group/logo hover:border-cyan-500/30 transition-all">
                {(() => {
                    const currentClient = clients.find(c => c.id === selectedClientId);
                    return currentClient?.logo ? (
                        <img src={currentClient.logo} alt="Factory" className="w-full h-full object-contain p-1" />
                    ) : (
                        <Users className="w-6 h-6 text-gray-700" />
                    );
                })()}
            </div>
        </div>

        {/* Nivel 3: Acción/Selector (Dropdown) */}
        <div className="relative group w-full">
          <select
            value={selectedClientId}
            onChange={(e) => onSelectClient(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 px-3 text-[12px] font-black text-white appearance-none focus:ring-1 focus:ring-cyan-500 outline-none transition-all cursor-pointer hover:border-cyan-500/50"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id} className="bg-gray-900 font-bold">{c.name}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-cyan-400">
             <ChevronRight className="w-3.5 h-3.5 rotate-90" />
          </div>
        </div>
      </div>

      {/* Navigation / Products List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-4 space-y-6">
          {/* General Navigation Shortcuts */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">
              Módulos Críticos
            </label>
            <div className="space-y-1.5 p-1">
              {[
                { id: 'DASHBOARD', label: 'Inicio', icon: LayoutGrid, color: 'text-blue-400', bg: 'hover:bg-blue-500/10' },
                { id: 'INGREDIENTS', label: 'Insumos', icon: Beaker, color: 'text-emerald-400', bg: 'hover:bg-emerald-500/10' },
                { id: 'NUTRIENTS', label: 'Nutrientes', icon: FlaskConical, color: 'text-purple-400', bg: 'hover:bg-purple-500/10' },
                { id: 'PRODUCTS', label: 'Productos', icon: Package, color: 'text-indigo-400', bg: 'hover:bg-indigo-500/10' },
                { id: 'OPTIMIZATION', label: 'Optimización', icon: Calculator, color: 'text-cyan-400', bg: 'hover:bg-cyan-500/10' },
                { id: 'SIMULATION', label: 'Simular', icon: PlayCircle, color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
                { id: 'SETTINGS', label: 'Ajustes', icon: Settings, color: 'text-gray-400', bg: 'hover:bg-gray-500/10' },
              ].map(item => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id as ViewState)}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group ${isActive
                        ? 'bg-gray-800 border-2 border-cyan-500/50 shadow-lg shadow-cyan-900/20'
                        : `border border-transparent ${item.bg}`
                      }`}
                  >
                    <item.icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${isActive ? item.color : 'text-gray-100 group-hover:' + item.color}`} />
                    <span className={`text-[12px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Diet Tree with Categorization */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">
                Árbol de Dietas
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-gray-900 text-cyan-400 px-2 py-0.5 rounded-full border border-cyan-500/20 font-black">
                  {filteredProducts.length} TOTAL
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {filteredProducts.length > 0 ? (
                (() => {
                  const grouped = filteredProducts.reduce((acc, p) => {
                    const cat = p.category || 'Sin Categoría';
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(p);
                    return acc;
                  }, {} as Record<string, Product[]>);

                  return Object.entries(grouped).map(([category, items]) => {
                    const allSelected = items.length > 0 && items.every(p => selectedDietIds.includes(p.id));
                    const someSelected = items.some(p => selectedDietIds.includes(p.id)) && !allSelected;

                    return (
                      <div key={category} className="space-y-1">
                        <div className="flex items-center gap-2 px-1 mb-1 justify-between group/cat">
                          <label className="flex items-center gap-2 cursor-pointer relative z-10 flex-1">
                            <input
                              type="checkbox"
                              className="w-3 h-3 appearance-none border border-emerald-500/50 rounded bg-gray-900 checked:bg-emerald-500 checked:border-emerald-500 transition-colors shrink-0"
                              checked={allSelected}
                              ref={input => { if (input) input.indeterminate = someSelected; }}
                              onChange={(e) => onToggleDietSelection(items.map(i => i.id), e.target.checked)}
                            />
                            {allSelected && <svg className="w-2.5 h-2.5 text-black absolute left-px pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}

                            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider truncate">{category}</span>
                          </label>

                          <div className="flex items-center gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); onEditCategory?.(category); }} className="p-0.5 text-gray-500 hover:text-cyan-400"><Settings size={10} /></button>
                            <button onClick={(e) => attemptDeleteCategory(e, category)} className="p-0.5 text-gray-500 hover:text-red-400"><Plus size={10} className="rotate-45" /></button>
                          </div>
                          <span className="text-[9px] text-gray-600 font-bold shrink-0 ml-1 group-hover/cat:hidden">{items.length}</span>
                        </div>
                        <div className="space-y-1 ml-2 pl-2 border-l border-gray-800/50">
                          {items.map(product => {
                            const isSelected = selectedDietIds.includes(product.id);
                            return (
                              <div
                                key={product.id}
                                className={`w-full flex items-center justify-between group/item px-2 py-1.5 rounded-lg border transition-all text-left ${isSelected ? 'border-cyan-500/50 bg-cyan-900/10' : 'border-transparent hover:border-gray-800 hover:bg-gray-900/50'}`}
                              >
                                <label className="flex items-center gap-2 overflow-hidden flex-1 cursor-pointer">
                                  <div className="relative shrink-0 flex items-center justify-center">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => onToggleDietSelection([product.id], e.target.checked)}
                                      className="w-3.5 h-3.5 appearance-none border border-gray-600 rounded bg-gray-900 checked:bg-cyan-500 checked:border-cyan-500 cursor-pointer transition-colors"
                                    />
                                    {isSelected && <svg className="w-2.5 h-2.5 text-black absolute pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                  </div>
                                  <div className="overflow-hidden flex-1">
                                    <p className={`text-[13px] font-bold truncate transition-colors ${isSelected ? 'text-cyan-300' : 'text-gray-100 group-hover/item:text-white'}`}>{product.name}</p>
                                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">REF-{product.code}</p>
                                  </div>
                                </label>
                                <div className="flex items-center gap-2 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 ml-2">
                                  <button onClick={(e) => { e.stopPropagation(); onEditProduct?.(product.id); }} className="text-gray-500 hover:text-cyan-400 transition-colors">
                                    <Settings size={12} />
                                  </button>
                                  <button onClick={(e) => attemptDeleteProduct(e, product.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                                    <Plus size={12} className="rotate-45" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
                })()
              ) : (
                <div className="py-8 flex flex-col items-center justify-center text-center px-4 bg-gray-900/20 rounded-xl border border-dashed border-gray-800">
                  <Package className="w-6 h-6 text-gray-700 mb-2 opacity-20" />
                  <p className="text-[11px] text-gray-600 font-bold uppercase tracking-tighter">No hay dietas registradas</p>
                </div>
              )}

              <button
                onClick={() => onNavigate('PRODUCTS')}
                className="w-full mt-2 py-3 border-2 border-dashed border-gray-800/10 rounded-xl text-gray-500 text-[11px] font-black uppercase tracking-widest hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all flex items-center justify-center gap-2 group"
              >
                <Plus className="w-3 h-3 group-hover:scale-125 transition-transform" /> Nueva Dieta
              </button>
            </div>
          </div>
        </div>
      </div>

    </aside>
  );
};
