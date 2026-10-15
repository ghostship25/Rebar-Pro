import React from 'react';
import { BarItem } from '../types/bbs';
import { auditBbsSchedule } from '../utils/engineering';
import { AlertTriangle, AlertOctagon, CheckCircle2, ChevronRight } from 'lucide-react';

interface AuditAlertsProps {
  bars: BarItem[];
  onSelectBar: (barId: string) => void;
}

export const AuditAlerts: React.FC<AuditAlertsProps> = ({ bars, onSelectBar }) => {
  const issues = auditBbsSchedule(bars);

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-3 p-3.5 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <div>
          <span className="font-semibold text-emerald-200">Engineering Schedule Audit Passed: </span>
          All bar marks comply with IS 2502:1963 / BS 8666 standards. All cutting lengths within 12.0m commercial mill supply limit and valid geometry.
        </div>
      </div>
    );
  }

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');

  return (
    <div className="bg-slate-50 dark:bg-slate-950/90 border border-amber-900/50 rounded-xl p-4 space-y-3 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {errors.length > 0 ? (
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            Engineering Schedule Audit & Integrity Warnings ({issues.length} detected)
          </h4>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          {errors.length > 0 && <span className="text-rose-400 font-bold">{errors.length} Errors</span>}
          {warnings.length > 0 && <span className="text-amber-400 font-bold">{warnings.length} Warnings</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
        {issues.map((issue, idx) => (
          <div
            key={idx}
            onClick={() => onSelectBar(issue.barId)}
            className={`flex items-start justify-between p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
              issue.severity === 'error'
                ? 'bg-rose-950/30 border-rose-900/60 hover:bg-rose-950/50 text-rose-200'
                : 'bg-amber-950/30 border-amber-900/60 hover:bg-amber-950/50 text-amber-200'
            }`}
          >
            <div className="space-y-0.5 pr-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-cyan-300 text-[10px]">
                  {issue.barMark}
                </span>
                <span className="font-medium text-[11px]">{issue.message}</span>
              </div>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 italic">
                Suggestion: {issue.recommendation}
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 dark:text-slate-500 shrink-0 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
};
