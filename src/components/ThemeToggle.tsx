import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { AppTheme } from '../utils/theme';

interface ThemeToggleProps {
  theme: AppTheme;
  onToggle: () => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle, className = '' }) => {
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all duration-200 cursor-pointer ${
        isDark
          ? 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-amber-300 hover:bg-slate-200 hover:dark:bg-slate-800 hover:border-slate-400 hover:dark:border-slate-600'
          : 'bg-white border-slate-700 dark:border-slate-300 text-indigo-700 hover:bg-slate-950 hover:dark:bg-slate-50 hover:border-slate-600 hover:dark:border-slate-400 shadow-xs'
      } ${className}`}
      title={isDark ? 'Switch to Light Theme (Paper / Blueprint)' : 'Switch to Dark Theme (Studio / CAD)'}
      aria-label="Toggle theme"
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
          <span className="hidden sm:inline text-slate-700 dark:text-slate-300 text-[11px]">Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline text-slate-300 dark:text-slate-700 text-[11px]">Dark Mode</span>
        </>
      )}
    </button>
  );
};
