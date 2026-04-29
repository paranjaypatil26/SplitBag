import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { generateUPILink } from '../utils';
import toast from 'react-hot-toast';
import { supabase } from '../supabase';

interface UPIModalProps {
  amount: number;
  captainUPI: string;
  captainName: string;
  roomCode: string;
  memberUid: string;
  memberName: string;
  onClose: () => void;
  onPaid: () => void;
}

export const UPIModal: React.FC<UPIModalProps> = ({
  amount, captainUPI, captainName, roomCode, memberUid, memberName, onClose, onPaid,
}) => {
  const [marking, setMarking] = useState(false);
  const upiLink = generateUPILink({ upiId: captainUPI, amount, name: captainName, roomCode });

  const handleMarkPaid = async () => {
    setMarking(true);
    try {
      const { error } = await supabase.from('payments').upsert(
        { room_code: roomCode, member_uid: memberUid, member_name: memberName, payment_status: 'paid' },
        { onConflict: 'room_code,member_uid' }
      );
      if (error) throw error;
      toast.success('Marked as paid!');
      onPaid();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update payment status');
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="card w-full max-w-sm p-6 space-y-5 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-1">
          <h2 className="text-white font-bold text-lg">Pay {captainName}</h2>
          <p className="text-white/40 text-sm">via UPI</p>
        </div>

        <div className="flex justify-center">
          <div className="bg-white p-3 rounded-xl">
            <QRCodeCanvas value={upiLink} size={180} />
          </div>
        </div>

        <div className="text-center space-y-0.5">
          <div className="text-3xl font-black text-white">₹{amount}</div>
          <div className="text-white/40 text-sm font-mono">{captainUPI}</div>
        </div>

        <a
          href={upiLink}
          className="btn-primary flex items-center justify-center gap-2 w-full py-3"
        >
          Open UPI App
        </a>

        <button
          id="mark-paid-btn"
          onClick={handleMarkPaid}
          disabled={marking}
          className="btn-secondary w-full flex items-center justify-center gap-2 py-3"
        >
          {marking ? <Loader2 className="w-4 h-4 animate-spin" /> : '✓ Mark as Paid'}
        </button>

        <p className="text-center text-white/30 text-xs">
          Scan the QR or tap "Open UPI App", then mark as paid once done
        </p>
      </div>
    </div>
  );
};
