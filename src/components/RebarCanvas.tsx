import React from 'react';
import { ShapeCode, RebarDiameter, CustomSegment, CustomHook } from '../types/bbs';
import { SHAPE_LIBRARY, calculateBarCuttingLength } from '../utils/shapes';
import { buildCustomShapeGeometry, calculateBoundingBox, computeFilletArc, GeomPoint, HookGeometry } from '../utils/rebarGeometry';

interface RebarCanvasProps {
  shapeCode: ShapeCode;
  dimA: number;
  dimB?: number;
  dimC?: number;
  dimD?: number;
  dimE?: number;
  dimF?: number;
  diameter: RebarDiameter;
  customSegments?: CustomSegment[];
  startHook?: CustomHook;
  endHook?: CustomHook;
  customShapeName?: string;
  className?: string;
}

export const RebarCanvas: React.FC<RebarCanvasProps> = ({
  shapeCode,
  dimA,
  dimB = 0,
  dimC = 0,
  dimD = 0,
  dimE = 0,
  dimF = 0,
  diameter,
  customSegments,
  startHook,
  endHook,
  customShapeName,
  className = 'w-full h-64',
}) => {
  const shapeDef = SHAPE_LIBRARY[shapeCode] || SHAPE_LIBRARY['00'];
  const calc = calculateBarCuttingLength(
    shapeCode,
    dimA,
    dimB,
    dimC,
    dimD,
    dimE,
    dimF,
    diameter,
    customSegments,
    startHook,
    endHook
  );

  const rebarColor = '#0284c7'; // Vivid cyan-blue (looks striking in both dark and light)
  const hookColor = '#d97706'; // Amber-600
  const dimColor = '#64748b'; // Slate-500
  const dimLineColor = '#94a3b8'; // Slate-400

  // SVG dimensions
  const width = 500;
  const height = 260;

  let drawing: React.ReactNode = null;

  if (shapeCode === '99' && customSegments && customSegments.length > 0) {
    // Real vector-geometry CAD renderer for custom multi-segment shapes & hooks.
    // All positions, headings, bend deductions and hook geometry come from the
    // centralized geometry engine (rebarGeometry.ts) — the same engine used to
    // compute the cutting length above, so the drawing and the numbers always agree.
    const geo = buildCustomShapeGeometry(customSegments, startHook, endHook, diameter);

    const allPts: GeomPoint[] = [];
    if (geo.startHook) allPts.push(geo.startHook.basePoint, geo.startHook.tipPoint);
    geo.segments.forEach((s) => { allPts.push(s.start, s.end); });
    if (geo.endHook) allPts.push(geo.endHook.basePoint, geo.endHook.tipPoint);

    const bbox = calculateBoundingBox(allPts);
    const spanX = Math.max(0.1, bbox.width);
    const spanY = Math.max(0.1, bbox.height);

    const pad = 50;
    const targetW = width - 2 * pad;
    const targetH = height - 2 * pad;
    const scale = Math.min(targetW / spanX, targetH / spanY);

    const mapX = (x: number) => pad + (x - bbox.minX) * scale + (targetW - spanX * scale) / 2;
    const mapY = (y: number) => pad + (y - bbox.minY) * scale + (targetH - spanY * scale) / 2;

    // Renders a hook as a real arc (of its actual bend radius) plus a straight
    // extension tail, instead of a single straight line to a point.
    const renderHook = (hook: HookGeometry, key: string) => {
      const { p1, p2, sweepCcw, largeArc } = computeFilletArc(hook.basePoint, hook.baseHeading, hook.hookHeading, hook.radius);
      const sx1 = mapX(p1.x), sy1 = mapY(p1.y);
      const sx2 = mapX(p2.x), sy2 = mapY(p2.y);
      const tipX = mapX(hook.tipPoint.x), tipY = mapY(hook.tipPoint.y);
      const arcR = Math.max(2, hook.radius * scale);
      const hasArc = Math.abs(hook.turnAngle) > 1;
      return (
        <g key={key}>
          {hasArc && (
            <path
              d={`M ${sx1} ${sy1} A ${arcR} ${arcR} 0 ${largeArc ? 1 : 0} ${sweepCcw ? 1 : 0} ${sx2} ${sy2}`}
              fill="none"
              stroke={hookColor}
              strokeWidth={5}
              strokeLinecap="round"
            />
          )}
          <line x1={sx2} y1={sy2} x2={tipX} y2={tipY} stroke={hookColor} strokeWidth={5} strokeLinecap="round" />
          <circle cx={tipX} cy={tipY} r={3.5} fill={hookColor} />
          <text
            x={tipX}
            y={hook.label === 'Start Hook' ? tipY - 8 : tipY + 14}
            textAnchor="middle"
            className="text-[10px] font-mono fill-amber-600 dark:fill-amber-400 font-bold"
          >
            {hook.label} ({hook.hookHeading.toFixed(0)}{'\u00b0'}, +{hook.extensionLength.toFixed(3)}m)
          </text>
        </g>
      );
    };

    drawing = (
      <g>
        {geo.startHook && renderHook(geo.startHook, 'start-hook')}

        {/* Custom Segments Polyline */}
        {geo.segments.map((seg, i) => {
          const x1 = mapX(seg.start.x);
          const y1 = mapY(seg.start.y);
          const x2 = mapX(seg.end.x);
          const y2 = mapY(seg.end.y);
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;

          return (
            <g key={seg.id}>
              <line
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={rebarColor}
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* Node vertex */}
              <circle cx={x1} cy={y1} r={4} fill={rebarColor} />

              {/* Segment Label and length badge */}
              <g transform={`translate(${mx}, ${my - 12})`}>
                <rect
                  x={-32}
                  y={-10}
                  width={64}
                  height={18}
                  rx={4}
                  className="fill-white/90 dark:fill-slate-950/90 stroke-slate-300/80 dark:stroke-slate-800"
                  strokeWidth={0.8}
                />
                <text
                  x={0}
                  y={3}
                  textAnchor="middle"
                  className="text-[10px] font-mono font-bold fill-cyan-600 dark:fill-cyan-300"
                >
                  {seg.label}: {seg.length.toFixed(3)}m
                </text>
              </g>

              {/* Bend angle & deduction badge at vertex between segments */}
              {i > 0 && (
                <g transform={`translate(${x1}, ${y1 + 14})`}>
                  <text
                    x={0}
                    y={0}
                    textAnchor="middle"
                    className="text-[9px] font-mono fill-amber-600 dark:fill-amber-400 font-semibold"
                  >
                    {'\u2220'}{seg.turnAngle.toFixed(1)}{'\u00b0'} (-{seg.bendDeductionMeters.toFixed(3)}m)
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {geo.endHook && renderHook(geo.endHook, 'end-hook')}
      </g>
    );
  } else {
    // Standard shapes
    switch (shapeCode) {
      case '00': {
        const startX = 60;
        const endX = 440;
        const y = 130;
        drawing = (
          <g>
            <line x1={startX} y1={y} x2={endX} y2={y} stroke={rebarColor} strokeWidth={6} strokeLinecap="round" />
            <line x1={startX} y1={y - 30} x2={endX} y2={y - 30} stroke={dimLineColor} strokeWidth={1.5} strokeDasharray="3,3" />
            <line x1={startX} y1={y - 40} x2={startX} y2={y - 20} stroke={dimLineColor} strokeWidth={1.5} />
            <line x1={endX} y1={y - 40} x2={endX} y2={y - 20} stroke={dimLineColor} strokeWidth={1.5} />
            <text x={(startX + endX) / 2} y={y - 38} textAnchor="middle" fill={dimColor} className="text-xs font-mono font-medium">
              A = {dimA.toFixed(3)} m
            </text>
          </g>
        );
        break;
      }

      case '11': {
        const startX = 80;
        const cornerX = 400;
        const bottomY = 190;
        const topY = 70;
        drawing = (
          <g>
            <path
              d={`M ${startX} ${bottomY} L ${cornerX - 6} ${bottomY} Q ${cornerX} ${bottomY} ${cornerX} ${bottomY - 6} L ${cornerX} ${topY}`}
              fill="none"
              stroke={rebarColor}
              strokeWidth={6}
              strokeLinecap="round"
            />
            <path d={`M ${cornerX - 25} ${bottomY} A 25 25 0 0 0 ${cornerX} ${bottomY - 25}`} fill="none" stroke={hookColor} strokeWidth={2} />
            <text x={cornerX - 35} y={bottomY - 28} fill={hookColor} className="text-[10px] font-mono">
              90° (-2d)
            </text>
            <line x1={startX} y1={bottomY + 30} x2={cornerX} y2={bottomY + 30} stroke={dimLineColor} strokeWidth={1.5} strokeDasharray="3,3" />
            <text x={(startX + cornerX) / 2} y={bottomY + 45} textAnchor="middle" fill={dimColor} className="text-xs font-mono">
              A = {dimA.toFixed(3)} m
            </text>
            <line x1={cornerX + 30} y1={topY} x2={cornerX + 30} y2={bottomY} stroke={dimLineColor} strokeWidth={1.5} strokeDasharray="3,3" />
            <text x={cornerX + 45} y={(topY + bottomY) / 2} textAnchor="start" dominantBaseline="middle" fill={dimColor} className="text-xs font-mono">
              B = {dimB.toFixed(3)} m
            </text>
          </g>
        );
        break;
      }

      case '21': {
        const leftX = 100;
        const rightX = 400;
        const topY = 70;
        const bottomY = 190;
        drawing = (
          <g>
            <path
              d={`M ${leftX} ${topY} L ${leftX} ${bottomY - 6} Q ${leftX} ${bottomY} ${leftX + 6} ${bottomY} L ${rightX - 6} ${bottomY} Q ${rightX} ${bottomY} ${rightX} ${bottomY - 6} L ${rightX} ${topY}`}
              fill="none"
              stroke={rebarColor}
              strokeWidth={6}
              strokeLinecap="round"
            />
            <circle cx={leftX} cy={bottomY} r={14} fill="none" stroke={hookColor} strokeWidth={1.5} strokeDasharray="2,2" />
            <circle cx={rightX} cy={bottomY} r={14} fill="none" stroke={hookColor} strokeWidth={1.5} strokeDasharray="2,2" />
            <text x={leftX - 35} y={bottomY - 5} fill={hookColor} className="text-[10px] font-mono">90°</text>
            <text x={rightX + 15} y={bottomY - 5} fill={hookColor} className="text-[10px] font-mono">90°</text>
            <text x={leftX - 15} y={(topY + bottomY) / 2} textAnchor="end" fill={dimColor} className="text-xs font-mono">
              A = {dimA.toFixed(3)} m
            </text>
            <text x={(leftX + rightX) / 2} y={bottomY + 35} textAnchor="middle" fill={dimColor} className="text-xs font-mono">
              B = {dimB.toFixed(3)} m
            </text>
            <text x={rightX + 15} y={(topY + bottomY) / 2} textAnchor="start" fill={dimColor} className="text-xs font-mono">
              C = {dimC.toFixed(3)} m
            </text>
          </g>
        );
        break;
      }

      case '51': {
        const x = 120;
        const y = 45;
        const w = 260;
        const h = 150;
        drawing = (
          <g>
            <rect x={x} y={y} width={w} height={h} rx={8} fill="none" stroke={rebarColor} strokeWidth={6} />
            <path d={`M ${x + 40} ${y} L ${x + 5} ${y + 35}`} fill="none" stroke={hookColor} strokeWidth={5} strokeLinecap="round" />
            <path d={`M ${x} ${y + 40} L ${x + 35} ${y + 5}`} fill="none" stroke={hookColor} strokeWidth={5} strokeLinecap="round" />
            <text x={x - 20} y={y + 15} fill={hookColor} className="text-[11px] font-mono font-medium">
              135° Seismic Hooks (min 10d / 75mm)
            </text>
            <line x1={x} y1={y + h + 25} x2={x + w} y2={y + h + 25} stroke={dimLineColor} strokeWidth={1.5} strokeDasharray="3,3" />
            <text x={x + w / 2} y={y + h + 42} textAnchor="middle" fill={dimColor} className="text-xs font-mono">
              A = {dimA.toFixed(3)} m
            </text>
            <line x1={x + w + 25} y1={y} x2={x + w + 25} y2={y + h} stroke={dimLineColor} strokeWidth={1.5} strokeDasharray="3,3" />
            <text x={x + w + 40} y={y + h / 2} textAnchor="start" dominantBaseline="middle" fill={dimColor} className="text-xs font-mono">
              B = {dimB.toFixed(3)} m
            </text>
          </g>
        );
        break;
      }

      case '41': {
        drawing = (
          <g>
            <path
              d="M 50 170 L 140 170 L 200 90 L 300 90 L 360 170 L 450 170"
              fill="none"
              stroke={rebarColor}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x={160} y={150} fill={hookColor} className="text-[10px] font-mono">45°</text>
            <text x={330} y={150} fill={hookColor} className="text-[10px] font-mono">45°</text>
            <text x={95} y={195} textAnchor="middle" fill={dimColor} className="text-[11px] font-mono">A={dimA.toFixed(3)}</text>
            <text x={190} y={75} textAnchor="middle" fill={dimColor} className="text-[11px] font-mono">H={dimB.toFixed(3)}</text>
            <text x={250} y={75} textAnchor="middle" fill={dimColor} className="text-[11px] font-mono">C={dimC.toFixed(3)}</text>
            <text x={405} y={195} textAnchor="middle" fill={dimColor} className="text-[11px] font-mono">E={dimE.toFixed(3)}</text>
          </g>
        );
        break;
      }

      case '31': {
        drawing = (
          <g>
            <path
              d="M 70 200 L 140 200 L 140 80 L 360 80 L 360 200 L 430 200"
              fill="none"
              stroke={rebarColor}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x={250} y={65} textAnchor="middle" fill={dimColor} className="text-xs font-mono">Head A = {dimA.toFixed(3)} m</text>
            <text x={115} y={140} textAnchor="end" fill={dimColor} className="text-xs font-mono">Height B = {dimB.toFixed(3)} m</text>
            <text x={105} y={225} textAnchor="middle" fill={dimColor} className="text-xs font-mono">Foot C = {dimC.toFixed(3)} m</text>
            <text x={395} y={225} textAnchor="middle" fill={dimColor} className="text-xs font-mono">Foot C = {dimC.toFixed(3)} m</text>
          </g>
        );
        break;
      }

      case '71': {
        drawing = (
          <g>
            <path
              d="M 120 190 L 120 90 L 380 90 L 380 190"
              fill="none"
              stroke={rebarColor}
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x={105} y={140} textAnchor="end" fill={dimColor} className="text-xs font-mono">A = {dimA.toFixed(3)} m</text>
            <text x={250} y={75} textAnchor="middle" fill={dimColor} className="text-xs font-mono">B = {dimB.toFixed(3)} m</text>
            <text x={395} y={140} textAnchor="start" fill={dimColor} className="text-xs font-mono">C = {dimC.toFixed(3)} m</text>
          </g>
        );
        break;
      }

      case '61': {
        drawing = (
          <g>
            <path
              d="M 120 70 L 120 140 L 380 140 L 380 210"
              fill="none"
              stroke={rebarColor}
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <text x={105} y={105} textAnchor="end" fill={dimColor} className="text-xs font-mono">B = {dimB.toFixed(3)} m</text>
            <text x={250} y={125} textAnchor="middle" fill={dimColor} className="text-xs font-mono">A = {dimA.toFixed(3)} m</text>
            <text x={395} y={175} textAnchor="start" fill={dimColor} className="text-xs font-mono">B = {dimB.toFixed(3)} m</text>
          </g>
        );
        break;
      }

      case '81': {
        drawing = (
          <g>
            <polygon points="250,40 400,130 250,220 100,130" fill="none" stroke={rebarColor} strokeWidth={5} strokeLinejoin="round" />
            <path d="M 235 48 L 265 48" stroke={hookColor} strokeWidth={4} strokeLinecap="round" />
            <text x={250} y={25} textAnchor="middle" fill={dimColor} className="text-xs font-mono">Width A = {dimA.toFixed(3)} m</text>
            <text x={425} y={130} textAnchor="start" fill={dimColor} className="text-xs font-mono">Depth B = {dimB.toFixed(3)} m</text>
          </g>
        );
        break;
      }

      case '77': {
        drawing = (
          <g>
            <circle cx="250" cy="130" r="80" fill="none" stroke={rebarColor} strokeWidth={5} />
            <path d="M 230 50 L 270 50" stroke={hookColor} strokeWidth={5} strokeLinecap="round" />
            <text x={250} y={135} textAnchor="middle" fill={dimColor} className="text-sm font-mono font-semibold">
              Core Dia D = {dimA.toFixed(3)} m
            </text>
            <text x={250} y={35} textAnchor="middle" fill={hookColor} className="text-xs font-mono">
              Lap = {dimB > 0 ? dimB.toFixed(3) : '40d'} m
            </text>
          </g>
        );
        break;
      }

      default: {
        drawing = (
          <g>
            <line x1="80" y1="130" x2="420" y2="130" stroke={rebarColor} strokeWidth={6} strokeLinecap="round" />
            <text x="250" y="100" textAnchor="middle" fill={dimColor} className="text-sm font-mono">
              Length A = {dimA.toFixed(3)} m
            </text>
          </g>
        );
      }
    }
  }

  return (
    <div className={`flex flex-col bg-slate-950/80 dark:bg-slate-950/90 rounded-lg border border-slate-200 dark:border-slate-800 p-3 ${className}`}>
      {/* SVG Container */}
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full max-h-56">
          <defs>
            <pattern id="cadGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cadGrid)" />
          {drawing}
        </svg>
      </div>

      {/* Formula & Technical Deduction Breakdown */}
      <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-1 text-xs">
        <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {customShapeName ? customShapeName : `Shape ${shapeDef.code} (${shapeDef.isCode} / ${shapeDef.bsCode}): ${shapeDef.name}`}
          </span>
          <span className="font-mono text-cyan-400 font-bold text-sm">
            Cutting Length = {calc.cuttingLength.toFixed(3)} m
          </span>
        </div>
        <div className="text-slate-600 dark:text-slate-400 font-mono text-[11px] bg-slate-100 dark:bg-slate-900/90 p-1.5 rounded border border-slate-200 dark:border-slate-800/80 break-all">
          {calc.formulaExplanation}
        </div>
        <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-400">
          <span>Straight: {calc.totalStraightLength.toFixed(3)}m</span>
          <span>·</span>
          <span>Bend Deductions: -{calc.totalBendDeductions.toFixed(3)}m</span>
          {calc.hookExtensions > 0 && (
            <>
              <span>·</span>
              <span>Hook Additions: +{calc.hookExtensions.toFixed(3)}m</span>
            </>
          )}
          <span>·</span>
          <span>Nominal Rebar: {diameter} mm</span>
        </div>
      </div>
    </div>
  );
};
