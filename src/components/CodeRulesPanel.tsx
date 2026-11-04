import React from 'react';
import { CodeSettings, DesignStandard } from '../types/bbs';
import { PROFILES, DISCLAIMER } from '../data/codeProfiles';
import {
  aciCompressionLap,
  aciTensionDevelopment,
  aciTensionLap,
  asTensionDevelopment,
  asTensionLap,
  resolveBendDiameter,
  resolveCover,
  resolveHookExtension,
} from '../utils/codeRules';

interface Props {
  standard: DesignStandard;
  settings?: CodeSettings;
}

const Badge: React.FC<{ verify?: boolean }> = ({ verify }) =>
  verify ? <span className="ml-1 text-[9px] font-bold text-amber-600 dark:text-amber-400">VERIFY</span> : null;

const mm = (v: number | null | undefined) => (v == null ? <span className="text-amber-600 dark:text-amber-400">missing</span> : Math.round(v));

/** Read-only view of the rules the active ACI / AS profile applies, with clauses. */
export const CodeRulesPanel: React.FC<Props> = ({ standard, settings = {} }) => {
  const profile = PROFILES[standard];
  if (!profile || profile.family === 'legacy') return null;
  const sizes = profile.bars?.value ?? [];
  const th = 'text-left font-semibold px-2 py-1.5 text-slate-600 dark:text-slate-400';
  const td = 'px-2 py-1.5 font-mono';

  return (
    <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {profile.name} rules applied ({profile.edition})
        </h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Values in mm. Source: docs/ACI318_AS3600_BBS_Rules.md. Edit constants in src/data/codeProfiles.ts. {DISCLAIMER}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800">
              <th className={th}>Bar</th>
              <th className={th}>kg/m</th>
              <th className={th}>D main<Badge verify={profile.mainBend.verify} /></th>
              <th className={th}>D fitment</th>
              <th className={th}>90° ext</th>
              <th className={th}>135° fitment ext</th>
              <th className={th}>Cover</th>
              <th className={th}>ld tension</th>
              <th className={th}>Tension lap</th>
              {profile.family === 'ACI' && <th className={th}>Compr. lap</th>}
            </tr>
          </thead>
          <tbody>
            {sizes.map((b) => {
              const dev = profile.family === 'ACI' ? aciTensionDevelopment(b.dia, settings) : asTensionDevelopment(b.dia, settings);
              const lap = profile.family === 'ACI' ? aciTensionLap(b.dia, settings) : asTensionLap(b.dia, settings);
              return (
                <tr key={b.dia} className="border-b border-slate-100 dark:border-slate-900">
                  <td className={td}>{b.designation} ({b.dia})</td>
                  <td className={td}>{b.mass}</td>
                  <td className={td}>{mm(resolveBendDiameter(profile, settings, b.dia, 'main').mm)}</td>
                  <td className={td}>{mm(resolveBendDiameter(profile, settings, b.dia, 'fitment').mm)}</td>
                  <td className={td}>{mm(resolveHookExtension(profile, settings, '90', 'main', b.dia).mm)}</td>
                  <td className={td}>{mm(resolveHookExtension(profile, settings, '135', 'fitment', b.dia).mm)}</td>
                  <td className={td}>{mm(resolveCover(profile, settings, b.dia).mm)}</td>
                  <td className={td}>{mm(dev.mm)}</td>
                  <td className={td}>{mm(lap.mm)}</td>
                  {profile.family === 'ACI' && <td className={td}>{mm(aciCompressionLap(b.dia, settings).mm)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Cover shown for: {resolveCover(profile, settings, 16).label}. Development / lap lengths use fy={settings.fy ?? profile.defaults.fy} MPa, f'c={settings.fc ?? profile.defaults.fc} MPa
        (VERIFY constants — {profile.family === 'ACI' ? 'ACI 318-19 25.4.2.3, 25.5.2, 25.5.5' : 'AS 3600:2018 Cl 13.1.2, 13.2'}).
      </p>
    </div>
  );
};
