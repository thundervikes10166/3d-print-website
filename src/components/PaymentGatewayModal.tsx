import React from 'react';
import {
  X,
  Banknote,
  MessageCircle,
} from 'lucide-react';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  orderTitle?: string;
  suggestedAmount?: number;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  orderId,
  orderTitle,
  suggestedAmount = 2.5,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="relative w-full max-w-md bg-white rounded-lg border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-[#C41E3A] px-5 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="w-4 h-4 text-white/90" />
            <div>
              <h3 className="font-extrabold text-sm uppercase tracking-tight">
                Payment Instructions
              </h3>
              <p className="text-[10px] text-white/80 font-mono">
                ROOM Q10 MATERIAL ALLOCATION
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded text-white/90 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="space-y-4">
              {orderTitle && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded flex items-center justify-between text-xs">
                  <div className="truncate max-w-[220px]">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">
                      Target Print
                    </span>
                    <strong className="text-slate-900 truncate block">
                      {orderTitle}
                    </strong>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-mono text-slate-400 block">
                      Deposit
                    </span>
                    <strong className="font-mono text-[#C41E3A] font-bold text-sm">
                      ${suggestedAmount.toFixed(2)}
                    </strong>
                  </div>
                </div>
              )}

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 font-bold uppercase tracking-wide">
                  <Banknote className="w-4 h-4" />
                  Pay in person
                </div>
                <p>Bring cash to the instructor in Room Q10, or contact the instructor to arrange another approved payment method. Your order will remain unpaid until the teacher confirms the deposit.</p>
              </div>

              {/* Clean Refund Statement Notice */}
              <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded text-[11px] text-amber-900 leading-relaxed">
                <strong>Refund Policy:</strong> Handling and processing refunds is purely the teacher's responsibility.
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-slate-900 hover:bg-[#C41E3A] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Close Instructions</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <span>No online payment is processed in this portal.</span>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};
