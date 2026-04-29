import type { Room, ItemSubmission, MemberPayment } from './types';

// ============================================================
// Room Code Generation
// ============================================================
export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============================================================
// Countdown helpers
// ============================================================
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function getCountdownClass(ms: number): string {
  if (ms <= 60_000) return 'countdown-red';
  if (ms <= 180_000) return 'countdown-amber';
  return '';
}

// ============================================================
// UPI deep-link generator
// ============================================================
export function generateUPILink(params: {
  upiId: string;
  name: string;
  amount: number;
  roomCode: string;
}): string {
  const note = encodeURIComponent(`DropRun Room${params.roomCode}`);
  const pn = encodeURIComponent(params.name);
  return `upi://pay?pa=${params.upiId}&pn=${pn}&am=${params.amount.toFixed(2)}&cu=INR&tn=${note}`;
}

// ============================================================
// Delivery fee calculation
// ============================================================
export function calcDeliveryFee(totalCartValue: number, threshold: number): number {
  return totalCartValue >= threshold ? 0 : 30;
}

export function calcMemberDeliveryShare(
  memberSubtotal: number,
  totalCartValue: number,
  deliveryFee: number
): number {
  if (totalCartValue === 0 || deliveryFee === 0) return 0;
  return Math.round((memberSubtotal / totalCartValue) * deliveryFee);
}

// ============================================================
// DEMO DATA (pre-seeded completed run)
// ============================================================
const NOW = Date.now();

export const DEMO_ROOM: Room = {
  roomCode: 'DEMO01',
  captainUid: 'captain-demo',
  captainName: 'Arjun S.',
  captainUPI: 'arjun@upi',
  building: 'Hostel Block C – IIT Delhi',
  platform: 'Blinkit',
  status: 'delivered',
  expiryTime: NOW - 3_600_000,
  threshold: 200,
  deliveryFee: 0,
  totalCartValue: 680,
  memberCount: 4,
  createdAt: NOW - 5_400_000,
};

export const DEMO_ITEMS: ItemSubmission[] = [
  {
    id: 'd1',
    memberUid: 'uid-rahul',
    memberName: 'Rahul',
    itemLink: 'https://blinkit.com/prn/lays-magic-masala-26g/prid/397662',
    itemName: 'Lays Magic Masala 26g',
    price: 20,
    quantity: 3,
    subtotal: 60,
    oosPreference: 'substitute',
    status: 'added',
    submittedAt: NOW - 5_000_000,
  },
  {
    id: 'd2',
    memberUid: 'uid-rahul',
    memberName: 'Rahul',
    itemLink: 'https://blinkit.com/prn/red-bull/prid/123456',
    itemName: 'Red Bull 250ml',
    price: 120,
    quantity: 1,
    subtotal: 120,
    oosPreference: 'cancel',
    status: 'added',
    submittedAt: NOW - 4_900_000,
  },
  {
    id: 'd3',
    memberUid: 'uid-priya',
    memberName: 'Priya',
    itemLink: 'https://blinkit.com/prn/amul-milk/prid/234567',
    itemName: 'Amul Toned Milk 500ml',
    price: 30,
    quantity: 2,
    subtotal: 60,
    oosPreference: 'substitute',
    status: 'added',
    submittedAt: NOW - 4_800_000,
  },
  {
    id: 'd4',
    memberUid: 'uid-karan',
    memberName: 'Karan',
    itemLink: 'https://blinkit.com/prn/maggi-noodles/prid/345678',
    itemName: 'Maggi 2-Minute Noodles 70g × 4',
    price: 80,
    quantity: 2,
    subtotal: 160,
    oosPreference: 'substitute',
    status: 'added',
    submittedAt: NOW - 4_700_000,
  },
  {
    id: 'd5',
    memberUid: 'uid-sneha',
    memberName: 'Sneha',
    itemLink: 'https://blinkit.com/prn/amul-butter/prid/456789',
    itemName: 'Amul Butter 100g',
    price: 55,
    quantity: 2,
    subtotal: 110,
    oosPreference: 'cancel',
    status: 'added',
    submittedAt: NOW - 4_600_000,
  },
  {
    id: 'd6',
    memberUid: 'uid-sneha',
    memberName: 'Sneha',
    itemLink: 'https://blinkit.com/prn/bread/prid/567890',
    itemName: 'Modern Bread White 300g',
    price: 40,
    quantity: 1,
    subtotal: 40,
    oosPreference: 'substitute',
    status: 'oos',
    submittedAt: NOW - 4_500_000,
  },
];

export const DEMO_PAYMENTS: MemberPayment[] = [
  { memberUid: 'uid-rahul',  memberName: 'Rahul', subtotal: 180, deliveryShare: 0, total: 180, paymentStatus: 'paid', itemCount: 2 },
  { memberUid: 'uid-priya',  memberName: 'Priya', subtotal: 60,  deliveryShare: 0, total: 60,  paymentStatus: 'paid', itemCount: 1 },
  { memberUid: 'uid-karan',  memberName: 'Karan', subtotal: 160, deliveryShare: 0, total: 160, paymentStatus: 'paid', itemCount: 1 },
  { memberUid: 'uid-sneha',  memberName: 'Sneha', subtotal: 150, deliveryShare: 0, total: 150, paymentStatus: 'paid', itemCount: 2 },
];
