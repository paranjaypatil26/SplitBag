// ============================================================
// Shared TypeScript types for DropRun
// ============================================================

export type RoomStatus = 'open' | 'locked' | 'ordering' | 'delivered' | 'dissolved';
export type ItemStatus = 'pending' | 'added' | 'oos';
export type OOSPreference = 'substitute' | 'cancel';
export type Platform = 'Blinkit' | 'Zepto' | 'Swiggy Instamart';
export type PaymentStatus = 'pending' | 'paid';

export interface Room {
  roomCode: string;
  captainUid: string;
  captainName: string;
  captainUPI?: string;
  building: string;
  platform: Platform;
  status: RoomStatus;
  expiryTime: number; // unix ms timestamp
  threshold: number;
  deliveryFee: number;
  totalCartValue: number;
  memberCount: number;
  createdAt: number;
}

export interface ItemSubmission {
  id?: string;
  memberUid: string;
  memberName: string;
  itemLink: string;
  itemName: string;
  price: number;
  quantity: number;
  subtotal: number;
  oosPreference: OOSPreference;
  status: ItemStatus;
  submittedAt: number;
  paymentStatus?: PaymentStatus;
}

export interface MemberPayment {
  memberUid: string;
  memberName: string;
  subtotal: number;
  deliveryShare: number;
  total: number;
  paymentStatus: PaymentStatus;
  itemCount: number;
}

export interface DemoRoom extends Room {
  items: ItemSubmission[];
  payments: MemberPayment[];
}
