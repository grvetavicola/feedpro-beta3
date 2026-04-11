import React from 'react';
import { Client, Product, ViewState } from '../types';
import { Users, FileText, ChevronRight, LayoutGrid, Calculator, FlaskConical, Beaker, Package, Settings, PlayCircle, Plus, Edit2, Trash2, Upload } from 'lucide-react';
import { APP_NAME, APP_VERSION } from '../constants';
import { useTranslations } from '../lib/i18n/LangContext';

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
  onLogout?: () => void;
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
  onUpdateClientLogo,
  onLogout
}) => {
  const { t } = useTranslations();
  const [expandedCategories, setExpandedCategories] = React.useState<string[]>([]);
  const filteredProducts = products.filter(p => !selectedClientId || p.clientId === selectedClientId);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => 
        prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const groupedProducts = filteredProducts.reduce((acc, p) => {
    const cat = p.category || t('common.uncategorized') || 'Sin Categoría';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, Product[]>);

  return (
    <aside className="w-[240px] bg-gray-950 border-r border-gray-800 flex flex-col h-full overflow-hidden">
      {/* Zona de Identidad Premium: Logo + Perfil Integrado */}
      <div className="p-2 pb-0 border-b border-gray-800 bg-gray-950 flex flex-col items-center shrink-0">
        <div className="w-full flex flex-col bg-gray-900/60 border border-gray-800/80 rounded-2xl shadow-xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-900/5 to-transparent pointer-events-none" />

          {/* Logo del Perfil Activo */}
          <div className="relative px-3 py-3 flex flex-col items-center justify-center min-h-[50px] border-b border-gray-800/30">
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
                      <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em] font-black">{t('common.loading')}</span>
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
              {t('common.category').toUpperCase()}
            </label>
            <div className="space-y-0.5">
              {[
                { id: 'DASHBOARD', label: t('nav.dashboard'), img: '/icons/inicio.png' },
                { id: 'INGREDIENTS', label: t('nav.ingredients'), img: '/icons/ingredient.png' },
                { id: 'NUTRIENTS', label: t('nav.nutrients'), img: '/icons/nutrients.png' },
                { id: 'PRODUCTS', label: t('nav.products'), img: '/icons/products.png' },
                { id: 'SIMULATION', label: t('nav.simulation'), img: '/icons/simulation.png' },
                { id: 'OPTIMIZATION', label: t('nav.formulation'), img: '/icons/formulation.png' },
              ].map(item => {
                const isActive = activeView === item.id;
                const isOptim = item.id === 'OPTIMIZATION';
                
                return (
                  <div key={item.id}>
                    <button
                        onClick={() => {
                            if (isOptim) {
                                onNavigate('OPTIMIZATION');
                            } else {
                                onNavigate(item.id as ViewState);
                            }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-300 group ${isActive
                        ? 'bg-gray-800 border border-cyan-500/50 shadow-md shadow-cyan-900/20'
                        : `border border-transparent hover:bg-white/5`
                        }`}
                    >
                        <div className="relative w-7 h-7 transition-transform group-hover:scale-110">
                        <img
                            src={item.img}
                            alt={item.label}
                            className={`absolute inset-0 w-full h-full object-contain mix-blend-screen opacity-0`}
                            title={item.label}
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
                        <span className={`flex-1 text-[11px] font-black uppercase tracking-[0.2em] transition-colors text-left ${isActive ? 'text-white' : 'text-white/70 group-hover:text-white'}`}>
                        {item.label}
                        </span>
                        {isOptim && <ChevronRight className={`w-3 h-3 text-gray-500 transition-transform ${isActive ? 'rotate-90' : ''}`} />}
                    </button>

                    {/* Sub-menu for Optimization */}
                    {isOptim && isActive && (
                        <div className="mt-2 ml-4 space-y-3 pl-2 border-l border-gray-800 animate-slide-down">
                            {Object.entries(groupedProducts).map(([category, items]) => {
                                const isExpanded = expandedCategories.includes(category);
                                const allSelected = items.length > 0 && items.every(p => selectedDietIds.includes(p.id));
                                const someSelected = items.some(p => selectedDietIds.includes(p.id)) && !allSelected;

                                return (
                                    <div key={category} className="space-y-1">
                                        <div className="flex items-center gap-2 group/cat">
                                            <div className="relative w-3.5 h-3.5">
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    ref={input => { if (input) input.indeterminate = someSelected; }}
                                                    onChange={(e) => onToggleDietSelection(items.map(i => i.id), e.target.checked)}
                                                    className="w-full h-full appearance-none border border-emerald-500/50 rounded bg-gray-950 checked:bg-emerald-500 cursor-pointer"
                                                />
                                                {allSelected && <svg className="w-2.5 h-2.5 text-black absolute inset-0 m-auto pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                            </div>
                                            <button 
                                                onClick={() => toggleCategory(category)}
                                                className="flex-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest text-left truncate flex items-center justify-between"
                                            >
                                                {category}
                                                <ChevronRight className={`w-2.5 h-2.5 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                            </button>
                                        </div>

                                        {isExpanded && (
                                            <div className="mt-1 ml-4 space-y-1 border-l border-gray-800/40 pl-2">
                                                {items.map(product => {
                                                    const isSelected = selectedDietIds.includes(product.id);
                                                    return (
                                                        <div key={product.id} className="flex items-center gap-2 py-0.5 group/item">
                                                            <div className="relative w-3 h-3">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isSelected}
                                                                    onChange={(e) => onToggleDietSelection([product.id], e.target.checked)}
                                                                    className="w-full h-full appearance-none border border-gray-700 rounded bg-gray-950 checked:bg-cyan-500 cursor-pointer"
                                                                />
                                                                {isSelected && <svg className="w-2 h-2 text-black absolute inset-0 m-auto pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>}
                                                            </div>
                                                            <span className={`text-[11px] font-bold truncate transition-colors ${isSelected ? 'text-cyan-300' : 'text-gray-400 group-hover/item:text-white'}`}>
                                                                {product.name}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Footer */}
      <div className="p-3 border-t border-gray-800 shrink-0 text-center">
        <p className="text-[9px] text-gray-600 uppercase tracking-widest font-black leading-tight">
          &copy; 2026 {APP_NAME}.<br />{t('common.confirm')} feedpro 360.
        </p>
      </div>
    </aside>
  );
};
