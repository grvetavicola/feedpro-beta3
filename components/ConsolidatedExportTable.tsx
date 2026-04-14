import React, { useRef } from 'react';
import { DuplicateIcon } from './icons';

interface Props {
  activeDiets: any[];
  results: Record<string, any>;
  activeRows: any[];
}

export const ConsolidatedExportTable: React.FC<Props> = ({
  activeDiets,
  results,
  activeRows
}) => {
  const tableRef = useRef<HTMLTableElement>(null);

  const copyToExcel = async () => {
    if (!tableRef.current) return;
    try {
      const blob = new Blob([tableRef.current.outerHTML], { type: 'text/html' });
      const item = new ClipboardItem({ 'text/html': blob });
      await navigator.clipboard.write([item]);
      alert('¡Tabla copiada al portapapeles! Pégala directamente en Excel.');
    } catch (err) {
      console.error('Error al copiar:', err);
      try {
        // Fallback for older browsers
        const range = document.createRange();
        range.selectNode(tableRef.current);
        window.getSelection()?.removeAllRanges();
        window.getSelection()?.addRange(range);
        document.execCommand('copy');
        window.getSelection()?.removeAllRanges();
        alert('Copiado (método alternativo).');
      } catch (err2) {
        alert('Error al copiar. Por favor, selecciona la tabla manualmente.');
      }
    }
  };

  const activeIngs = activeRows.filter(r => r.type === 'ing');
  const activeNuts = activeRows.filter(r => r.type === 'nut');

  const tdStyle = { border: '1px solid #ccc', padding: '6px', textAlign: 'left' as const, fontSize: '12px', color: 'black' };
  const thStyle = { ...tdStyle, backgroundColor: '#f2f2f2', fontWeight: 'bold' as const };
  const headerStyle = { ...thStyle, backgroundColor: '#d1d1d1', textAlign: 'center' as const };

  return (
    <div className="mt-16 mb-24 p-8 bg-[#0a0a0a] border border-slate-800 rounded-3xl mx-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-[0.2em] text-[#00D1FF] font-mono">Exportación Consolidada</h2>
          <div className="h-1 w-20 bg-[#00D1FF]/40 rounded-full mt-2" />
          <p className="text-[10px] text-slate-500 mt-2 uppercase italic tracking-widest font-black">Formato Plano Optimizado para Microsoft Excel</p>
        </div>
        <button 
          onClick={copyToExcel}
          className="flex items-center gap-3 bg-[#00D1FF] hover:bg-[#00b8e6] text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_30px_rgba(0,209,255,0.2)] group"
        >
          <DuplicateIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
          Copiar a Excel
        </button>
      </div>

      <div className="overflow-auto bg-white rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <table ref={tableRef} style={{ borderCollapse: 'collapse', width: '100%', color: 'black', backgroundColor: 'white', fontFamily: 'Calibri, sans-serif' }}>
          <thead>
            <tr>
              <th style={headerStyle}>Ingrediente / Insumo</th>
              <th style={headerStyle}>$/kg</th>
              {activeDiets.map(diet => (
                <th key={diet.id} style={headerStyle}>{diet.name}</th>
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
                  const val = results[diet.id]?.formula[ing.id] || 0;
                  return <td key={diet.id} style={{ ...tdStyle, textAlign: 'right' }}>{val.toFixed(2)}</td>;
                })}
              </tr>
            ))}

            {/* Fila Totales */}
            <tr style={{ backgroundColor: '#fafafa' }}>
              <td style={{ ...thStyle }}>TOTAL KG (BATCH)</td>
              <td style={tdStyle}>-</td>
              {activeDiets.map(diet => {
                const total = Object.values(results[diet.id]?.formula || {}).reduce((a: any, b: any) => a + b, 0);
                return <td key={diet.id} style={{ ...thStyle, textAlign: 'right' }}>{(total as number).toFixed(2)}</td>;
              })}
            </tr>

            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <td style={{ ...thStyle }}>VALOR FÓRMULA (COSTO TOTAL)</td>
              <td style={tdStyle}>-</td>
              {activeDiets.map(diet => {
                const totalCost = activeIngs.reduce((sum, ing) => {
                  const qty = results[diet.id]?.formula[ing.id] || 0;
                  return sum + (qty * (ing.price || 0));
                }, 0);
                return <td key={diet.id} style={{ ...thStyle, textAlign: 'right', color: '#b91c1c' }}>{totalCost.toFixed(2)}</td>;
              })}
            </tr>

            <tr style={{ backgroundColor: '#fdfaea' }}>
              <td style={{ ...thStyle }}>COSTO POR KG</td>
              <td style={tdStyle}>-</td>
              {activeDiets.map(diet => {
                const cost = results[diet.id]?.costPerKg || 0;
                return <td key={diet.id} style={{ ...thStyle, textAlign: 'right', fontWeight: '900' }}>{cost.toFixed(4)}</td>;
              })}
            </tr>

            {/* SEPARADOR Nutrientes */}
            <tr>
              <td colSpan={2 + activeDiets.length} style={{ ...headerStyle, backgroundColor: '#333', color: 'white', padding: '10px' }}>
                VALORES NUTRICIONALES ESPERADOS (ACT)
              </td>
            </tr>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th style={thStyle}>Nutriente</th>
              <th style={thStyle}>Unidad</th>
              {activeDiets.map(diet => (
                <th key={diet.id} style={thStyle}>{diet.name}</th>
              ))}
            </tr>

            {activeNuts.map(nut => (
              <tr key={nut.id}>
                <td style={{ ...tdStyle, fontWeight: 'bold' }}>{nut.name}</td>
                <td style={tdStyle}>{nut.unit}</td>
                {activeDiets.map(diet => {
                  const val = results[diet.id]?.nutrients[nut.id] || 0;
                  return <td key={diet.id} style={{ ...tdStyle, textAlign: 'right' }}>{val.toFixed(2)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
