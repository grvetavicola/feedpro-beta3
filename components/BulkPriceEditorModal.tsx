import React, { useState, useMemo } from 'react';
import { Ingredient, IngredientDelta } from '../types';
import { XCircleIcon, SearchIcon, ZapIcon, CheckIcon, RefreshIcon } from './icons';

interface BulkPriceEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  activeIngredientIds?: Set<string> | string[];
  currentOverrides?: Record<string, IngredientDelta>;
  onSavePrices: (newPrices: Record<string, number>) => void;
}

export const BulkPriceEditorModal: React.FC<BulkPriceEditorModalProps> = ({
  isOpen,
  onClose,
  ingredients,
  activeIngredientIds,
  currentOverrides = {},
  onSavePrices
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'active'>(activeIngredientIds ? 'active' : 'all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Local state for modified prices before saving
  const [localPrices, setLocalPrices] = useState<Record<string, number | null>>({});

  const activeIdsSet = useMemo(() => {
    if (!activeIngredientIds) return new Set<string>();
    return activeIngredientIds instanceof Set ? activeIngredientIds : new Set(activeIngredientIds);
  }, [activeIngredientIds]);

  const filteredIngredients = useMemo(() => {
    let list = ingredients;
    if (activeTab === 'active') {
      list = ingredients.filter(ing => activeIdsSet.has(ing.id));
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(ing => ing.name.toLowerCase().includes(term) || (ing.code?.toString() || '').includes(term));
    }
    return list.sort((a, b) => (a.code || 0) - (b.code || 0));
  }, [ingredients, activeTab, searchTerm, activeIdsSet]);

  const handlePriceChange = (id: string, value: string) => {
    const numValue = value === '' ? null : parseFloat(value);
    setLocalPrices(prev => ({ ...prev, [id]: numValue }));
  };

  const handleSave = () => {
    const finalUpdates: Record<string, number> = {};
    Object.entries(localPrices).forEach(([id, val]) => {
      if (val !== null) finalUpdates[id] = val;
    });
    onSavePrices(finalUpdates);
    setLocalPrices({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[85vh] ring-1 ring-white/5">
        
        {/* Header Cyberpunk */}
        <div className="p-8 bg-gradient-to-r from-indigo-950/40 via-black to-cyan-950/40 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
              <ZapIcon className="w-7 h-7 text-indigo-400" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-[14px] font-black text-white uppercase tracking-[0.3em] font-mono italic">Modo Francotirador</h2>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1 opacity-80">Edición Masiva de Precios Delta</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-all p-2 hover:bg-white/5 rounded-2xl">
            <XCircleIcon className="w-8 h-8" />
          </button>
        </div>

        {/* Tab Selector & Search */}
        <div className="px-8 py-5 bg-black/40 flex flex-col sm:flex-row gap-4 border-b border-white/5 items-center">
          <div className="flex p-1 bg-white/5 rounded-2xl border border-white/5 w-full sm:w-auto">
            <button 
              onClick={() => setActiveTab('all')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Maestro Global
            </button>
            <button 
              onClick={() => setActiveTab('active')}
              disabled={!activeIngredientIds}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'} disabled:opacity-20 disabled:cursor-not-allowed`}
            >
              Solo Activos
            </button>
          </div>
          
          <div className="relative flex-1 group w-full">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400" />
            <input 
              type="text" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="BUSCAR VECTORES..." 
              className="w-full h-12 bg-black/60 border border-white/5 rounded-2xl pl-11 pr-5 text-[12px] font-black uppercase text-white outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-700"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar bg-black/20">
          <div className="space-y-2">
            {filteredIngredients.map(ing => {
              const currentPrice = localPrices[ing.id] !== undefined 
                ? localPrices[ing.id] 
                : (currentOverrides[ing.id]?.price ?? ing.price);
              
              const isModified = localPrices[ing.id] !== undefined;

              return (
                <div key={ing.id} className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${isModified ? 'bg-indigo-500/5 border-indigo-500/30' : 'bg-white/[0.02] border-white/5 hover:border-white/10'}`}>
                  <div className="flex flex-col min-w-0 flex-1 pr-4">
                    <span className="text-[13px] font-black text-white uppercase tracking-tight truncate">{ing.name}</span>
                    <span className="text-[10px] text-slate-500 font-bold font-mono tracking-widest uppercase mt-0.5">REF-{ing.code}</span>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex flex-col items-end">
                      <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest mb-1">Precio Unit.</span>
                      <div className="relative flex items-center">
                        <span className="absolute left-4 text-indigo-400 font-black text-sm">$</span>
                        <input 
                          type="number"
                          value={currentPrice === null ? '' : currentPrice}
                          onChange={e => handlePriceChange(ing.id, e.target.value)}
                          className={`w-36 h-11 bg-black rounded-2xl border border-white/10 pl-8 pr-4 text-right text-base font-black font-mono transition-all ${isModified ? 'text-indigo-400 border-indigo-500/50 ring-1 ring-indigo-500/20' : 'text-white border-white/5 focus:border-indigo-500/50'}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredIngredients.length === 0 && (
              <div className="py-20 text-center flex flex-col items-center opacity-30">
                <SearchIcon className="w-12 h-12 text-slate-500 mb-4" />
                <span className="text-xs font-black uppercase tracking-widest">No se encontraron insumos</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-black/60 border-t border-white/5 flex items-center justify-between gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mb-1">Cambios Pendientes</span>
            <span className="text-[16px] font-black font-mono text-indigo-400">{Object.keys(localPrices).length} Insumos</span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setLocalPrices({})}
              className="px-6 h-12 text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Resetear
            </button>
            <button 
              onClick={handleSave}
              disabled={Object.keys(localPrices).length === 0}
              className="px-10 h-14 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 disabled:grayscale text-white font-black uppercase rounded-[1.25rem] shadow-2xl shadow-indigo-900/40 flex items-center gap-4 transition-all active:scale-95 tracking-[0.2em] text-[11px] border border-white/10"
            >
              <CheckIcon className="w-5 h-5" /> Aplicar Cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
