import React, { useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { FormulationResult, Product, User, Ingredient, Nutrient, ProductConstraint } from '../types';
import { analyzeFormulaWithGemini } from '../services/geminiService';
import { useTranslations } from '../lib/i18n/LangContext';
import { AIIcon, PrintIcon, TruckIcon, XCircleIcon, DownloadIcon, RatiosIcon, SparklesIcon } from './icons';

interface OptimizationResultsProps {
  result: FormulationResult;
  product: Product;
  user: User;
  onClose: () => void;
  onUpgradeRequest: () => void;
  onProduce: () => void;
  onReoptimize?: (newConstraints: ProductConstraint[]) => void;
  ingredients: Ingredient[];
  nutrients: Nutrient[];
}

const LoadingSpinner: React.FC = () => (
    <div className="flex justify-center items-center space-x-2">
        <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse"></div>
        <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse delay-200"></div>
        <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse delay-400"></div>
    </div>
);

export const OptimizationResults: React.FC<OptimizationResultsProps> = ({ result, product, user, onClose, onUpgradeRequest, onProduce, onReoptimize, ingredients, nutrients }) => {
  const { t, language } = useTranslations();
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [localConstraints, setLocalConstraints] = useState(product.constraints);
  const [hasEdits, setHasEdits] = useState(false);

  const handleConstraintChange = (nutrientId: string, field: 'min' | 'max', value: string) => {
      const numValue = value === '' ? 0 : parseFloat(value);
      setLocalConstraints(prev => prev.map(c => 
          c.nutrientId === nutrientId ? { ...c, [field]: numValue } : c
      ));
      setHasEdits(true);
  };

  const handleReoptimizeClick = () => {
      if (onReoptimize) {
          onReoptimize(localConstraints);
          setHasEdits(false);
      }
  };

  const handleAnalyze = useCallback(async () => {
    if (user.subscription !== 'pro') {
        onUpgradeRequest();
        return;
    }
    setIsLoading(true);
    try {
        const analysis = await analyzeFormulaWithGemini(result, product, language);
        setAiAnalysis(analysis);
    } catch (e) {
        console.error(e);
        setAiAnalysis(t('common.analyzing') + " error.");
    } finally {
        setIsLoading(false);
    }
  }, [result, product, user, onUpgradeRequest, language, t]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    
    // Titulos
    doc.setFontSize(16);
    doc.text(`REPORTE DE PRODUCCION`, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`DIETA: ${product.name}`, pageWidth / 2, 22, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}  |  Costo Total: $${result.totalCost.toFixed(2)} USD`, pageWidth / 2, 28, { align: 'center' });

    // Tabla 1: Insumos Aprobados
    const tableData = result.items.map(item => {
        const ing = ingredients.find(i => i.id === item.ingredientId);
        return [
            ing?.name || 'Insumo Eliminado',
            item.percentage.toFixed(3) + ' %',
            item.weight.toFixed(3) + ' kg',
            '$ ' + item.cost.toFixed(3)
        ];
    });

    const totalWeight = result.items.reduce((sum, item) => sum + item.weight, 0);
    tableData.push(['TOTAL MEZCLA', '100.000 %', totalWeight.toFixed(3) + ' kg', '$ ' + result.totalCost.toFixed(2)]);

    autoTable(doc, {
        startY: 35,
        head: [['Insumo', 'Inclusion (%)', 'Peso (kg)', 'Costo Parcial (USD)']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [6, 182, 212], textColor: [255, 255, 255] },
        footStyles: { fillColor: [30, 41, 59] },
        styles: { fontSize: 8 },
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // Tabla 2: Sensibilidad / Shadow Pricing
    if (result.rejectedItems && result.rejectedItems.length > 0) {
        doc.setFontSize(10);
        doc.text(`Sugerencias de Compra (Insumos Rechazados por Precio):`, 14, finalY);
        
        const rejectedData = result.rejectedItems.map(rej => {
            const ing = ingredients.find(i => i.id === rej.ingredientId);
            return [
                ing?.name || 'N/A',
                `$ ${rej.effectivePrice.toFixed(3)}`,
                `$ ${rej.opportunityPrice.toFixed(3)}`,
                `-$ ${rej.viabilityGap.toFixed(3)}`
            ];
        });

        autoTable(doc, {
            startY: finalY + 4,
            head: [['Insumo', 'P. Efectivo', 'P. Oportunidad Necesario', 'Brecha a Cubrir']],
            body: rejectedData,
            theme: 'grid',
            headStyles: { fillColor: [245, 158, 11] },
            styles: { fontSize: 8 }
        });
        finalY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Tabla 3: Matriz Nutricional
    doc.setFontSize(10);
    doc.text(`Matriz Nutricional Lograda:`, 14, finalY);
    
    const nutData = result.nutrientAnalysis.map(na => {
        const nut = nutrients.find(n => n.id === na.nutrientId);
        return [
            nut?.name || 'N/A',
            na.value.toFixed(4) + ' ' + (nut?.unit || ''),
            na.min > 0 ? na.min.toFixed(4) : '-',
            na.max < 999 ? na.max.toFixed(4) : '-',
            na.met ? 'CUMPLE' : (na.value < na.min ? 'DEFICIT' : 'EXCESO')
        ];
    });

    autoTable(doc, {
        startY: finalY + 4,
        head: [['Nutriente', 'Aporte Alcanzado', 'Min Req', 'Max Req', 'Situacion']],
        body: nutData,
        theme: 'grid',
        headStyles: { fillColor: [55, 65, 81] },
        styles: { fontSize: 8 }
    });

    doc.save(`Receta_${product.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`);
  };

    const handleExportCSV = () => {
    let csvContent = "\uFEFF"; 
    csvContent += `FEEDPRO - ${t('nav.dashboard').toUpperCase()}\n`;
    csvContent += `${t('common.diet')}:,${product.name}\n`;
    csvContent += `${t('common.date')}:,${new Date().toLocaleDateString()}\n`;
    csvContent += `${t('common.price')} Total:,${result.totalCost.toFixed(2)} USD\n\n`;

    csvContent += `--- FICHA DE INSUMOS ---\n`;
    csvContent += `${t('common.name').toUpperCase()},INCLUSION(%),PESO(KG),PRECIO(USD/KG),COSTO_PARCIAL(USD),PRECIO_SOMBRA(USD)\n`;
    
    let totalBatchSize = 0;
    
    result.items.forEach(item => {
        const ing = ingredients.find(i => i.id === item.ingredientId);
        totalBatchSize += item.weight;
        csvContent += `"${ing?.name || 'Insumo Eliminado'}",${item.percentage.toFixed(3)}%,${item.weight.toFixed(3)},${ing?.price?.toFixed(3) || 'N/A'},${item.cost.toFixed(3)},${item.shadowPrice !== undefined ? item.shadowPrice.toFixed(4) : 'N/A'}\n`;
    });
    
    csvContent += `\nTOTAL MEZCLA,,100.00%,${totalBatchSize.toFixed(2)},,${result.totalCost.toFixed(3)}\n\n`;

    if (result.rejectedItems && result.rejectedItems.length > 0) {
        csvContent += `\n--- ANALISIS DE SENSIBILIDAD (INSUMOS EXCLUIDOS) ---\n`;
        csvContent += `NOMBRE,PRECIO_EFECTIVO(USD/KG),PRECIO_OPORTUNIDAD(USD/KG),BRECHA_VIABILIDAD(USD)\n`;
        result.rejectedItems.forEach(rej => {
            const ing = ingredients.find(i => i.id === rej.ingredientId);
            csvContent += `"${ing?.name || 'N/A'}",${rej.effectivePrice.toFixed(4)},${rej.opportunityPrice.toFixed(4)},-${rej.viabilityGap.toFixed(4)}\n`;
        });
        csvContent += `\n`;
    }

    csvContent += `--- MATRIZ NUTRICIONAL FINAL ---\n`;
    csvContent += `${t('common.name').toUpperCase()},APORTE_FINAL,MIN_REQ,MAX_REQ,UNIDAD,ESTADO\n`;
    result.nutrientAnalysis.forEach(na => {
        const nut = nutrients.find(n => n.id === na.nutrientId);
        const stausText = na.met ? 'CUMPLE RANGO' : (na.value < na.min ? 'DEFICIT' : 'EXCESO');
        csvContent += `"${nut?.name || 'N/A'}",${na.value.toFixed(4)},${na.min.toFixed(4)},${na.max === 999 ? 'ILIMITADO' : na.max.toFixed(4)},${nut?.unit || ''},${stausText}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Formula_${product.name}_${new Date().toISOString().slice(0,10)}.csv`);
    link.click();
  };

  const formattedTotalCost = result.totalCost.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

  return (
    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in">
      <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-gray-900/40">
          <div className="flex items-center gap-3">
             <div className="bg-cyan-900/50 p-2 rounded-lg"><AIIcon className="text-cyan-400 w-6 h-6"/></div>
             <h2 className="text-xl font-bold text-white">{t('optimization.consoleTitle')}: <span className="text-cyan-400">{product.name}</span></h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white">
            <XCircleIcon className="w-8 h-8" />
          </button>
        </div>

        <div id="pdf-content" className="p-3 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 custom-scrollbar bg-gray-900/20">
          <div className="lg:col-span-5 space-y-3">
            <div className="bg-gradient-to-br from-gray-800 to-gray-950 p-3 rounded border border-gray-700 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 bg-cyan-500/5 rounded-full -mr-10 -mt-10 blur-2xl group-hover:bg-cyan-500/10 transition-colors"></div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1">{t('common.price')} Total {t('optimization.batchSize')}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="font-black text-4xl text-white drop-shadow-sm">{formattedTotalCost}</h3>
                    <span className="text-gray-500 text-sm font-mono tracking-tighter">USD</span>
                </div>
                {result.previousCost && (
                    <div className="mt-2 pt-2 border-t border-gray-700/50 flex justify-between items-center">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">{t('dashboard.lastOptimization')}:</span>
                        <span className={`text-xs font-mono font-bold ${result.totalCost < result.previousCost ? 'text-green-400' : result.totalCost > result.previousCost ? 'text-red-400' : 'text-gray-400'}`}>
                            {result.totalCost < result.previousCost ? '▼' : result.totalCost > result.previousCost ? '▲' : ''} ${result.previousCost.toFixed(2)}
                        </span>
                    </div>
                )}
            </div>

            <div className="bg-gray-800/40 rounded-xl border border-gray-700 flex flex-col overflow-hidden">
                <div className="p-3 bg-gray-800 border-b border-gray-700 flex justify-between items-center">
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">{t('optimization.suppliesAvailability')}</h3>
                    <span className="text-[10px] bg-cyan-900 text-cyan-300 px-2 py-0.5 rounded-full font-bold">{result.items.length} Componentes</span>
                </div>
                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-950/50 text-gray-500 text-[10px] uppercase">
                            <tr>
                                <th className="text-left py-2 px-4">{t('common.name')}</th>
                                <th className="text-right py-2 px-4">%</th>
                                <th className="text-right py-2 px-4">kg</th>
                                <th className="text-right py-2 px-4" title="Shadow Price">Shadow</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700/30">
                            {result.items.map(f => {
                                const ing = ingredients.find(i => i.id === f.ingredientId);
                                return (
                                    <tr key={f.ingredientId} className="hover:bg-cyan-400/5 transition-colors">
                                        <td className="py-2.5 px-4 font-medium text-gray-200">{ing?.name || 'Unknown'}</td>
                                        <td className="text-right py-2.5 px-4 font-mono text-cyan-400 font-bold">{f.percentage.toFixed(3)}%</td>
                                        <td className="text-right py-2.5 px-4 font-mono text-gray-400">{f.weight.toFixed(2)}</td>
                                        <td className="text-right py-2.5 px-4 font-mono text-[10px] text-gray-500">{f.shadowPrice !== undefined ? `$${f.shadowPrice.toFixed(2)}` : '--'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* --- ANALISIS DE SENSIBILIDAD (REJECTED ITEMS) --- */}
                {result.rejectedItems && result.rejectedItems.length > 0 && (
                    <div className="mt-4 border-t border-gray-700 pt-3 flex flex-col min-h-0">
                        <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-widest px-4 mb-2 flex items-center gap-1.5">
                            <SparklesIcon className="w-3 h-3" /> Costos Absolutos
                        </h3>
                        <div className="overflow-x-auto flex-1 custom-scrollbar">
                            <table className="w-full text-xs">
                                <thead className="text-gray-500 uppercase font-black tracking-wider text-[9px] bg-gray-900/50 border-y border-gray-700/50">
                                    <tr>
                                        <th className="text-left py-1.5 px-4 font-bold">{t('common.name')}</th>
                                        <th className="text-right py-1.5 px-3 font-bold">Precio Efectivo</th>
                                        <th className="text-right py-1.5 px-3 font-bold text-orange-400">Precio Oportunidad</th>
                                        <th className="text-right py-1.5 px-4 font-bold">Diferencia</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50 text-[11px]">
                                    {result.rejectedItems.slice(0, 5).map(rej => {
                                        const ing = ingredients.find(i => i.id === rej.ingredientId);
                                        return (
                                            <tr key={rej.ingredientId} className="hover:bg-orange-500/5 transition-colors">
                                                <td className="py-1.5 px-4 font-medium text-gray-400 truncate max-w-[150px]">{ing?.name || 'Unknown'}</td>
                                                <td className="text-right py-1.5 px-3 font-mono text-gray-500">${rej.effectivePrice.toFixed(2)}</td>
                                                <td className="text-right py-1.5 px-3 font-mono text-orange-400 font-bold">${rej.opportunityPrice.toFixed(2)}</td>
                                                <td className="text-right py-1.5 px-4 font-mono text-red-500/70">-${rej.viabilityGap.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {result.rejectedItems.length > 5 && (
                                <p className="text-center text-[9px] text-gray-600 mt-1 uppercase font-bold italic">Mostrando top 5 más ceranos</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
          </div>

          <div className="lg:col-span-4 space-y-3">
             <div className="bg-gray-800/40 rounded-xl border border-gray-700 flex flex-col h-full overflow-hidden">
                <div className="p-3 bg-gray-800 border-b border-gray-700">
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">{t('results.finalComposition')}</h3>
                </div>
                <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1 max-h-[500px]">
                    <div className="space-y-1">
                        <div className="flex justify-between items-center mb-2">
                             <p className="text-[10px] text-gray-500 uppercase font-bold">{t('nav.nutrients')}</p>
                             {hasEdits && onReoptimize && (
                                 <button onClick={handleReoptimizeClick} className="bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold py-1 px-3 rounded shadow animate-pulse">
                                     {t('nav.formulation')}
                                 </button>
                             )}
                        </div>
                        {result.nutrientAnalysis.filter(n => n.value > 0 || n.min > 0).map(c => {
                             const nut = nutrients.find(n => n.id === c.nutrientId);
                             const localC = localConstraints.find(lc => lc.nutrientId === c.nutrientId);
                             const minVal = localC ? localC.min : c.min;
                             const maxVal = localC ? localC.max : c.max;
                             
                             return (
                                <div key={c.nutrientId} className="flex flex-col gap-1.5 p-2.5 rounded bg-gray-800/30 hover:bg-gray-700/50 transition-colors border border-transparent hover:border-gray-600">
                                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                                        <div className="flex flex-col">
                                            <span className="text-gray-300 font-bold text-xs">{nut?.name}</span>
                                            {c.shadowPrice !== undefined && c.shadowPrice !== 0 && (
                                                <span className="text-[9px] text-orange-400 font-bold">Shadow: ${c.shadowPrice.toFixed(4)}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1 bg-gray-900 rounded p-0.5 border border-gray-700 focus-within:border-cyan-500">
                                                <span className="text-[9px] text-gray-500 pl-1 uppercase font-bold">{t('common.min')}</span>
                                                <input type="number" 
                                                    value={minVal || ''} 
                                                    onChange={e => handleConstraintChange(c.nutrientId, 'min', e.target.value)}
                                                    className="bg-transparent text-[11px] text-gray-300 w-12 text-center outline-none" 
                                                />
                                            </div>
                                            <div className="flex items-center gap-1 bg-gray-900 rounded p-0.5 border border-gray-700 focus-within:border-cyan-500">
                                                <span className="text-[9px] text-gray-500 pl-1 uppercase font-bold">{t('common.max')}</span>
                                                <input type="number" 
                                                    value={maxVal < 999 ? maxVal : ''} 
                                                    onChange={e => handleConstraintChange(c.nutrientId, 'max', e.target.value)}
                                                    className="bg-transparent text-[11px] text-gray-300 w-12 text-center outline-none" 
                                                />
                                            </div>
                                            <span className={`font-mono font-bold text-sm ml-2 ${c.met ? 'text-green-400' : 'text-red-400'}`}>{c.value.toFixed(3)} <span className="text-[10px] text-gray-600 font-normal">{nut?.unit}</span></span>
                                        </div>
                                    </div>
                                    <div className="h-1.5 bg-gray-900 rounded-full overflow-hidden flex relative mt-1">
                                         {minVal > 0 && <div className="absolute top-0 bottom-0 left-0 border-r-2 border-red-500/50" style={{width: `${Math.min(100, (minVal / (maxVal < 999 ? maxVal : Math.max(minVal * 2, c.value * 2))) * 100)}%`}}></div>}
                                         <div className={`h-full ${c.met ? 'bg-green-500' : 'bg-red-500'}`} style={{width: `${Math.min(100, (c.value / (maxVal < 999 ? maxVal : Math.max(minVal * 2, c.value * 2, 100))) * 100)}%`}}></div>
                                    </div>
                                </div>
                             );
                        })}
                    </div>

                    {result.relationshipAnalysis.length > 0 && (
                        <div className="space-y-1 pt-4 border-t border-gray-700">
                            <p className="text-[10px] text-yellow-500 uppercase font-bold mb-2 flex items-center gap-1.5"><RatiosIcon className="w-3 h-3" /> {t('products.ratiosTitle')}</p>
                            {result.relationshipAnalysis.map(r => (
                                <div key={r.relationId} className="flex justify-between items-center p-2 rounded bg-yellow-900/5 hover:bg-yellow-900/10 transition-colors border-l-2 border-yellow-600/30">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] text-gray-300 font-bold">{r.name}</span>
                                        <span className="text-[9px] text-gray-500">Lim: {r.min.toFixed(2)} - {r.max.toFixed(2)}</span>
                                    </div>
                                    <span className={`font-mono font-black ${r.met ? 'text-yellow-400' : 'text-red-400'}`}>{r.value.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
             </div>
          </div>

          <div className="lg:col-span-3 space-y-3">
            <div className="bg-gray-800/40 rounded border border-gray-700 flex flex-col h-full">
                <div className="p-2 bg-gray-800 border-b border-gray-700 shrink-0">
                    <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">{t('common.analyzing')}</h3>
                </div>
                <div className="p-3 overflow-y-auto custom-scrollbar flex-1 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="bg-indigo-900/20 p-4 rounded-full"><AIIcon className="w-6 h-6 text-indigo-500/50"/></div>
                    {aiAnalysis ? (
                        <div className="text-xs text-gray-300 text-left whitespace-pre-wrap">{aiAnalysis}</div>
                    ) : (
                        <>
                            <p className="text-xs text-gray-400">{t('assistant.welcomeMessage')}</p>
                            <div className="pt-2 w-full border-t border-gray-700/50">
                                <button onClick={handleAnalyze} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-1.5 px-4 rounded shadow transition-all transform hover:scale-105 disabled:opacity-50">
                                    {isLoading ? <LoadingSpinner /> : t('assistant.sendButton')}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="bg-gray-800/20 rounded border border-gray-700/50 p-2 shrink-0">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{t('common.actions')}</h3>
                <div className="flex flex-col gap-2">
                <button onClick={handleExportPDF} className="bg-gray-700 hover:bg-gray-600 text-white text-[13px] font-bold py-1.5 px-4 rounded border border-gray-600 flex items-center gap-2 transition-all"><PrintIcon className="w-4 h-4"/> PDF</button>
                <button onClick={handleExportCSV} className="bg-gray-700 hover:bg-gray-600 text-white text-[13px] font-bold py-1.5 px-4 rounded border border-gray-600 flex items-center gap-2 transition-all"><DownloadIcon className="w-4 h-4"/> EXCEL (CSV)</button>
                <button onClick={onProduce} className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white text-[13px] font-bold py-1.5 px-4 rounded flex items-center justify-center gap-1 shadow-sm transition-all transform hover:scale-[1.02] uppercase tracking-widest">{t('common.confirm')}</button>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
