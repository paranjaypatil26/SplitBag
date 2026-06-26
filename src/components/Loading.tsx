import React from 'react';

export const LoadingScreen: React.FC<{ text?: string }> = ({ text = 'Loading...' }) => (
  <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-brand-navy">
    <div className="relative w-16 h-16">
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#00A8CC] border-b-[#00A8CC] animate-spin" />
      <div className="absolute inset-2 rounded-full border-4 border-transparent border-l-[#F97316] border-r-[#F97316] animate-spin [animation-direction:reverse] [animation-duration:1s]" />
    </div>
    <p className="text-brand-muted/70 text-sm font-sans mt-2">{text}</p>
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
    <div className="w-16 h-16 rounded-2xl bg-brand-card border border-white/[0.08] flex items-center justify-center text-brand-cyan text-3xl shadow-lg shadow-black/25">
      {icon}
    </div>
    <div className="space-y-1">
      <p className="text-white font-display font-semibold text-lg">{title}</p>
      <p className="text-brand-muted/70 text-sm max-w-xs font-sans">{description}</p>
    </div>
    {action}
  </div>
);
