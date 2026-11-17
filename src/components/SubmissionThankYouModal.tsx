import React, { useEffect, useRef } from 'react';
import { CheckCircle2, Mail, Phone, MapPin } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  reference: string;
  itemTitle: string;
  contactEmail?: string;
  contactPhone?: string;
}

/** Shown after a shop purchase request or a custom 3D print request is submitted. */
export const SubmissionThankYouModal: React.FC<Props> = ({ open, onClose, reference, itemTitle, contactEmail, contactPhone }) => {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;

  const email = contactEmail?.trim();
  const phone = contactPhone?.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="thank-you-title" onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-emerald-50 border-b border-emerald-200 p-5 flex items-start gap-3">
          <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" aria-hidden="true" />
          <div>
            <h2 id="thank-you-title" className="text-lg font-extrabold text-slate-900">Thank you! Your request was sent.</h2>
            <p className="text-xs text-slate-600 mt-0.5">{itemTitle} · Reference <strong className="font-mono">{reference}</strong></p>
          </div>
        </div>
        <div className="p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
          <p><strong>We will be reaching out within 2 business days</strong> to confirm your order or ask any questions.</p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="font-bold text-amber-900">Please keep an eye on your email and phone for updates.</p>
            <p className="text-xs text-amber-900">The Thunder Vikes team may contact you by <strong>text message or email</strong>. We will reach you at:</p>
            <ul className="text-xs text-slate-800 space-y-1">
              {email && <li className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />{email}</li>}
              {phone && <li className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-amber-700" aria-hidden="true" />{phone}</li>}
            </ul>
          </div>
          <p className="flex items-start gap-2 text-xs"><MapPin className="w-4 h-4 text-red-700 shrink-0" aria-hidden="true" />When your order is ready, we will let you know to pick it up at <strong>Hueneme High School, Room Q10</strong>.</p>
          <p className="text-xs text-slate-500">Save your reference number: <strong className="font-mono">{reference}</strong></p>
        </div>
        <div className="px-5 pb-5">
          <button ref={closeButton} type="button" onClick={onClose} className="w-full rounded bg-slate-900 hover:bg-red-700 text-white font-bold text-sm py-2.5">Got it</button>
        </div>
      </div>
    </div>
  );
};
