import React from 'react';
import { Product, Ingredient, SavedFormula, Client, ViewState } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { TruckIcon, StarIcon, TrendingUpIcon, ShoppingCartIcon, ClockIcon, ArrowRightIcon, AIIcon, ProductsIcon, IngredientsIcon, FormulateIcon, NutrientsIcon, DatabaseIcon, FlaskIcon, CalculatorIcon } from './icons';

interface DashboardProps {
  products: Product[];
  ingredients: Ingredient[];
  savedFormulas: SavedFormula[];
  clients: Client[];
  onNavigate: (view: ViewState) => void;
  isDynamicMatrix: boolean;
  setIsDynamicMatrix: (val: boolean) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ products, ingredients, savedFormulas, clients, onNavigate, isDynamicMatrix, setIsDynamicMatrix }) => {
  const { t } = useTranslations();

  const lastOp = savedFormulas.length > 0 ? new Date(savedFormulas[savedFormulas.length - 1].date).toLocaleDateString() : 'N/A';

  const stats = [
    { label: 'Insumos Disponibles', value: ingredients.length, icon: DatabaseIcon, color: 'text-green-400', bg: 'bg-green-900/20' },
    { label: 'Dietas Definidas', value: products.length, icon: FlaskIcon, color: 'text-indigo-400', bg: 'bg-indigo-900/20' },
    { label: 'Formulaciones Realizadas', value: savedFormulas.length, icon: CalculatorIcon, color: 'text-cyan-400', bg: 'bg-cyan-900/20' },
    { label: 'Última Optimización', value: lastOp, icon: TrendingUpIcon, color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  ];

  return (
    <div className="p-3 space-y-3 animate-fade-in w-full">
      
      {/* Hero Welcome (Compact) */}
      <div className="relative bg-gradient-to-br from-cyan-900/40 to-indigo-900/40 rounded-xl p-3 border border-cyan-500/20 overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full -mr-12 -mt-12 blur-3xl opacity-30"></div>
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-[10px] uppercase tracking-wider">
              <StarIcon className="w-3 h-3"/> FeedPro 360 v5.3 (BETA3)
            </div>
            <h1 className="text-lg font-bold text-white leading-tight">Optimización Nutricional <span className="text-cyan-400">Sin Compromisos.</span></h1>
            <p className="text-gray-400 text-[13px] leading-snug">Motor táctico de formulación agropecuaria sincronizado.</p>
          </div>
          <div className="flex gap-2 shrink-0">
             <button onClick={() => onNavigate('OPTIMIZATION')} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold px-4 py-1.5 rounded flex items-center gap-2 transition-all text-[13px]">
                <CalculatorIcon className="w-3 h-3"/> FORMULAR
             </button>
             <button onClick={() => onNavigate('GROUP_OPTIMIZATION')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded flex items-center gap-2 transition-all text-[13px] shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-500/50">
                <DatabaseIcon className="w-3 h-3"/> MASA DE FÓRMULAS
             </button>
             <button onClick={() => onNavigate('PRODUCTS')} className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-4 py-1.5 rounded border border-gray-700 transition-all text-[13px] hidden sm:block">
                Configurar
             </button>
          </div>
        </div>
      </div>

      {/* Precision Matrix Toggle */}
      <div className={`border py-2 px-3 rounded flex items-center justify-between shadow-sm transition-colors ${isDynamicMatrix ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-gray-800/40 border-gray-700/50'}`}>
          <div className="flex items-center gap-2">
              <DatabaseIcon className={isDynamicMatrix ? "text-cyan-400 w-4 h-4" : "text-gray-500 w-4 h-4"} />
              <div>
                  <h3 className="text-[13px] font-bold text-white leading-none">
                      {isDynamicMatrix ? "Matriz Dinámica Activada" : "Matriz Estándar (Referencias)"}
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-none">
                      Sobrescribe valores teóricos con datos de laboratorio al formular.
                  </p>
              </div>
          </div>
          <button 
              onClick={() => setIsDynamicMatrix(!isDynamicMatrix)} 
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 ${isDynamicMatrix ? 'bg-cyan-500' : 'bg-gray-600'}`}
          >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isDynamicMatrix ? 'translate-x-5' : 'translate-x-1'}`} />
          </button>
      </div>

      {/* Stats Matrix (Compact) */}
      <div className="grid grid-cols-4 gap-2">
          {stats.map((stat, i) => (
             <div key={i} className="bg-gray-800/30 border border-gray-700/30 p-2 rounded flex items-center justify-between hover:border-cyan-500/30 transition-colors">
                <div className="space-y-0">
                    <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-tight">{stat.label}</p>
                    <p className="text-base font-bold text-white leading-none">{stat.value}</p>
                </div>
                <div className={`${stat.bg} p-1.5 rounded transition-transform`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`}/>
                </div>
             </div>
          ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          
          {/* Recent Formulations (Compact) */}
          <div className="lg:col-span-8 bg-gray-800/30 rounded border border-gray-700/30 overflow-hidden flex flex-col shadow-sm">
             <div className="px-3 py-1.5 border-b border-gray-700/30 flex justify-between items-center bg-gray-900/10">
                <h3 className="text-[13px] font-bold text-white flex items-center gap-1.5"><ClockIcon className="text-cyan-400 w-3 h-3"/> Recientes</h3>
                <button onClick={() => onNavigate('SIMULATION')} className="text-[10px] text-cyan-400 hover:underline uppercase">Historial</button>
             </div>
             <div className="p-0 flex-1">
                {savedFormulas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-600">
                        <CalculatorIcon className="w-8 h-8 mb-2 opacity-10"/>
                        <p className="text-[11px] font-medium uppercase uppercase">No hay registros recientes</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-950/20 text-[10px] uppercase font-semibold text-gray-500">
                                <tr>
                                    <th className="px-3 py-1.5">Fórmula / Producto</th>
                                    <th className="px-3 py-1.5">Fecha</th>
                                    <th className="px-3 py-1.5 text-right">Costo / kg</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/20">
                                {savedFormulas.slice(-5).map(f => (
                                    <tr key={f.id} className="hover:bg-gray-700/10 transition-colors h-[32px]">
                                        <td className="px-3 py-1 text-[13px] font-medium text-gray-200">{f.name}</td>
                                        <td className="px-3 py-1 text-[11px] text-gray-500 font-mono">{new Date(f.date).toLocaleDateString()}</td>
                                        <td className="px-3 py-1 text-right font-mono text-green-400 font-bold text-[13px]">${(f.result.totalCost / 1000).toFixed(4)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
             </div>
          </div>

          <div className="lg:col-span-4 space-y-3">
             <div className="bg-gradient-to-br from-indigo-950/20 to-purple-950/20 rounded border border-indigo-500/10 p-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <AIIcon className="w-5 h-5 text-indigo-400"/>
                    <div>
                        <h3 className="text-[13px] font-bold text-white">Asistente AI</h3>
                        <p className="text-gray-500 text-[10px] leading-tight">Diagnóstico proactivo</p>
                    </div>
                </div>
                <button 
                  onClick={() => onNavigate('ASSISTANT')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-1 px-3 rounded shadow text-xs flex items-center"
                >
                    CONSULTAR
                </button>
             </div>

             <div className="bg-gray-800/20 rounded border border-gray-700/20 p-3 flex flex-col gap-2">
                <h4 className="text-[11px] font-semibold text-gray-500 uppercase">Almacén Crítico</h4>
                <div className="space-y-2">
                    {ingredients.slice(0, 3).map(ing => (
                        <div key={ing.id} className="space-y-1">
                            <div className="flex justify-between text-[11px]">
                                <span className="text-gray-300">{ing.name}</span>
                                <span className="text-gray-500 font-mono">{ing.stock.toLocaleString()} kg</span>
                            </div>
                            <div className="h-0.5 bg-gray-900 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500/50" style={{width: `${Math.min(100, (ing.stock / 50000) * 100)}%`}}></div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
          </div>

      </div>

    </div>
  );
};
