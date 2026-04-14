import React, { useState } from 'react';
import { Nutrient } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { PlusIcon, TrashIcon, SparklesIcon } from './icons';

interface NutrientsScreenProps {
  nutrients: Nutrient[];
  setNutrients: React.Dispatch<React.SetStateAction<Nutrient[]>>;
}

export const NutrientsScreen: React.FC<NutrientsScreenProps> = ({ nutrients, setNutrients }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [newNutrient, setNewNutrient] = useState({ name: '', unit: '', group: '', code: '' });

  const getNextCode = () => {
    if (nutrients.length === 0) return 1;
    const maxCode = Math.max(...nutrients.map(n => n.code || 0));
    return maxCode + 1;
  };

  const handleAddNutrient = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNutrient.name && newNutrient.unit && newNutrient.group) {
      const code = newNutrient.code ? parseInt(newNutrient.code) : getNextCode();
      setNutrients([...nutrients, { ...newNutrient, code, id: `n${Date.now()}` }]);
      setNewNutrient({ name: '', unit: '', group: '', code: '' });
    }
  };
  
  const handleDeleteNutrient = (id: string) => {
    if (window.confirm(t('nutrients.deleteConfirm'))) {
        setNutrients(nutrients.filter(n => n.id !== id));
    }
  }

  // Ordenar y Filtrar nutrientes
  const sortedNutrients = [...nutrients]
    .filter(n => 
      n.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (n.code && n.code.toString().includes(searchTerm))
    )
    .sort((a, b) => (a.code || 0) - (b.code || 0));

  return (
    <div className="p-3 space-y-3 animate-fade-in w-full">
         <div className="relative bg-gradient-to-br from-cyan-900/40 to-indigo-900/40 rounded-xl p-4 border border-cyan-500/20 overflow-hidden shadow-md flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
             <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full -mr-12 -mt-12 blur-3xl opacity-30"></div>
             <div className="relative z-10 flex items-center gap-4 w-full md:w-auto">
                 <div className="bg-cyan-950/50 p-2.5 rounded-xl border border-cyan-800/50 backdrop-blur-sm shadow-inner shrink-0 hidden sm:flex items-center justify-center">
                     <img src="/icons/nutrients.png" className="w-8 h-8 object-contain saturate-200 hue-rotate-15 contrast-125 brightness-125 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" alt="Icon Nutrients" />
                 </div>
                 <div className="space-y-0.5 max-w-xl text-left w-full">
                    <div className="flex items-center gap-2 text-cyan-400 font-bold text-[10px] uppercase tracking-wider mb-1">
                      <SparklesIcon className="w-3 h-3"/> Módulo de Control de Matriz
                    </div>
                    <h1 className="text-xl md:text-2xl font-black text-white leading-tight uppercase tracking-tight">{t('nutrients.title')}</h1>
                    <p className="text-gray-400 font-bold text-[11px] md:text-[12px] leading-snug uppercase tracking-widest">{t('nav.nutrients')}</p>
                 </div>
             </div>
             
             {/* Buscador de Nutrientes */}
             <div className="relative z-10 w-full md:w-64">
                <input 
                  type="text"
                  placeholder="Buscar por Nombre o Código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-900/60 border border-cyan-500/30 rounded-lg px-4 py-2 text-white text-sm outline-none focus:border-cyan-400 transition-all placeholder:text-gray-500"
                />
             </div>
         </div>
      <div className="bg-gray-800/50 p-3 rounded border border-gray-700/50">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t('nutrients.addNew')}</h3>
        <form onSubmit={handleAddNutrient} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
           <div className="col-span-1">
             <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">{t('common.code')}</label>
              <input
                type="number"
                placeholder="Auto"
                value={newNutrient.code}
                onChange={(e) => setNewNutrient({ ...newNutrient, code: e.target.value })}
                className="w-full bg-gray-900 text-[13px] rounded p-1.5 border border-gray-700 focus:border-cyan-500 outline-none"
              />
          </div>
          <div className="col-span-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">{t('common.name')}</label>
            <input
                type="text"
                placeholder={t('nutrients.namePlaceholder')}
                value={newNutrient.name}
                onChange={(e) => setNewNutrient({ ...newNutrient, name: e.target.value })}
                className="w-full bg-gray-900 text-[13px] rounded p-1.5 border border-gray-700 focus:border-cyan-500 outline-none"
                required
            />
          </div>
          <div className="col-span-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">{t('common.unit')}</label>
            <input
                type="text"
                placeholder="e.g. %, kcal/kg"
                value={newNutrient.unit}
                onChange={(e) => setNewNutrient({ ...newNutrient, unit: e.target.value })}
                className="w-full bg-gray-900 text-[13px] rounded p-1.5 border border-gray-700 focus:border-cyan-500 outline-none"
                required
            />
          </div>
          <div className="col-span-1">
             <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">{t('common.group')}</label>
             <input
                type="text"
                placeholder="e.g. Minos, Macros"
                value={newNutrient.group}
                onChange={(e) => setNewNutrient({ ...newNutrient, group: e.target.value })}
                className="w-full bg-gray-900 text-[13px] rounded p-1.5 border border-gray-700 focus:border-cyan-500 outline-none"
                required
             />
          </div>
          <div className="col-span-1">
            <button type="submit" className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-1.5 px-3 rounded transition-colors flex items-center justify-center gap-2 text-[13px]">
                <PlusIcon className="w-4 h-4" /> {t('nutrients.addNew')}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-gray-800 rounded shadow-sm border border-gray-700 overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left text-gray-300">
              <thead className="text-[10px] text-gray-500 uppercase tracking-widest bg-gray-900 border-b border-gray-700">
                <tr>
                <th scope="col" className="px-3 py-2 w-16">Cód</th>
                <th scope="col" className="px-3 py-2">{t('nutrients.tableHeaderName')}</th>
                <th scope="col" className="px-3 py-2">{t('nutrients.tableHeaderUnit')}</th>
                <th scope="col" className="px-3 py-2">{t('nutrients.tableHeaderGroup')}</th>
                <th scope="col" className="px-3 py-2 text-center w-16">{t('nutrients.tableHeaderActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700/50">
                {sortedNutrients.map((nutrient) => (
                  <tr key={nutrient.id} className="h-[32px] hover:bg-gray-700/30 transition-colors">
                  <td className="px-3 py-0 font-mono text-gray-500 text-[11px]">{nutrient.code}</td>
                  <td className="px-3 py-0 font-medium whitespace-nowrap">{nutrient.name}</td>
                  <td className="px-3 py-0">{nutrient.unit}</td>
                  <td className="px-3 py-0">{nutrient.group}</td>
                  <td className="px-3 py-0 text-center flex justify-center items-center h-[32px]">
                    <button onClick={() => handleDeleteNutrient(nutrient.id)} className="text-gray-500 hover:text-red-400 transition-colors p-1">
                        <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
                ))}
                {nutrients.length === 0 && (
                    <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-gray-500 italic text-[11px]">
                            {t('nutrients.noNutrients')}
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};
