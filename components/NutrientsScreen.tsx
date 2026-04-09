import React, { useState } from 'react';
import { Nutrient } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { PlusIcon, TrashIcon } from './icons';

interface NutrientsScreenProps {
  nutrients: Nutrient[];
  setNutrients: React.Dispatch<React.SetStateAction<Nutrient[]>>;
}

export const NutrientsScreen: React.FC<NutrientsScreenProps> = ({ nutrients, setNutrients }) => {
  const { t } = useTranslations();
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

  // Ordenar nutrientes por código
  const sortedNutrients = [...nutrients].sort((a, b) => (a.code || 0) - (b.code || 0));

  return (
    <div className="p-3 space-y-3">
      <h2 className="text-xl font-bold text-cyan-400 uppercase tracking-tight">{t('nutrients.title')}</h2>
      
      <div className="bg-gray-800/50 p-3 rounded border border-gray-700/50">
        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">{t('nutrients.addNew')}</h3>
        <form onSubmit={handleAddNutrient} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
           <div className="col-span-1">
             <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">Código</label>
              <input
                type="number"
                placeholder="Auto"
                value={newNutrient.code}
                onChange={(e) => setNewNutrient({ ...newNutrient, code: e.target.value })}
                className="w-full bg-gray-900 text-[13px] rounded p-1.5 border border-gray-700 focus:border-cyan-500 outline-none"
              />
          </div>
          <div className="col-span-1">
            <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">Nombre</label>
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
            <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">Unidad</label>
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
             <label className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 block">Grupo</label>
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
                <PlusIcon className="w-4 h-4" /> {t('nutrients.addBtn')}
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
                            No hay perfiles nutricionales definidos. 
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
