import React from 'react';
import { Client, Product, ViewState } from '../types';
import { Users, FileText, ChevronRight, LayoutGrid, Calculator, FlaskConical, Beaker, Package, Settings, PlayCircle, Plus, Edit2, Trash2, Upload } from 'lucide-react';
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
  onUpdateClientLogo?: (clientId: string, newLogo: string) => void;
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
  onManageProfile,
  onUpdateClientLogo
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
      {/* Zona de Identidad Premium: Logo + Perfil Integrado */}
      <div className="p-2 pb-0 border-b border-gray-800 bg-gray-950 flex flex-col items-center shrink-0">
        <div className="w-full flex flex-col bg-gray-900/60 border border-gray-800/80 rounded-2xl shadow-xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/5 to-transparent pointer-events-none" />

          {/* Top: Branding FeedPro (Fix) */}
          <div className="w-full flex justify-center pt-4 pb-3 border-b border-gray-800/30">
            <img
              src="/FeedPro-sinfondo.PNG"
              alt="FeedPro 360"
              className="max-h-11 object-contain drop-shadow-md opacity-90"
            />
          </div>

          {/* Middle: Logo del Perfil Activo (Escapado de edición directa) */}
          <div className="relative px-3 py-4 flex flex-col items-center justify-center min-h-[60px]">
            {(() => {
              const currentClient = clients.find(c => c.id === selectedClientId);
              return (
                <>
                  {currentClient?.logo ? (
                    <img
                      src={currentClient.logo}
                      alt={currentClient?.name}
                      className="max-w-full max-h-[45px] object-contain drop-shadow-md"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-1 opacity-20">
                      <Users className="w-6 h-6 text-gray-500 mb-1" />
                      <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">Sin Logo</span>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Bottom: Selector de Perfil */}
          <div className="px-2 pb-2">
            <div className="relative w-full">
              <select
                value={selectedClientId}
                onChange={(e) => onSelectClient(e.target.value)}
                className="w-full bg-gray-950/80 hover:bg-gray-800 border border-gray-700/60 rounded-xl py-2 pl-3 pr-8 text-[11px] font-black text-cyan-400 appearance-none outline-none transition-all cursor-pointer text-center uppercase tracking-widest shadow-inner shadow-black/20"
              >
                {clients.map(c => (
                  <option key={c.id} value={c.id} className="bg-gray-900 font-bold normal-case text-left text-white">{c.name}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                <ChevronRight className="w-3.5 h-3.5 rotate-90" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation / Products List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-3 space-y-4">
          {/* General Navigation Shortcuts */}
          <div>
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 block px-1">
              Módulos Críticos
            </label>
            <div className="space-y-0.5">
              {[
                { id: 'DASHBOARD', label: 'Inicio', img: '/inicio.png', color: 'border-blue-400', bg: 'hover:bg-blue-500/10' },
                { id: 'INGREDIENTS', label: 'Insumos', img: '/ingredients.png', color: 'border-emerald-400', bg: 'hover:bg-emerald-500/10' },
                { id: 'NUTRIENTS', label: 'Nutrientes', img: '/nutrients.png', color: 'border-purple-400', bg: 'hover:bg-purple-500/10' },
                { id: 'PRODUCTS', label: 'Dietas', img: '/products.png', color: 'border-indigo-400', bg: 'hover:bg-indigo-500/10' },
                { id: 'OPTIMIZATION', label: 'Optimización', img: '/formulation.png', color: 'border-cyan-400', bg: 'hover:bg-cyan-500/10' },
                { id: 'SIMULATION', label: 'Simular', img: '/simulation.png', color: 'border-amber-400', bg: 'hover:bg-amber-500/10' },
                { id: 'SETTINGS', label: 'Ajustes', img: '/settings.png', color: 'border-gray-400', bg: 'hover:bg-gray-500/10' },
              ].map(item => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id as ViewState)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${isActive
                      ? 'bg-gray-800 border border-cyan-500/50 shadow-md shadow-cyan-900/20'
                      : `border border-transparent ${item.bg}`
                      }`}
                  >
                    <div className="relative w-7 h-7 transition-transform group-hover:scale-110">
                      {/* Generar color solido usando filtros CSS avanzados (drop-shadow technique) */}
                      <img
                        src={item.img}
                        alt={item.label}
                        className={`absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-0`}
                      />
                      <div
                        className={`absolute inset-0 w-full h-full ${isActive ? 'bg-cyan-500' : 'bg-cyan-600/70 group-hover:bg-cyan-500'}`}
                        style={{
                          WebkitMaskImage: `url('${item.img}')`,
                          WebkitMaskSize: 'contain',
                          WebkitMaskPosition: 'center',
                          WebkitMaskRepeat: 'no-repeat',
                          maskImage: `url('${item.img}')`,
                          maskSize: 'contain',
                          maskPosition: 'center',
                          maskRepeat: 'no-repeat',
                        }}
                      />
                    </div>
                    <span className={`text-[11px] font-black uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
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
                            <button onClick={(e) => { e.stopPropagation(); onEditCategory?.(category); }} className="p-1.5 text-gray-500 hover:text-cyan-400 bg-gray-900 hover:bg-gray-800 rounded-md"><Edit2 size={10} /></button>
                            <button onClick={(e) => attemptDeleteCategory(e, category)} className="p-1.5 text-gray-500 hover:text-red-400 bg-gray-900 hover:bg-gray-800 rounded-md"><Trash2 size={10} /></button>
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
                                <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity shrink-0 ml-2">
                                  <button onClick={(e) => { e.stopPropagation(); onEditProduct?.(product.id); }} className="p-1.5 text-gray-500 hover:text-cyan-400 bg-gray-950 hover:bg-gray-800 rounded-md transition-colors">
                                    <Edit2 size={12} />
                                  </button>
                                  <button onClick={(e) => attemptDeleteProduct(e, product.id)} className="p-1.5 text-gray-500 hover:text-red-400 bg-gray-950 hover:bg-gray-800 rounded-md transition-colors">
                                    <Trash2 size={12} />
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

      {/* Copyright Footer */}
      <div className="p-3 border-t border-gray-800 shrink-0 text-center">
        <p className="text-[9px] text-gray-600 uppercase tracking-widest font-black leading-tight">
          &copy; 2026 {APP_NAME}.<br />Todos los derechos reservados.
        </p>
      </div>
    </aside>
  );
};
