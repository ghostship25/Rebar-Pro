import React, { useMemo, useState } from 'react';
import { ProjectData, RebarDiameter } from '../types/bbs';
import { MiniRebarSvg } from './MiniRebarSvg';
import { Printer, ArrowLeft } from 'lucide-react';

interface FieldSheetsProps {
  project: ProjectData;
  onClose: () => void;
}

type Mode = 'tags' | 'cutlist';

export const FieldSheets: React.FC<FieldSheetsProps> = ({ project, onClose }) => {
  const [mode, setMode] = useState<Mode>('tags');
  const { metadata, bars } = project;

  // One row per distinct diameter + cutting length, so the yard cuts all equal pieces together.
  const cutGroups = useMemo(() => {
    const byDia = new Map<RebarDiameter, Map<string, { length: number; qty: number; marks: Set<string> }>>();
    bars.forEach((b) => {
      if (b.totalBars <= 0 || b.cuttingLength <= 0) return;
      const lenKey = b.cuttingLength.toFixed(3);
      const diaMap = byDia.get(b.diameter) || new Map();
      const row = diaMap.get(lenKey) || { length: b.cuttingLength, qty: 0, marks: new Set<string>() };
      row.qty += b.totalBars;
      row.marks.add(b.barMark);
      diaMap.set(lenKey, row);
      byDia.set(b.diameter, diaMap);
    });
    return Array.from(byDia.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([dia, rows]) => ({
        dia,
        rows: Array.from(rows.values()).sort((a, b) => b.length - a.length),
      }));
  }, [bars]);

  const tabBtn = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => setMode(m)}
      className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors ${
        mode === m ? 'bg-cyan-400 text-slate-950' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-900 dark:text-slate-100 p-4 md:p-8">
      <div className="no-print max-w-6xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-3 bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 p-4 rounded-xl shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 hover:dark:bg-slate-600 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Schedule
          </button>
          {tabBtn('tags', 'Bar-Mark Tags')}
          {tabBtn('cutlist', 'Yard Cut List')}
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md"
        >
          <Printer className="w-4 h-4" />
          Print
        </button>
      </div>

      <div className="print-container max-w-6xl mx-auto bg-white text-slate-900 shadow-2xl p-6 rounded-xl text-xs border border-slate-300">
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-4">
          <div className="flex items-center gap-3">
            {metadata.logoDataUrl && <img src={metadata.logoDataUrl} alt="Logo" className="h-10 w-auto object-contain" />}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                {mode === 'tags' ? 'Bar-Mark Tags' : 'Yard Cutting List'}
              </div>
              <div className="text-base font-black uppercase">{metadata.projectTitle}</div>
            </div>
          </div>
          <div className="text-right font-mono text-[11px]">
            <div>Drg: <strong>{metadata.drawingNumber}</strong> · Rev: <strong>{metadata.revision}</strong></div>
            <div>{metadata.date}</div>
          </div>
        </div>

        {bars.length === 0 && <p className="text-slate-500">No bars in the schedule yet.</p>}

        {mode === 'tags' && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {bars.map((b) => (
              <div key={b.id} className="border-2 border-slate-900 p-2 break-inside-avoid" style={{ breakInside: 'avoid' }}>
                <div className="flex items-start justify-between">
                  <div className="text-2xl font-black font-mono leading-none">{b.barMark}</div>
                  <div className="text-right font-mono">
                    <div className="text-lg font-black">T{b.diameter}</div>
                    <div className="text-[10px]">Shape {b.shapeCode}</div>
                  </div>
                </div>
                <div className="flex justify-center my-1">
                  <MiniRebarSvg shapeCode={b.shapeCode} className="w-28 h-12 invert" />
                </div>
                <div className="grid grid-cols-2 gap-x-2 font-mono text-[11px]">
                  <div>Cut length: <strong>{b.cuttingLength.toFixed(3)} m</strong></div>
                  <div className="text-right">Qty: <strong>{b.totalBars}</strong></div>
                  <div className="col-span-2 font-sans text-[10px] text-slate-700 truncate">
                    {[b.structureName, b.component || b.member, b.gridOrSection].filter(Boolean).join(' · ')}
                  </div>
                  <div className="col-span-2 font-sans text-[10px] text-slate-600 truncate">{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {mode === 'cutlist' && (
          <div className="space-y-5">
            {cutGroups.map((g) => (
              <div key={g.dia} style={{ breakInside: 'avoid' }}>
                <h4 className="font-bold text-sm bg-slate-200 border border-slate-900 px-2 py-1">Diameter T{g.dia}</h4>
                <table className="w-full border-collapse border border-slate-900 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 uppercase text-[10px]">
                      <th className="border border-slate-900 p-1 text-right">Cut length (m)</th>
                      <th className="border border-slate-900 p-1 text-right">Qty (nos)</th>
                      <th className="border border-slate-900 p-1 text-right">Total run (m)</th>
                      <th className="border border-slate-900 p-1 text-left">Bar marks</th>
                      <th className="border border-slate-900 p-1 text-center w-16">Cut ✓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((r) => (
                      <tr key={r.length}>
                        <td className="border border-slate-900 p-1 text-right font-mono font-bold">{r.length.toFixed(3)}</td>
                        <td className="border border-slate-900 p-1 text-right font-mono">{r.qty}</td>
                        <td className="border border-slate-900 p-1 text-right font-mono">{(r.length * r.qty).toFixed(2)}</td>
                        <td className="border border-slate-900 p-1 font-mono">{Array.from(r.marks).join(', ')}</td>
                        <td className="border border-slate-900 p-1" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {metadata.reportFooterNote && (
          <div className="mt-4 pt-2 border-t border-slate-400 text-[10px] text-slate-600">{metadata.reportFooterNote}</div>
        )}
      </div>
    </div>
  );
};
