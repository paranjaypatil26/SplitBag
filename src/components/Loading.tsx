import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingScreen: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4">
    <div className="relative">
      <div className="w-16 h-16 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full bg-indigo-600/20 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
        </div>
      </div>
    </div>
    <p className="text-white/50 text-sm">{text}</p>
  </div>
);

export const SkeletonCard: React.FC = () => (
  <div className="card p-4 space-y-3 animate-pulse">
    <div className="flex gap-3 items-center">
      <div className="skeleton w-8 h-8 rounded-full" />
      <div className="space-y-1 flex-1">
        <div className="skeleton h-4 w-1/3 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full" />
    </div>
    <div className="skeleton h-3 w-full rounded" />
    <div className="skeleton h-3 w-3/4 rounded" />
  </div>
);

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-4">
    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 text-3xl">
      {icon}
    </div>
    <div className="space-y-1">
      <p className="text-white/70 font-semibold">{title}</p>
      <p className="text-white/40 text-sm max-w-xs">{description}</p>
    </div>
    {action}
  </div>
);
