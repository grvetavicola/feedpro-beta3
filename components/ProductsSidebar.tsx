import React from 'react';
import { Client, Product, ViewState } from '../types';
import { Users, FileText, ChevronRight, LayoutGrid, Calculator, FlaskConical, Beaker, Package, Settings, PlayCircle } from 'lucide-react';

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

          {/* Real-time Diet Tree */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block">
                Árbol de Dietas
              </label>
              <span className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">
                {filteredProducts.length}
              </span>
            </div>
            
            <div className="space-y-1">
              {filteredProducts.length > 0 ? (
                filteredProducts.map(product => (
                  <button
                    key={product.id}
                    onClick={() => {
                        onNavigate('OPTIMIZATION');
                        onSelectProduct(product);
                    }}
                    className="w-full flex items-center justify-between group px-3 py-2.5 rounded-lg border border-transparent hover:border-gray-800 hover:bg-gray-900/50 transition-all text-left"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center shrink-0 group-hover:bg-cyan-500/20 transition-colors border border-gray-700 group-hover:border-cyan-500/50">
                        <FileText size={18} className="group-hover:text-cyan-400 text-gray-400" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[14px] font-black text-white truncate">{product.name}</p>
                        <p className="text-[10px] text-cyan-400 font-black uppercase tracking-tighter">Banda: {product.code}</p>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-gray-600 group-hover:text-cyan-400/50" />
                  </button>
                ))
              ) : (
                <p className="text-xs text-gray-600 italic px-3 py-4 text-center">No hay dietas registradas para este cliente.</p>
              )}

              <button className="w-full mt-2 py-2 border border-dashed border-gray-800 rounded-lg text-gray-600 text-xs hover:border-cyan-500/50 hover:text-cyan-500 transition-all flex items-center justify-center gap-2">
                + Nueva Dieta
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
