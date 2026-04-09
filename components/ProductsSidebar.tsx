import React from 'react';
import { Client, Product, ViewState } from '../types';
import { Users, FileText, ChevronRight, LayoutGrid, Calculator } from 'lucide-react';

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
  const activeClientName = clients.find(c => c.id === selectedClientId)?.name || 'Seleccionar Cliente';

  return (
    <aside className="w-[300px] bg-gray-950 border-r border-gray-800 flex flex-col h-full overflow-hidden">
      {/* Client Selector Section */}
      <div className="p-4 border-b border-gray-800">
        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 block">
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
            <div className="space-y-1">
              <button 
                onClick={() => onNavigate('DASHBOARD')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeView === 'DASHBOARD' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:bg-gray-900'}`}
              >
                <LayoutGrid size={16} /> Dashboard
              </button>
              <button 
                onClick={() => onNavigate('GROUP_OPTIMIZATION')}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${activeView === 'GROUP_OPTIMIZATION' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-gray-400 hover:bg-gray-900'}`}
              >
                <Calculator size={16} /> Optimización Grupal
              </button>
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
                      <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center shrink-0 group-hover:bg-cyan-500/20 transition-colors">
                        <FileText size={14} className="group-hover:text-cyan-400" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-bold text-gray-200 truncate">{product.name}</p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-tighter">Banda: {product.code}</p>
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
