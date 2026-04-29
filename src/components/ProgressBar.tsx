import React, { useEffect, useRef } from 'react';

interface ProgressBarProps {
  value: number;      // current value
  threshold: number;  // target
  animate?: boolean;  // pulse on update
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, threshold, animate }) => {
  const pct = Math.min((value / threshold) * 100, 100);
  const reached = pct >= 100;
  const barRef = useRef<HTMLDivElement>(null);
  const prevPct = useRef(pct);

  useEffect(() => {
    if (pct !== prevPct.current && barRef.current) {
      barRef.current.classList.add('threshold-reached');
      setTimeout(() => barRef.current?.classList.remove('threshold-reached'), 3000);
    }
    prevPct.current = pct;
  }, [pct]);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-white/60">Cart Value</span>
        <span className={reached ? 'text-emerald-400 font-bold' : 'text-white/80'}>
          ₹{value.toFixed(0)}{' '}
          <span className="text-white/40">/ ₹{threshold}</span>
          {reached && <span className="ml-1 text-emerald-400">✓ Free delivery!</span>}
        </span>
      </div>
      <div className="progress-bar-container" ref={barRef}>
        <div
          className={`progress-bar-fill ${animate ? 'animate-bounce-subtle' : ''}`}
          style={{ width: `${pct}%` }}
        />
        {!reached && (
          <div className="absolute inset-0 flex items-center justify-end pr-2">
            <span className="text-[10px] text-white/40 font-medium">
              ₹{Math.max(0, threshold - value).toFixed(0)} to go
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
