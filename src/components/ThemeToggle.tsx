import React from 'react';
import { useTheme } from '../ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.18] transition-all duration-200 group flex items-center justify-center text-brand-muted hover:text-white"
      title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
      aria-label="Toggle theme"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-brand-teal animate-pulse-once" />
      ) : (
        <Sun className="w-5 h-5 text-brand-orange animate-pulse-once" />
      )}
    </button>
  );
};
