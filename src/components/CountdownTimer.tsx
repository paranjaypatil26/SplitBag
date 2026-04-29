import React, { useEffect, useState } from 'react';
import { formatCountdown, getCountdownClass } from '../utils';

interface CountdownTimerProps {
  expiryTime: number;
  onExpired?: () => void;
  large?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({ expiryTime, onExpired, large }) => {
  const [remaining, setRemaining] = useState(expiryTime - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      const r = expiryTime - Date.now();
      setRemaining(r);
      if (r <= 0 && onExpired) {
        onExpired();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiryTime, onExpired]);

  const display = formatCountdown(Math.max(0, remaining));
  const cls = getCountdownClass(remaining);

  if (large) {
    return (
      <div className={`font-mono font-bold text-4xl tracking-widest ${cls || 'text-white'}`}>
        {display}
      </div>
    );
  }
  return (
    <span className={`font-mono font-semibold text-lg ${cls || 'text-white/80'}`}>
      {display}
    </span>
  );
};
