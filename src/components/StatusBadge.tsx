import React from 'react';
import type { RoomStatus } from '../types';

interface StatusBadgeProps {
  status: RoomStatus;
}

const labels: Record<RoomStatus, string> = {
  open: 'OPEN',
  locked: 'LOCKED',
  ordering: 'ORDERING',
  delivered: 'DELIVERED',
  dissolved: 'DISSOLVED',
};

const classes: Record<RoomStatus, string> = {
  open: 'badge-open',
  locked: 'badge-locked',
  ordering: 'badge-ordering',
  delivered: 'badge-delivered',
  dissolved: 'badge-dissolved',
};

const dots: Record<RoomStatus, string> = {
  open: 'bg-emerald-400',
  locked: 'bg-amber-400',
  ordering: 'bg-indigo-400',
  delivered: 'bg-purple-400',
  dissolved: 'bg-red-400',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => (
  <span className={classes[status]}>
    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${dots[status]} ${status === 'open' ? 'animate-pulse' : ''}`} />
    {labels[status]}
  </span>
);
