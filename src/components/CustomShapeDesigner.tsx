import React, { useMemo } from 'react';
import { CustomSegment, RebarDiameter, CustomHook, HookType } from '../types/bbs';
import { Plus, Trash2, ArrowRight, CornerDownRight, Anchor, Copy, ChevronUp, ChevronDown, AlertTriangle, Info, RotateCw } from 'lucide-react';
import { buildCustomShapeGeometry } from '../utils/rebarGeometry';

interface CustomShapeDesignerProps {
  segments: CustomSegment[];
  onChange: (segments: CustomSegment[]) => void;
  diameter: RebarDiameter;
  startHook?: CustomHook;
  onStartHookChange?: (hook: CustomHook) => void;
  endHook?: CustomHook;
  onEndHookChange?: (hook: CustomHook) => void;
}

const ANGLE_PRESETS = [0, 15, 22.5, 30, 45, 60, 67.5, 90, 120, 135, 150, 180, 225, 270, 315];

function newId() {
  return `seg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
}

const inputCls =
  'bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-cyan-500';

const HookFields: React.FC<{
  label: string;
  hook: CustomHook;
  onChangeHook: (hook: CustomHook) => void;
  diameter: RebarDiameter;
  addition: number;
  deduction: number;
  desc: string;
}> = ({ label, hook, onChangeHook, addition, deduction, desc }) => {
  const isCustom = hook.type === 'custom';
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-950/80 rounded-lg border border-amber-300/50 dark:border-amber-900/40 flex flex-col gap-2 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold min-w-28">
          <Anchor className="w-3.5 h-3.5" />
          <span>{label}:</span>
        </div>
        <select
          value={hook.type}
          onChange={(e) => {
            const type = e.target.value as HookType;
            if (type === 'custom') {
              onChangeHook({ ...hook, type, angle: hook.angle ?? 90, angleMode: hook.angleMode ?? 'relative', rotation: hook.rotation ?? 'ccw' });
            } else {
              onChangeHook({ ...hook, type });
            }
          }}
          className={inputCls}
        >
          <option value="none">No Hook (Straight end)</option>
          <option value="hook-90">90° Standard Anchorage Hook (12d)</option>
          <option value="hook-135">135° Ductile Seismic Hook (10d / 75mm)</option>
          <option value="hook-180">180° Semi-circular Hook (4d + 65mm)</option>
          <option value="custom">Custom — Any Angle (0°–360°)</option>
        </select>

        {hook.type !== 'none' && !isCustom && (
          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400">Length (m):</span>
            <input
              type="number"
              step="0.01"
              min="0.05"
              placeholder={addition.toFixed(3)}
              value={hook.lengthMeters ?? ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeHook({ ...hook, lengthMeters: isNaN(val) ? undefined : val });
              }}
              className={`w-20 ${inputCls} text-right`}
            />
          </div>
        )}

        {!isCustom && hook.type !== 'none' && (
          <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">
            +{addition.toFixed(3)}m / -{deduction.toFixed(3)}m ded
          </span>
        )}
      </div>

      {isCustom && (
        <div className="flex flex-wrap items-center gap-3 pl-1">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 dark:text-slate-400">Mode:</span>
            <div className="flex rounded overflow-hidden border border-slate-300 dark:border-slate-700">
              {(['relative', 'absolute'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => onChangeHook({ ...hook, angleMode: m })}
                  className={`px-2 py-1 cursor-pointer capitalize ${
                    (hook.angleMode ?? 'relative') === m
                      ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
                      : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 dark:text-slate-400">Angle:</span>
            <input
              type="number"
              step="0.5"
              value={hook.angle ?? 90}
              onChange={(e) => onChangeHook({ ...hook, angle: parseFloat(e.target.value) || 0 })}
              className={`w-20 ${inputCls} text-center`}
            />
            <span className="text-slate-600 dark:text-slate-400">°</span>
          </div>

          {(hook.angleMode ?? 'relative') === 'relative' && (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-600 dark:text-slate-400">Rotation:</span>
              <div className="flex rounded overflow-hidden border border-slate-300 dark:border-slate-700">
                {(['ccw', 'cw'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onChangeHook({ ...hook, rotation: r })}
                    className={`px-2 py-1 cursor-pointer uppercase ${
                      (hook.rotation ?? 'ccw') === r
                        ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
                        : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 dark:text-slate-400">Extension (m):</span>
            <input
              type="number"
              step="0.005"
              placeholder="auto"
              value={hook.extensionLength ?? ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeHook({ ...hook, extensionLength: isNaN(val) ? undefined : val });
              }}
              className={`w-20 ${inputCls} text-right`}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 dark:text-slate-400">Radius (m):</span>
            <input
              type="number"
              step="0.005"
              placeholder="auto"
              value={hook.radius ?? ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                onChangeHook({ ...hook, radius: isNaN(val) ? undefined : val });
              }}
              className={`w-20 ${inputCls} text-right`}
            />
          </div>

          <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400">{desc}</span>
        </div>
      )}
    </div>
  );
};

export const CustomShapeDesigner: React.FC<CustomShapeDesignerProps> = ({
  segments,
  onChange,
  diameter,
  startHook = { type: 'none', direction: 'up' } as CustomHook,
  onStartHookChange,
  endHook = { type: 'none', direction: 'up' } as CustomHook,
  onEndHookChange,
}) => {
  const geo = useMemo(() => buildCustomShapeGeometry(segments, startHook, endHook, diameter), [segments, startHook, endHook, diameter]);

  const addSegment = () => {
    const newSeg: CustomSegment = {
      id: newId(),
      label: undefined,
      length: 0.5,
      angle: segments.length === 0 ? 0 : 90,
      direction: 'custom',
      angleMode: segments.length === 0 ? 'absolute' : 'relative',
    };
    onChange([...segments, newSeg]);
  };

  const removeSegment = (index: number) => {
    if (segments.length <= 1) return;
    onChange(segments.filter((_, i) => i !== index));
  };

  const duplicateSegment = (index: number) => {
    const copy = { ...segments[index], id: newId(), label: undefined };
    const updated = [...segments];
    updated.splice(index + 1, 0, copy);
    onChange(updated);
  };

  const moveSegment = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= segments.length) return;
    const updated = [...segments];
    [updated[index], updated[target]] = [updated[target], updated[index]];
    onChange(updated);
  };

  const updateSegment = (index: number, updates: Partial<CustomSegment>) => {
    onChange(segments.map((seg, i) => (i === index ? { ...seg, ...updates } : seg)));
  };

  const convertToArbitrary = (index: number) => {
    const resolvedHeading = geo.segments[index]?.absoluteAngle ?? 0;
    updateSegment(index, { direction: 'custom', angleMode: 'absolute', angle: Number(resolvedHeading.toFixed(2)) });
  };

  return (
    <div className="flex flex-col gap-4 bg-slate-100 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Custom Parametric Rebar Shape & Hook Designer
          </h4>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Any angle 0°–360° (decimals allowed), absolute or relative bends, and arbitrary-angle hooks — with live IS 2502 / BS 8666 deductions
          </p>
        </div>
        <button
          type="button"
          onClick={addSegment}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Segment
        </button>
      </div>

      {onStartHookChange && (
        <HookFields
          label="Start Hook"
          hook={startHook}
          onChangeHook={onStartHookChange}
          diameter={diameter}
          addition={geo.startHook?.additionMeters ?? 0}
          deduction={geo.startHook?.deductionMeters ?? 0}
          desc={geo.startHook?.desc ?? 'None'}
        />
      )}

      {/* Segments List */}
      <div className="flex flex-col gap-2">
        {segments.map((seg, index) => {
          const isFirst = index === 0;
          const label = seg.label || String.fromCharCode(65 + (index % 26));
          const segGeo = geo.segments[index];
          const isArbitrary = seg.direction === 'custom';

          return (
            <div
              key={seg.id}
              className="flex flex-wrap items-center gap-2 p-2.5 bg-white dark:bg-slate-950/80 rounded-lg border border-slate-200 dark:border-slate-800 text-xs"
            >
              <span className="w-10 font-mono font-bold text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                <span>{label}</span>
                <span className="text-slate-500 dark:text-slate-500 text-[10px]">#{index + 1}</span>
              </span>

              {isArbitrary ? (
                <div className="flex flex-wrap items-center gap-2">
                  {!isFirst && (
                    <>
                      <CornerDownRight className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <div className="flex rounded overflow-hidden border border-slate-300 dark:border-slate-700">
                        {(['relative', 'absolute'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => updateSegment(index, { angleMode: m })}
                            className={`px-2 py-1 cursor-pointer capitalize ${
                              (seg.angleMode ?? 'relative') === m
                                ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300'
                                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            {m === 'relative' ? 'Bend' : 'Absolute'}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {isFirst && <span className="text-slate-600 dark:text-slate-400">Start heading:</span>}

                  <input
                    type="number"
                    step="0.5"
                    value={seg.angle}
                    onChange={(e) => updateSegment(index, { angle: parseFloat(e.target.value) || 0 })}
                    className={`w-20 ${inputCls} text-center`}
                  />
                  <span className="text-slate-600 dark:text-slate-400">°</span>

                  <div className="hidden md:flex items-center gap-1 flex-wrap max-w-xs">
                    {ANGLE_PRESETS.map((presetAng) => (
                      <button
                        key={presetAng}
                        type="button"
                        onClick={() => updateSegment(index, { angle: presetAng })}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                          seg.angle === presetAng
                            ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-800 hover:dark:text-slate-200'
                        }`}
                      >
                        {presetAng}°
                      </button>
                    ))}
                  </div>

                  {!isFirst && (
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-500">
                      → heading {segGeo?.absoluteAngle.toFixed(1)}°
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-400">
                  {isFirst ? (
                    <>
                      <span>Start Base Run</span>
                      <span className="text-slate-400 dark:text-slate-600">·</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-500">Horizontal Datum</span>
                    </>
                  ) : (
                    <>
                      <CornerDownRight className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      <select
                        value={seg.direction}
                        onChange={(e) => updateSegment(index, { direction: e.target.value as CustomSegment['direction'] })}
                        className={inputCls}
                      >
                        <option value="up">Turn Up (90° / Angle)</option>
                        <option value="down">Turn Down (90° / Angle)</option>
                        <option value="crank-up">Crank Up (45° Incline)</option>
                        <option value="crank-down">Crank Down (45° Incline)</option>
                        <option value="right">Turn Right</option>
                        <option value="left">Turn Left / Back</option>
                        <option value="hook-return">180° Return Loop</option>
                        <option value="straight">Straight Extension (0°)</option>
                      </select>
                      <span className="text-slate-600 dark:text-slate-400">Angle:</span>
                      <input
                        type="number"
                        min="0"
                        max="180"
                        step="5"
                        value={seg.angle}
                        onChange={(e) => updateSegment(index, { angle: Math.max(0, Math.min(180, parseFloat(e.target.value) || 0)) })}
                        className={`w-16 ${inputCls} text-center`}
                      />
                      <span className="text-slate-600 dark:text-slate-400">°</span>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => convertToArbitrary(index)}
                    title="Switch this segment to arbitrary-angle mode (0°–360°, decimals) without moving the shape"
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 cursor-pointer"
                  >
                    <RotateCw className="w-3 h-3" /> Any angle
                  </button>
                </div>
              )}

              {/* Length input */}
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-slate-600 dark:text-slate-400">Length:</span>
                <input
                  type="number"
                  step="0.005"
                  min="0.01"
                  value={seg.length}
                  onChange={(e) => updateSegment(index, { length: Math.max(0.001, parseFloat(e.target.value) || 0) })}
                  className={`w-24 ${inputCls} text-right`}
                />
                <span className="text-slate-600 dark:text-slate-400">m</span>
              </div>

              {!isFirst && segGeo && (
                <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 w-24 text-right">
                  Ded: -{segGeo.bendDeductionMeters.toFixed(3)}m
                </span>
              )}

              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveSegment(index, -1)}
                  className={`p-1 rounded text-slate-600 dark:text-slate-400 hover:text-cyan-600 hover:dark:text-cyan-300 hover:bg-slate-200 hover:dark:bg-slate-800 cursor-pointer ${index === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}
                  title="Move up"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === segments.length - 1}
                  onClick={() => moveSegment(index, 1)}
                  className={`p-1 rounded text-slate-600 dark:text-slate-400 hover:text-cyan-600 hover:dark:text-cyan-300 hover:bg-slate-200 hover:dark:bg-slate-800 cursor-pointer ${index === segments.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                  title="Move down"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => duplicateSegment(index)}
                  className="p-1 rounded text-slate-600 dark:text-slate-400 hover:text-cyan-600 hover:dark:text-cyan-300 hover:bg-slate-200 hover:dark:bg-slate-800 cursor-pointer"
                  title="Duplicate segment"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={segments.length <= 1}
                  onClick={() => removeSegment(index)}
                  className={`p-1 rounded text-slate-600 dark:text-slate-400 hover:text-rose-500 hover:dark:text-rose-400 hover:bg-slate-200 hover:dark:bg-slate-800 transition-colors cursor-pointer ${
                    segments.length <= 1 ? 'opacity-30 cursor-not-allowed' : ''
                  }`}
                  title="Remove segment"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {onEndHookChange && (
        <HookFields
          label="End Hook"
          hook={endHook}
          onChangeHook={onEndHookChange}
          diameter={diameter}
          addition={geo.endHook?.additionMeters ?? 0}
          deduction={geo.endHook?.deductionMeters ?? 0}
          desc={geo.endHook?.desc ?? 'None'}
        />
      )}

      {/* Validation issues */}
      {geo.warnings.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {geo.warnings.map((w, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-3 py-1.5 rounded-lg text-[11px] border ${
                w.severity === 'error'
                  ? 'bg-rose-100 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-300'
                  : w.severity === 'warning'
                  ? 'bg-amber-100 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-700 dark:text-amber-300'
                  : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              {w.severity === 'info' ? <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
              <span>{w.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary derivation bar */}
      <div className="flex flex-wrap items-center justify-between p-3 bg-slate-100 dark:bg-slate-950 rounded-lg border border-cyan-300/50 dark:border-cyan-900/40 text-xs gap-2">
        <div className="flex flex-wrap items-center gap-2 text-slate-600 dark:text-slate-400 font-mono">
          {geo.formulaExplanation}
        </div>
        <div className="flex items-center gap-2 font-mono">
          <ArrowRight className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span className="text-cyan-700 dark:text-cyan-300 font-bold">Cutting Length = {geo.cuttingLength.toFixed(3)} m</span>
        </div>
      </div>
    </div>
  );
};
