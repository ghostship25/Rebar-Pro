import React, { useMemo, useState } from 'react';
import { BarItem, RevisionSnapshot } from '../types/bbs';
import { diffBars, nextRevisionLabel } from '../utils/revisions';
import { X, History, RotateCcw, Trash2, Plus } from 'lucide-react';

interface RevisionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  bars: BarItem[];
  currentLabel: string;
  revisions: RevisionSnapshot[];
  onCreate: (label: string, note: string) => void;
  onRestore: (rev: RevisionSnapshot) => void;
  onDelete: (id: string) => void;
}

export const RevisionHistoryModal: React.FC<RevisionHistoryModalProps> = ({
  isOpen,
  onClose,
  bars,
  currentLabel,
  revisions,
  onCreate,
  onRestore,
  onDelete,
}) => {
  const [label, setLabel] = useState('');
  const [note, setNote] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = revisions.find((r) => r.id === selectedId) || revisions[revisions.length - 1] || null;
  const diff = useMemo(() => (selected ? diffBars(selected.bars, bars) : null), [selected, bars]);

  if (!isOpen) return null;

  const suggested = nextRevisionLabel(currentLabel, revisions.length);
  const fmt = (n: number) => n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const delta = diff ? diff.weightAfter - diff.weightBefore : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs" role="dialog" aria-modal="true">
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Revision History</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Save a snapshot when you issue the schedule, then see exactly what changed since.
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 hover:dark:bg-slate-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-5 gap-5 text-xs">
          <div className="md:col-span-2 space-y-4">
            <form
              className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950"
              onSubmit={(e) => {
                e.preventDefault();
                onCreate(label.trim() || suggested, note);
                setLabel('');
                setNote('');
                setSelectedId(null);
              }}
            >
              <div className="font-semibold text-slate-800 dark:text-slate-200">Save current schedule as a revision</div>
              <input
                value={label}
                maxLength={40}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={`Label (e.g. ${suggested})`}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-mono"
              />
              <textarea
                value={note}
                maxLength={500}
                rows={2}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What changed / reason for issue"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-2"
              />
              <button type="submit" className="flex items-center gap-1.5 px-3 py-2 font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg">
                <Plus className="w-3.5 h-3.5" />
                Save revision &amp; mark project as {label.trim() || suggested}
              </button>
            </form>

            <div className="space-y-1.5">
              {revisions.length === 0 && <p className="text-slate-500">No revisions saved yet.</p>}
              {[...revisions].reverse().map((r) => (
                <div
                  key={r.id}
                  className={`border rounded-lg p-2 cursor-pointer ${
                    selected?.id === r.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-slate-200 dark:border-slate-800'
                  }`}
                  onClick={() => setSelectedId(r.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold">{r.label}</span>
                    <span className="text-[10px] text-slate-500">{new Date(r.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="text-slate-600 dark:text-slate-400">
                    {r.bars.length} bars · {fmt(r.bars.reduce((s, b) => s + b.totalWeight, 0))} kg
                  </div>
                  {r.note && <div className="text-slate-700 dark:text-slate-300 italic">{r.note}</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-3">
            {selected && diff ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                    Changes since <span className="font-mono">{selected.label}</span>
                  </h4>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Restore the schedule to "${selected.label}"? Your current schedule is saved as a revision first.`)) {
                          onRestore(selected);
                        }
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 hover:dark:bg-slate-700 rounded-lg"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(selected.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-rose-600 dark:text-rose-400 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 hover:dark:bg-slate-700 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2">
                    <div className="text-slate-500">Then</div>
                    <div className="font-mono font-bold">{fmt(diff.weightBefore)} kg</div>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2">
                    <div className="text-slate-500">Now</div>
                    <div className="font-mono font-bold">{fmt(diff.weightAfter)} kg</div>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-2">
                    <div className="text-slate-500">Difference</div>
                    <div className={`font-mono font-bold ${delta > 0 ? 'text-amber-600 dark:text-amber-400' : delta < 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                      {delta > 0 ? '+' : ''}{fmt(delta)} kg
                    </div>
                  </div>
                </div>

                {diff.added.length + diff.removed.length + diff.changed.length === 0 && (
                  <p className="text-slate-500">No differences — the schedule matches this revision.</p>
                )}

                {diff.added.length > 0 && (
                  <div>
                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">Added ({diff.added.length})</div>
                    <ul className="font-mono space-y-0.5">
                      {diff.added.map((b) => (
                        <li key={b.id}>+ {b.barMark} · T{b.diameter} · {fmt(b.totalWeight)} kg</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diff.removed.length > 0 && (
                  <div>
                    <div className="font-semibold text-rose-600 dark:text-rose-400">Removed ({diff.removed.length})</div>
                    <ul className="font-mono space-y-0.5">
                      {diff.removed.map((b) => (
                        <li key={b.id}>− {b.barMark} · T{b.diameter} · {fmt(b.totalWeight)} kg</li>
                      ))}
                    </ul>
                  </div>
                )}
                {diff.changed.length > 0 && (
                  <div>
                    <div className="font-semibold text-amber-600 dark:text-amber-400">Changed ({diff.changed.length})</div>
                    <ul className="font-mono space-y-0.5">
                      {diff.changed.map((c, i) => (
                        <li key={i}>
                          ~ {c.barMark}: {c.fields.join(', ')} ({fmt(c.weightBefore)} → {fmt(c.weightAfter)} kg)
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-500">Save your first revision to start tracking changes.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
