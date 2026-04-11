import React from 'react';
import { Product, Ingredient, SavedFormula, Client, ViewState, User } from '../types';
import { useTranslations } from '../lib/i18n/LangContext';
import { TruckIcon, StarIcon, TrendingUpIcon, ShoppingCartIcon, ClockIcon, ArrowRightIcon, AIIcon, ProductsIcon, IngredientsIcon, FormulateIcon, NutrientsIcon, DatabaseIcon, FlaskIcon, CalculatorIcon } from './icons';
import { APP_NAME, APP_VERSION } from '../constants';
import { InsumosAnalyticsModal } from './InsumosAnalyticsModal';
import { DietStructureModal } from './DietStructureModal';
import { FormulationHistoryModal } from './FormulationHistoryModal';

interface DashboardProps {
  products: Product[];
  ingredients: Ingredient[];
  savedFormulas: SavedFormula[];
  clients: Client[];
  onNavigate: (view: ViewState) => void;
  isDynamicMatrix: boolean;
  setIsDynamicMatrix: (val: boolean) => void;
  user?: User | null;
}

export const Dashboard: React.FC<DashboardProps> = ({ products, ingredients, savedFormulas, clients, onNavigate, isDynamicMatrix, setIsDynamicMatrix, user }) => {
  const { t } = useTranslations();
  const [showInsumosBI, setShowInsumosBI] = React.useState(false);
  const [showDietBI, setShowDietBI] = React.useState(false);
  const [showHistoryBI, setShowHistoryBI] = React.useState(false);

  const lastOp = savedFormulas.length > 0 ? new Date(savedFormulas[savedFormulas.length - 1].date).toLocaleDateString() : 'N/A';

  const stats = [
    { label: t('dashboard.availableIngredients'), value: ingredients.length, img: '/icons/ingredient.png', color: 'text-green-400', bg: 'bg-green-900/20', showDate: false },
    { label: t('dashboard.definedProducts'), value: products.length, img: '/icons/products.png', color: 'text-indigo-400', bg: 'bg-indigo-900/20', showDate: false },
    { label: t('dashboard.madeOptimizations'), value: savedFormulas.length, img: '/icons/formulation.png', color: 'text-cyan-400', bg: 'bg-cyan-900/20', showDate: true },
  ];

  return (
    <div className="p-3 space-y-3 animate-fade-in w-full">
      
      {/* Hero Welcome (Compact) */}
      <div className="relative bg-gradient-to-br from-cyan-900/40 to-indigo-900/40 rounded-xl p-3 border border-cyan-500/20 overflow-hidden shadow-sm">
        <div className="absolute top-0 right-0 p-8 bg-white/5 rounded-full -mr-12 -mt-12 blur-3xl opacity-30"></div>
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="space-y-1 max-w-xl">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-[10px] uppercase tracking-wider">
              <StarIcon className="w-3 h-3"/> {APP_NAME} {APP_VERSION}
            </div>
            <h1 className="text-2xl font-black text-white leading-tight">{t('dashboard.title')}</h1>
            <p className="text-gray-100 font-bold text-[14px] leading-snug">{t('dashboard.subtitle')}</p>
            
            {user?.trialEndsAt && user.trialEndsAt < (Date.now() + 1000 * 365 * 24 * 60 * 60 * 1.5) && (
                (() => {
                    const days = Math.ceil((user.trialEndsAt - Date.now()) / (1000 * 60 * 60 * 24));
                    const isProfessional = user.name.includes('Profesional');
                    const label = isProfessional ? t('dashboard.licenseProfessional') : t('dashboard.licenseTrial');
                    const isClosing = days <= 30;
                    
                    return (
                        <div className={`mt-2 inline-flex items-center gap-2 border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter transition-all ${isClosing ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500 animate-pulse' : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'}`}>
                           <ClockIcon className="w-3 h-3"/> 
                           {label}: {t('dashboard.daysRemaining').replace('{{days}}', Math.max(0, days).toString())} {isClosing && t('dashboard.renewSoon')}
                        </div>
                    );
                })()
            )}
          </div>
          <div className="flex gap-2 shrink-0">
             <button onClick={() => onNavigate('SETTINGS')} className="bg-gray-800 hover:bg-gray-700 text-white font-bold px-4 py-1.5 rounded flex items-center gap-2 transition-all border border-gray-700 text-[13px]">
                <img src="/icons/settings.png" className="w-4 h-4 object-contain brightness-0 invert opacity-90" alt="Icono" /> {t('nav.settings').toUpperCase()}
             </button>
             <button 
                onClick={() => {
                    if (window.confirm(t('dashboard.confirmLogout'))) {
                        onNavigate('DASHBOARD'); // Safe fallback
                        (window as any).dispatchEvent(new CustomEvent('feedpro:logout'));
                    }
                }} 
                className="bg-red-600/20 hover:bg-red-600/40 text-red-500 font-bold px-4 py-1.5 rounded border border-red-500/30 flex items-center gap-2 transition-all text-[13px]"
             >
                <img src="/icons/clients.png" className="w-4 h-4 object-contain brightness-0 invert opacity-90" alt="Icono" /> {t('nav.exit').toUpperCase()}
             </button>
          </div>
        </div>
      </div>

      {/* Precision Matrix Toggle */}
      <div className={`border py-2 px-3 rounded flex items-center justify-between shadow-sm transition-colors ${isDynamicMatrix ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-gray-800/40 border-gray-700/50'}`}>
          <div className="flex items-center gap-2">
              <DatabaseIcon className={isDynamicMatrix ? "text-cyan-400 w-4 h-4" : "text-gray-500 w-4 h-4"} />
              <div>
                  <h3 className="text-[14px] font-black text-white leading-none">
                      {isDynamicMatrix ? t('dashboard.dynamicMatrixActive') : t('dashboard.dynamicMatrixStandard')}
                  </h3>
                  <p className="text-[12px] text-gray-300 font-bold mt-0.5 leading-none">
                      {t('dashboard.dynamicMatrixDesc')}
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
      <div className="grid grid-cols-4 gap-3">
          {stats.map((stat, i) => {
             const isClickableInsumos = stat.label === t('dashboard.availableIngredients');
             const isClickableDietas = stat.label === t('dashboard.definedProducts');
             const isClickableHistory = stat.label === t('dashboard.madeOptimizations');
             const isClickable = isClickableInsumos || isClickableDietas || isClickableHistory;

             const handleClick = () => {
                 if (isClickableInsumos) setShowInsumosBI(true);
                 if (isClickableDietas) setShowDietBI(true);
                 if (isClickableHistory) setShowHistoryBI(true);
             };

             return (
                 <div 
                     key={i} 
                     onClick={handleClick}
                     className={`bg-gray-800 border border-gray-700 p-3 rounded-xl flex items-center justify-between shadow-lg transition-all
                         ${isClickable ? `cursor-pointer hover:-translate-y-1 hover:border-${stat.color.split('-')[1]}-500/50 hover:shadow-${stat.color.split('-')[1]}-900/40` : 'hover:border-gray-500/50'}
                     `}
                 >
                    <div className="space-y-1 relative z-10 w-full">
                        <p className="text-[11px] text-white font-black uppercase tracking-wider truncate">{stat.label}</p>
                        <div className="flex items-end gap-3">
                            <p className="text-2xl font-black text-white leading-none">{stat.value}</p>
                            {stat.showDate && (
                                <p className="text-[9px] text-cyan-400 font-bold uppercase mb-0.5">{t('dashboard.lastOptimization')}: {lastOp}</p>
                            )}
                        </div>
                    </div>
                    <div className={`${stat.bg} p-2 rounded-lg transition-transform relative z-10 shrink-0 ml-1`}>
                        <img src={stat.img} className={`w-6 h-6 object-contain filter brightness-0 invert opacity-60`} alt={stat.label}/>
                    </div>
                 </div>
             );
          })}

          {/* VetIA - Asistente Nutricional - Refined Integration */}
          <div 
              onClick={() => onNavigate('ASSISTANT')}
              className="bg-gradient-to-br from-indigo-900 to-purple-900 border border-purple-500/30 p-3.5 rounded-xl flex items-center justify-center shadow-lg shadow-purple-950/40 hover:-translate-y-1 hover:shadow-purple-800/50 hover:border-purple-400/50 transition-all duration-300 overflow-hidden relative group cursor-pointer"
          >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(168,85,247,0.1)_0%,_transparent_70%)] animate-pulse"></div>
              
              <div className="flex items-center gap-4 relative z-10">
                  <div className="relative flex-shrink-0">
                      <div className="absolute -inset-2 bg-white/10 blur-xl rounded-full animate-pulse"></div>
                      <img 
                        src="/icons/ai_assistant.png" 
                        className="w-16 h-16 object-contain filter brightness-0 invert relative z-20 group-hover:scale-105 transition-transform duration-500 drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" 
                        alt="VetIA" 
                      />
                  </div>
                  <div className="flex flex-col">
                      <h3 className="text-xl font-black text-white tracking-tight leading-none italic">VetIA</h3>
                      <p className="text-purple-200/60 text-[10px] font-bold uppercase tracking-widest mt-1">Asistente Nutricional</p>
                  </div>
              </div>
          </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          
          {/* Recent Formulations (Compact) */}
          <div className="lg:col-span-8 bg-gray-800/30 rounded border border-gray-700/30 overflow-hidden flex flex-col shadow-sm">
             <div className="px-3 py-1.5 border-b border-gray-700/30 flex justify-between items-center bg-gray-900/10">
                <h3 className="text-[13px] font-bold text-white flex items-center gap-1.5"><ClockIcon className="text-cyan-400 w-3 h-3"/> {t('dashboard.recentFormulations')}</h3>
                <button onClick={() => onNavigate('SIMULATION')} className="text-[10px] text-cyan-400 hover:underline uppercase">{t('dashboard.history')}</button>
             </div>
             <div className="p-0 flex-1">
                {savedFormulas.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-gray-600">
                        <CalculatorIcon className="w-8 h-8 mb-2 opacity-10"/>
                        <p className="text-[11px] font-medium uppercase text-center">{t('dashboard.noRecentRecords')}</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-950/20 text-[10px] uppercase font-semibold text-gray-500">
                                <tr>
                                    <th className="px-4 py-2 font-black text-white">{t('common.diet').toUpperCase()}</th>
                                    <th className="px-4 py-2 font-black text-white">{t('common.date')}</th>
                                    <th className="px-4 py-2 font-black text-white text-right">{t('common.price')} / kg</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/20">
                                {savedFormulas.slice(-5).map(f => (
                                    <tr key={f.id} className="hover:bg-gray-700/30 transition-colors h-[40px] border-b border-gray-800/50">
                                        <td className="px-4 py-2 text-[14px] font-bold text-white">{f.name}</td>
                                        <td className="px-4 py-2 text-[12px] text-gray-200 font-black font-mono">{new Date(f.date).toLocaleDateString()}</td>
                                        <td className="px-4 py-2 text-right font-mono text-emerald-400 font-black text-[15px]">${(f.result.totalCost / 1000).toFixed(4)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
             </div>
          </div>

          <div className="lg:col-span-4 space-y-3 h-full">
             <div className="bg-gray-800/20 rounded border border-gray-700/20 p-3 flex flex-col gap-2 h-full">
                <h4 className="text-[11px] font-semibold text-gray-500 uppercase">{t('dashboard.criticalStock')}</h4>
                <div className="space-y-2">
                    {ingredients.slice(0, 3).map(ing => (
                        <div key={ing.id} className="space-y-1 py-1">
                            <div className="flex justify-between text-[12px] font-bold">
                                <span className="text-white">{ing.name}</span>
                                <span className="text-emerald-400 font-black font-mono">{ing.stock.toLocaleString()} kg</span>
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

      {/* Global Modals for Dashboards */}
      {showInsumosBI && <InsumosAnalyticsModal onClose={() => setShowInsumosBI(false)} />}
      {showDietBI && <DietStructureModal onClose={() => setShowDietBI(false)} />}
      {showHistoryBI && <FormulationHistoryModal onClose={() => setShowHistoryBI(false)} />}
    </div>
  );
};
