import React from 'react';
import { Client, Product, ViewState } from '../types';
import { Users, FileText, ChevronRight, LayoutGrid, Calculator, FlaskConical, Beaker, Package, Settings, PlayCircle, Plus } from 'lucide-react';

interface ProductsSidebarProps {
  clients: Client[];
  products: Product[];
  selectedClientId?: string;
  onSelectClient: (id: string) => void;
  onSelectProduct: (product: Product) => void;
  onNavigate: (view: ViewState) => void;
  activeView: ViewState;
}

export const ProductsSidebar: React.FC<ProductsSidebarProps> = ({
  clients,
  products,
  selectedClientId,
  onSelectClient,
  onSelectProduct,
  onNavigate,
  activeView
}) => {
  const filteredProducts = products.filter(p => !selectedClientId || p.clientId === selectedClientId);
  
  return (
    <aside className="w-[240px] bg-gray-950 border-r border-gray-800 flex flex-col h-full overflow-hidden">
      {/* Brand Logo & Client Selector Section */}
      <div className="p-4 border-b border-gray-800 flex flex-col items-center">
        <div className="mb-4 flex flex-col items-center">
             <img src="/feedpro.png" alt="FeedPro" className="h-10 object-contain drop-shadow-md mb-2" />
             <div className="h-px w-10 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"></div>
        </div>

        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2 block w-full text-center">
          Consultoría Activa
        </label>
        <div className="relative group">
          <select 
            value={selectedClientId} 
            onChange={(e) => onSelectClient(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 px-3 text-sm font-medium text-cyan-400 appearance-none focus:ring-1 focus:ring-cyan-500 outline-none transition-all"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none group-hover:text-cyan-400">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse mr-2"></span>
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
                { id: 'GROUP_OPTIMIZATION', label: 'Opt. Grupal', icon: Calculator, color: 'text-cyan-400', bg: 'hover:bg-cyan-500/10' },
                { id: 'SIMULATION', label: 'Simular', icon: PlayCircle, color: 'text-amber-400', bg: 'hover:bg-amber-500/10' },
                { id: 'SETTINGS', label: 'Ajustes', icon: Settings, color: 'text-gray-400', bg: 'hover:bg-gray-500/10' },
              ].map(item => {
                const isActive = activeView === item.id;
                return (
                  <button 
                    key={item.id}
                    onClick={() => onNavigate(item.id as ViewState)}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl transition-all duration-300 group ${
                        isActive 
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

                  return Object.entries(grouped).map(([category, items]) => (
                    <div key={category} className="space-y-1">
                      <div className="flex items-center gap-2 px-1 mb-1 justify-between">
                         <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">{category}</span>
                         </div>
                         <span className="text-[9px] text-gray-600 font-bold">{items.length}</span>
                      </div>
                      <div className="space-y-1 ml-1 pl-2 border-l border-gray-800/50">
                        {items.map(product => (
                          <button
                            key={product.id}
                            onClick={() => {
                                onNavigate('OPTIMIZATION');
                                onSelectProduct(product);
                            }}
                            className="w-full flex items-center justify-between group px-2 py-1.5 rounded-lg border border-transparent hover:border-gray-800 hover:bg-gray-900/50 transition-all text-left"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="w-7 h-7 rounded bg-gray-800 flex items-center justify-center shrink-0 group-hover:bg-cyan-500/20 transition-colors border border-gray-700/50">
                                <FileText size={12} className="group-hover:text-cyan-400 text-gray-500" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-[13px] font-bold text-gray-100 truncate group-hover:text-white">{product.name}</p>
                                <p className="text-[9px] text-gray-600 font-bold uppercase tracking-tighter">REF-{product.code}</p>
                              </div>
                            </div>
                            <ChevronRight size={12} className="text-gray-700 group-hover:text-cyan-400/50" />
                          </button>
                        ))}
                      </div>
                    </div>
                  ));
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

      {/* Footer Info */}
      <div className="p-4 bg-gray-900/30 border-t border-gray-800">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <p className="text-[10px] font-black text-gray-300 uppercase">Sistema Operativo</p>
        </div>
        <p className="text-[9px] text-gray-500 italic">FeedPro 360 v1.1.0 • Standalone</p>
      </div>
    </aside>
  );
};
