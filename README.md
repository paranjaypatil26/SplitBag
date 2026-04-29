# ⚡ DropRun

**Hyper-local order aggregator** — pool your Blinkit/Zepto/Instamart orders with your building mates through a single Captain who places one consolidated order.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS v3 |
| Realtime DB | Firebase Firestore (onSnapshot listeners) |
| Auth | Firebase Anonymous Auth |
| Payments | UPI deep-link + QR code (no gateway) |
| Hosting | Firebase Hosting / Vercel |

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone <repo>
cd droprun
npm install
```

### 2. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Anonymous Authentication** (Authentication → Sign-in method → Anonymous)
4. Create a **Firestore Database** (start in test mode, then apply the rules below)
5. Go to **Project Settings → General → Your apps** and add a Web app
6. Copy the config object

### 3. Configure Environment Variables

Edit `.env` in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
```

### 4. Deploy Firestore Security Rules

Paste the contents of `firestore.rules` in the Firebase Console, or:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore
firebase deploy --only firestore:rules
```

### 5. Run Locally

```bash
npm run dev
# Visit http://localhost:5173
```

---

## App Flow

```
Home
├── Create Room (Captain)
│   └── → Captain Dashboard
│       ├── Share 6-digit Room Code
│       ├── Watch live item feed / mark Added / OOS
│       ├── Lock Room → Payment Splits page
│       ├── Mark as Ordered → Waiting banner on all members
│       └── Mark as Delivered → Handoff screen
│
└── Join Room (Member) — enter 6-digit code
    └── → Member Dashboard
        ├── Add items (link, name, price, qty, OOS pref)
        ├── Watch live item status updates
        └── Pay Captain via UPI QR (visible after lock)
```

---

## Firestore Data Model

### `rooms/{roomCode}`
```json
{
  "roomCode": "ABC123",
  "captainUid": "uid",
  "captainName": "Arjun",
  "captainUPI": "arjun@upi",
  "building": "Hostel Block C",
  "platform": "Blinkit",
  "status": "open | locked | ordering | delivered | dissolved",
  "expiryTime": 1714000000000,
  "threshold": 200,
  "deliveryFee": 30,
  "totalCartValue": 0,
  "memberCount": 1,
  "createdAt": 1714000000000
}
```

### `rooms/{roomCode}/items/{itemId}`
```json
{
  "memberUid": "uid",
  "memberName": "Rahul",
  "itemLink": "https://blinkit.com/...",
  "itemName": "Lays Magic Masala 26g",
  "price": 20,
  "quantity": 3,
  "subtotal": 60,
  "oosPreference": "substitute | cancel",
  "status": "pending | added | oos",
  "submittedAt": 1714000000000
}
```

### `rooms/{roomCode}/payments/{memberUid}`
```json
{ "memberUid": "uid", "paymentStatus": "pending | paid" }
```

---

## Features

- ✅ Anonymous auth — no signup required  
- ✅ 6-digit room code generation  
- ✅ Real-time updates via Firestore `onSnapshot` across all clients  
- ✅ Countdown timer (amber at 3 min, red at 1 min)  
- ✅ Auto 5-min extension if ≥75% of threshold hit at expiry  
- ✅ Auto-dissolve if threshold not hit  
- ✅ Duplicate link detection with confirmation dialog  
- ✅ OOS handling: substitute or cancel (auto-adjusts totals)  
- ✅ Proportional delivery fee splitting  
- ✅ UPI deep-link + QR code (qrcode.react)  
- ✅ Captain payment toggle + member self-report  
- ✅ Captain re-entry via room code (matched by UID)  
- ✅ Late joiner protection  
- ✅ Demo session page for presentations  

---

## Deployment

### Vercel
```bash
npm run build
# Push to GitHub, connect to Vercel
# Add all VITE_FIREBASE_* env vars in the Vercel dashboard
```

### Firebase Hosting
```bash
firebase init hosting   # public dir: dist, SPA: yes
npm run build
firebase deploy
```

---

## License

MIT — built as a demo project.
