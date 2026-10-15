import React from 'react';

interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  badge?: number | string;
  accentClass?: string;
  size?: 'sm' | 'md';
}

/**
 * A compact, icon-only toolbar button with a native tooltip (title) so the
 * toolbar stays uncluttered while remaining fully explorable/accessible.
 * Consistent light/dark styling lives here in one place instead of being
 * repeated (and drifting) across every call site.
 */
export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  label,
  onClick,
  active = false,
  badge,
  accentClass,
  size = 'md',
}) => {
  const dim = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`relative flex items-center justify-center ${dim} rounded-lg border transition-colors cursor-pointer shrink-0 ${
        active
          ? 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-400/50 dark:border-cyan-500/40'
          : accentClass ||
            'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800'
      }`}
    >
      {icon}
      {badge !== undefined && badge !== 0 && badge !== '' && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-cyan-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
          {badge}
        </span>
      )}
    </button>
  );
};
