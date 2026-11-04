import React, { useState, useMemo } from 'react';
import { BarItem } from '../types/bbs';
import { parseDelimited, rowsToBars, DimensionUnit, CSV_HEADERS } from '../utils/csv';
import { X, Upload, Check, AlertTriangle } from 'lucide-react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (bars: BarItem[]) => void;
}

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState('');
  const [unit, setUnit] = useState<DimensionUnit>('mm');
  const [fileError, setFileError] = useState('');

  const result = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return rowsToBars(parseDelimited(text), unit);
    } catch (err: any) {
      return { bars: [] as BarItem[], errors: [err?.message || 'Could not read data.'] };
    }
  }, [text, unit]);

  if (!isOpen) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError('File too large (max 5 MB).');
      return;
    }
    setFileError('');
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result || ''));
    reader.onerror = () => setFileError('Failed to read file.');
    reader.readAsText(file);
  };

  const close = () => {
    setText('');
    setFileError('');
    onClose();
  };

  const confirm = () => {
    if (!result || result.bars.length === 0) return;
    onImport(result.bars);
    close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Import / Paste Bars</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Upload a CSV file or paste rows copied from Excel. Cutting lengths and weights are calculated automatically.
            </p>
          </div>
          <button onClick={close} aria-label="Close" className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 hover:dark:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-1.5 px-3 py-2 font-semibold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 hover:dark:bg-slate-700 rounded-lg cursor-pointer text-slate-800 dark:text-slate-200">
              <Upload className="w-3.5 h-3.5" />
              Choose CSV file
              <input type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" />
            </label>
            <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
              Dimensions in
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as DimensionUnit)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5"
              >
                <option value="mm">millimetres (mm)</option>
                <option value="m">metres (m)</option>
              </select>
            </label>
            {fileError && <span className="text-rose-600 dark:text-rose-400">{fileError}</span>}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            spellCheck={false}
            placeholder={'Paste here, including the header row. Example:\nBar Mark\tDia\tShape Code\tNo. of Elements\tBars per Element\tA\tB\tC\nB1\t16\t00\t4\t3\t5000\t\t'}
            className="w-full font-mono text-[11px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
          />

          <p className="text-slate-600 dark:text-slate-400">
            Required columns: <strong>Dia</strong>, <strong>Shape Code</strong>, <strong>A</strong> (plus B–F as the shape needs).
            Optional: {CSV_HEADERS.slice(0, 11).filter((h) => !['Dia (mm)', 'Shape Code'].includes(h)).join(', ')}, Remarks.
            Custom shape (99) rows are not supported in CSV.
          </p>

          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                <Check className="w-4 h-4 text-emerald-500" />
                {result.bars.length} bar(s) ready to import
              </div>
              {result.errors.length > 0 && (
                <div className="border border-amber-500/40 bg-amber-500/10 rounded-lg p-3 max-h-40 overflow-y-auto">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                    {result.errors.length} row(s) skipped
                  </div>
                  <ul className="list-disc pl-5 text-slate-700 dark:text-slate-300 space-y-0.5">
                    {result.errors.slice(0, 50).map((er, i) => <li key={i}>{er}</li>)}
                  </ul>
                </div>
              )}
              {result.bars.length > 0 && (
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-[11px]">
                    <thead className="bg-slate-200 dark:bg-slate-800 text-left">
                      <tr><th className="p-1.5">Mark</th><th className="p-1.5">Ø</th><th className="p-1.5">Shape</th><th className="p-1.5">Nos</th><th className="p-1.5">Cut len (m)</th><th className="p-1.5">Weight (kg)</th></tr>
                    </thead>
                    <tbody>
                      {result.bars.slice(0, 8).map((b) => (
                        <tr key={b.id} className="border-t border-slate-200 dark:border-slate-800">
                          <td className="p-1.5 font-mono">{b.barMark}</td><td className="p-1.5">{b.diameter}</td><td className="p-1.5">{b.shapeCode}</td>
                          <td className="p-1.5">{b.totalBars}</td><td className="p-1.5">{b.cuttingLength.toFixed(3)}</td><td className="p-1.5">{b.totalWeight.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {result.bars.length > 8 && <div className="p-1.5 text-slate-500">…and {result.bars.length - 8} more</div>}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button type="button" onClick={close} className="px-4 py-2 text-xs font-medium bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 hover:dark:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-300">
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!result || result.bars.length === 0}
            className="px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg shadow-md"
          >
            Add {result?.bars.length || 0} bar(s) to schedule
          </button>
        </div>
      </div>
    </div>
  );
};
