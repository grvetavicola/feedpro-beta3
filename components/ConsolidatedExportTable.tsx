import React, { useRef, useState } from 'react';
import { DownloadIcon, EyeIcon, SearchIcon } from './icons';

interface Props {
  activeDiets: any[];
  results: Record<string, any>;
  activeRows: any[];
  batchSizes: Record<string, number>;
}

export const ConsolidatedExportTable: React.FC<Props> = ({
  activeDiets,
  results,
  activeRows,
  batchSizes
}) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const downloadExcel = () => {
    if (!tableRef.current) return;
    
    const tableHTML = tableRef.current.outerHTML;
    const fileName = `FeedPro_Export_${new Date().toISOString().split('T')[0]}.xls`;
    
    // Excel-compatible HTML wrapper
    const template = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Reporte Consolidado</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
      <body>${tableHTML}</body>
      </html>
    `;

    const blob = new Blob([template], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activeIngs = activeRows.filter(r => r.type === 'ing');
  const activeNuts = activeRows.filter(r => r.type === 'nut');

  const tdStyle = { border: '1px solid #000', padding: '5px', textAlign: 'left' as const, fontSize: '11px', color: 'black' };
  const thStyle = { ...tdStyle, backgroundColor: '#e2e2e2', fontWeight: 'bold' as const };
  const headerStyle = { ...thStyle, backgroundColor: '#c0c0c0', textAlign: 'center' as const };
  const subHeaderStyle = { ...tdStyle, backgroundColor: '#f0f0f0', textAlign: 'center' as const, fontSize: '10px', fontWeight: 'bold' as const };

  return (
    <div className="mt-20 mb-32 p-10 bg-[#0a0a0a]/80 backdrop-blur-xl border border-slate-800 rounded-[3rem] shadow-2xl mx-auto max-w-[98%] ring-1 ring-white/5">
      <div className="flex items-center justify-between mb-8 border-b-2 border-slate-200 pb-6">
        <div>
          <h2 className="text-3xl font-black uppercase text-white font-serif tracking-tight">Reporte de Formulación Grupal</h2>
          <p className="text-sm text-slate-400 mt-1 uppercase tracking-tighter">Versión para Exportación Directa a Excel (Planilla Plana v3.0)</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-3 px-8 py-5 font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl border-b-4 ${showPreview ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-900' : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-400'}`}
          >
            <EyeIcon className="w-5 h-5" />
            {showPreview ? 'Cerrar Vista' : 'Vista Previa'}
          </button>
          
            <button 
            onClick={downloadExcel}
            className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-5 font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl border-b-4 border-emerald-900"
          >
            <DownloadIcon className="w-6 h-6" />
            Descargar Excel (.XLS)
          </button>
        </div>
      </div>

      {!showPreview && (
        <div className="py-20 text-center flex flex-col items-center opacity-70 bg-black/40 border-2 border-dashed border-slate-700/50 rounded-[2rem] backdrop-blur-sm shadow-2xl">
           <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20">
             <SearchIcon className="w-8 h-8 text-indigo-400" />
           </div>
           <p className="text-sm font-black text-indigo-300 uppercase tracking-[0.2em] mb-2 font-mono">Vista Previa Desactivada</p>
           <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest max-w-sm leading-relaxed">Presione el botón de vista previa para generar la planilla de exportación antes de la descarga</p>
        </div>
      )}

      {showPreview && (
        <div className="overflow-auto border-2 border-slate-700/50 p-6 bg-white rounded-[2rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] animate-fade-in ring-1 ring-white/10">
        <table ref={tableRef} style={{ borderCollapse: 'collapse', width: '100%', color: 'black', backgroundColor: 'white', fontFamily: 'Calibri, Arial, sans-serif' }}>
          <thead>
            <tr>
              <th rowSpan={2} style={headerStyle}>Ingrediente / Insumo</th>
              <th rowSpan={2} style={headerStyle}>$/kg</th>
              {activeDiets.map(diet => (
                <th key={diet.id} colSpan={2} style={headerStyle}>{diet.name.toUpperCase()}</th>
              ))}
            </tr>
            <tr>
              {activeDiets.map(diet => (
                <React.Fragment key={`sub-${diet.id}`}>
                  <th style={subHeaderStyle}>% INCLUSIÓN</th>
                  <th style={subHeaderStyle}>KILOS</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* BLOQUE Insumos */}
            {activeIngs.map(ing => (
              <tr key={ing.id}>
                <td style={{ ...tdStyle, fontWeight: 'bold' }}>{ing.name}</td>
                <td style={tdStyle}>{ing.price?.toFixed(2)}</td>
                {activeDiets.map(diet => {
                  const percent = results[diet.id]?.formula[ing.id] || 0;
                  const kilos = (percent / 100) * (batchSizes[diet.id] || 1000);
                  return (
                    <React.Fragment key={diet.id}>
                      <td style={{ ...tdStyle, textAlign: 'right', backgroundColor: '#fff9e6' }}>{percent.toFixed(2)}%</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>{kilos.toFixed(2)}</td>
                    </React.Fragment>
                  );
                })}
              </tr>
            ))}

            {/* Fila Totales */}
            <tr style={{ backgroundColor: '#eeeeee' }}>
              <td style={{ ...thStyle }}>TOTALES</td>
              <td style={tdStyle}>-</td>
              {activeDiets.map(diet => {
                const totalKg = batchSizes[diet.id] || 1000;
                return (
                  <React.Fragment key={diet.id}>
                    <td style={{ ...thStyle, textAlign: 'right' }}>100.00%</td>
                    <td style={{ ...thStyle, textAlign: 'right' }}>{totalKg.toFixed(2)}</td>
                  </React.Fragment>
                );
              })}
            </tr>

            <tr style={{ backgroundColor: '#fff' }}>
              <td style={{ ...thStyle }}>VALOR FÓRMULA (COSTO TOTAL)</td>
              <td style={tdStyle}>-</td>
              {activeDiets.map(diet => {
                const totalCost = activeIngs.reduce((sum, ing) => {
                  const percent = results[diet.id]?.formula[ing.id] || 0;
                  const kilos = (percent / 100) * (batchSizes[diet.id] || 1000);
                  return sum + (kilos * (ing.price || 0));
                }, 0);
                return <td key={diet.id} colSpan={2} style={{ ...thStyle, textAlign: 'center', color: '#cc0000', fontSize: '14px' }}>${totalCost.toFixed(2)}</td>;
              })}
            </tr>

            <tr style={{ backgroundColor: '#f9f9f9' }}>
              <td style={{ ...thStyle }}>COSTO POR KG</td>
              <td style={tdStyle}>-</td>
              {activeDiets.map(diet => {
                const cost = results[diet.id]?.costPerKg || 0;
                return <td key={diet.id} colSpan={2} style={{ ...thStyle, textAlign: 'center', borderBottom: '3px double black' }}>{cost.toFixed(4)}</td>;
              })}
            </tr>

            {/* Nutrientes Section */}
            <tr>
              <td colSpan={2 + (activeDiets.length * 2)} style={{ padding: '20px', backgroundColor: '#333', color: 'white', fontWeight: 'bold', textAlign: 'center' }}>
                PERFIL NUTRICIONAL DEL RESULTADO (ACT)
              </td>
            </tr>
            <tr style={{ backgroundColor: '#e2e2e2' }}>
              <th style={thStyle}>Nutriente</th>
              <th style={thStyle}>Unidad</th>
              {activeDiets.map(diet => (
                <th key={diet.id} colSpan={2} style={thStyle}>{diet.name.toUpperCase()} (ACT)</th>
              ))}
            </tr>

            {activeNuts.map(nut => (
              <tr key={nut.id}>
                <td style={{ ...tdStyle, fontWeight: 'bold' }}>{nut.name}</td>
                <td style={tdStyle}>{nut.unit}</td>
                {activeDiets.map(diet => {
                  const val = results[diet.id]?.nutrients[nut.id] || 0;
                  return <td key={diet.id} colSpan={2} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>{val.toFixed(2)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
};
