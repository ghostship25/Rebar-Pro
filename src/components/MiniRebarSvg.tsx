import React from 'react';
import { ShapeCode } from '../types/bbs';

interface MiniRebarSvgProps {
  shapeCode: ShapeCode;
  dimA?: number;
  dimB?: number;
  dimC?: number;
  className?: string;
}

export const MiniRebarSvg: React.FC<MiniRebarSvgProps> = ({
  shapeCode,
  className = 'w-20 h-10',
}) => {
  const strokeColor = '#38bdf8'; // Sky blue engineering rebar
  const strokeWidth = 2.5;

  let pathContent: React.ReactNode = null;

  switch (shapeCode) {
    case '00': // Straight
      pathContent = (
        <line x1="8" y1="20" x2="72" y2="20" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" />
      );
      break;

    case '11': // L-Bar (90 deg hook)
      pathContent = (
        <path d="M 12 30 L 68 30 L 68 10" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      );
      break;

    case '21': // U-Bar
      pathContent = (
        <path d="M 14 10 L 14 30 L 66 30 L 66 10" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      );
      break;

    case '51': // Rectangular Stirrup with 135 deg hooks
      pathContent = (
        <g>
          <rect x="18" y="8" width="44" height="24" rx="2" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
          {/* 135 degree seismic hooks in corner */}
          <path d="M 28 8 L 22 14" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
          <path d="M 18 18 L 24 12" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
        </g>
      );
      break;

    case '41': // Cranked bar at 45 deg
      pathContent = (
        <path d="M 8 28 L 24 28 L 36 12 L 52 12 L 64 28 L 72 28" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      );
      break;

    case '31': // Chair / Stool bar
      pathContent = (
        <path d="M 10 32 L 24 32 L 24 12 L 56 12 L 56 32 L 70 32" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      );
      break;

    case '71': // Capping bar
      pathContent = (
        <path d="M 16 30 L 16 12 L 64 12 L 64 30" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      );
      break;

    case '61': // 45 deg haunch tie
      pathContent = (
        <path d="M 18 10 L 18 22 L 62 22 L 62 34" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      );
      break;

    case '81': // Diamond tie
      pathContent = (
        <polygon points="40,6 66,20 40,34 14,20" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinejoin="round" />
      );
      break;

    case '77': // Circular hoop
      pathContent = (
        <g>
          <circle cx="40" cy="20" r="14" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} />
          <path d="M 36 6 L 46 6" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" />
        </g>
      );
      break;

    case '99': // Custom
      pathContent = (
        <path d="M 10 28 L 30 28 L 45 12 L 68 18" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
      );
      break;

    default:
      pathContent = <line x1="10" y1="20" x2="70" y2="20" stroke={strokeColor} strokeWidth={strokeWidth} />;
  }

  return (
    <svg viewBox="0 0 80 40" className={`${className} bg-slate-50 dark:bg-slate-950/60 rounded border border-slate-200 dark:border-slate-800 p-0.5`}>
      {pathContent}
    </svg>
  );
};
