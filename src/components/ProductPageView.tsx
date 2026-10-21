import React, { useState } from 'react';
import { useLab } from '../context/LabContext';
import {
  ArrowLeft,
  Clock,
  Layers,
  Box,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  CreditCard,
  Phone,
  Mail,
  User,
} from 'lucide-react';
import { PreferredUpdateMethod } from '../types';

export const ProductPageView: React.FC = () => {
  const {
    selectedProductId,
    listings,
    navigateTo,
    currentUser,
    userProfile,
    createOrder,
    setShowAuthModal,
    openPaymentGateway,
  } = useLab();

  const product = listings.find((p) => p.id === selectedProductId);

  // Customer Contact Fields (Requirement 5)
  const [firstName, setFirstName] = useState(
    userProfile?.displayName ? userProfile.displayName.split(' ')[0] : ''
  );
  const [lastName, setLastName] = useState(
    userProfile?.displayName && userProfile.displayName.split(' ').length > 1
      ? userProfile.displayName.split(' ').slice(1).join(' ')
      : ''
  );
  const [contactEmail, setContactEmail] = useState(currentUser?.email || '');
  const [contactPhone, setContactPhone] = useState('');
  const [preferredUpdateMethod, setPreferredUpdateMethod] = useState<PreferredUpdateMethod | ''>('');

  // Inquiry options
  const [selectedColor, setSelectedColor] = useState<string>('Standard White');
  const [selectedMaterial, setSelectedMaterial] = useState<string>(product?.material || 'PLA');
  const [quantity, setQuantity] = useState<number>(1);
  const [orderNotes, setOrderNotes] = useState<string>('');
  const [payDepositNow, setPayDepositNow] = useState<boolean>(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);

  if (!product) {
    return (
      <div className="max-w-md mx-auto my-16 bg-white p-8 rounded-lg border border-slate-200 text-center space-y-4 shadow-xs">
        <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
          Listing Not Found
        </h2>
        <p className="text-xs text-slate-500">
          The requested 3D model may have been moved or updated.
        </p>
        <button
          onClick={() => navigateTo('marketplace')}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  const title = product.title || product.name || 'Custom 3D Print';
  const makerName = product.creatorDisplayName || product.makerName || 'Student Maker';
  const price = product.price ?? product.priceAmount ?? 0;
  const estimatedTotal = (price * quantity).toFixed(2);
  const depositSuggested = Math.max(2.0, Number((price * quantity * 0.25).toFixed(2)));

  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    // Customer Updates Requirement (Requirement 5):
    // Require First Name, Last Name, and at least one Contact Point (Email or Phone Number)
    if (!firstName.trim() || !lastName.trim()) {
      setFormError('First Name and Last Name are required.');
      return;
    }

    const hasEmail = contactEmail.trim().length > 0;
    const hasPhone = contactPhone.trim().length > 0;

    if (!hasEmail && !hasPhone) {
      setFormError('At least one contact point (Email or Phone Number) is required to activate order updates.');
      return;
    }

    if (!preferredUpdateMethod) {
      setFormError('Please choose whether you prefer updates by Email or Phone.');
      return;
    }

    if (preferredUpdateMethod === 'email' && !hasEmail) {
      setFormError('Please provide an email address for your preferred update method.');
      return;
    }

    if (preferredUpdateMethod === 'phone' && !hasPhone) {
      setFormError('Please provide a phone number for your preferred update method.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderId = await createOrder({
        buyerId: currentUser.uid,
        buyerDisplayName: `${firstName.trim()} ${lastName.trim()}`,
        customerFirstName: firstName.trim(),
        customerLastName: lastName.trim(),
        contactEmail: contactEmail.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        preferredUpdateMethod,
        updatesActivated: true,
        sellerId: product.creatorId || product.makerId || '',
        sellerDisplayName: makerName,
        listingId: product.id,
        listingTitle: title,
        listingImageUrl: product.imageUrl,
        quantity,
        priceAtTimeOfOrder: price,
        selectedColor,
        selectedMaterial,
        notes: orderNotes.trim() || undefined,
        isQuoteRequest: true,
        pickupLocation: 'Hueneme High School • Room Q10 Print Pickup Shelf',
      });

      setCreatedOrderId(orderId);

      if (payDepositNow) {
        openPaymentGateway({
          orderId,
          orderTitle: `${title} (${quantity} unit)`,
          amount: depositSuggested,
        });
      }
    } catch (err: any) {
      console.error('Quote request error:', err);
      setFormError(err.message || 'Failed to submit quote inquiry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const colors = product.specs?.availableColors || ['Signal Red', 'Stealth Black', 'White'];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Navigation */}
      <div>
        <button
          onClick={() => navigateTo('marketplace')}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Product Photo & Details */}
        <div className="lg:col-span-6 space-y-4">
          
          {/* Visual Container */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
            <div className="aspect-4/3 bg-slate-100 relative">
              <img
                src={product.imageUrl}
                alt={title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80';
                }}
              />
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-red-50 text-[#C41E3A] border border-red-100 rounded text-xs font-mono font-bold">
                  {product.material || 'PLA'}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Est. Delivery: {product.estimatedProductionTime || '2-3 Days'}
                </span>
              </div>

              <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">
                {title}
              </h1>

              <p className="text-xs text-slate-600 leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>

          {/* Pricing Alert (Requirement 3) */}
          <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-bold">Notice:</span> Students or teachers must align on pricing details prior to entering production, as costs vary.
            </div>
          </div>

          {/* Refund Notice (Requirement 4) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-600 leading-relaxed">
            <strong className="text-slate-800">Refund Policy:</strong> Handling and processing refunds is purely the teacher's responsibility.
          </div>
        </div>

        {/* Right Column: Quote Inquiry & Deposit Form */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-5">
            
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#C41E3A] mb-1">
                ROOM Q10 • QUOTE INQUIRY
              </div>
              <h2 className="text-lg font-extrabold uppercase tracking-tight text-slate-900">
                Request Custom Quote
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Submit an inquiry to receive a custom pricing and delivery estimate.
              </p>
            </div>

            {/* Success State */}
            {createdOrderId ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="font-bold uppercase tracking-wider font-mono">
                      Quote Request Queued
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    Your quote inquiry for <strong>{title}</strong> has been stored. The student print handler will review and update the pricing and turnaround.
                  </p>
                  <div className="pt-1 text-[11px] font-mono text-emerald-800">
                    Preferred Updates: {preferredUpdateMethod === 'email' ? 'Email' : 'Phone'} ({preferredUpdateMethod === 'email' ? contactEmail : contactPhone})
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openPaymentGateway({
                        orderId: createdOrderId,
                        orderTitle: title,
                        amount: depositSuggested,
                      })
                    }
                    className="py-2.5 px-3 bg-[#C41E3A] hover:bg-[#A0182E] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-1.5"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Payment Instructions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigateTo('my_requests')}
                    className="py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors text-center"
                  >
                    View My Requests
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequestQuote} className="space-y-4">
                
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Customer Info (Requirement 5) */}
                <div className="space-y-3 pt-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1">
                    Customer Contact Information
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last"
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Email Contact
                      </label>
                      <div className="relative">
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="name@oxnardunion.org"
                          className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                        />
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Phone (SMS Updates)
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="(805) 555-0199"
                          className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                        />
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Enter at least one contact point, then choose which method you prefer for order updates.
                  </p>
                  <fieldset className="space-y-2">
                    <legend className="block text-[11px] font-bold uppercase text-slate-600">
                      Preferred Update Method *
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {([
                        { value: 'email' as const, label: 'Email', detail: 'Detailed updates', Icon: Mail },
                        { value: 'phone' as const, label: 'Phone', detail: 'SMS or call updates', Icon: Phone },
                      ]).map(({ value, label, detail, Icon }) => (
                        <label
                          key={value}
                          className={`flex cursor-pointer items-center gap-2 rounded border p-2.5 transition-colors ${
                            preferredUpdateMethod === value
                              ? 'border-[#C41E3A] bg-red-50'
                              : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="preferredUpdateMethod"
                            value={value}
                            checked={preferredUpdateMethod === value}
                            onChange={() => setPreferredUpdateMethod(value)}
                            className="h-4 w-4 accent-[#C41E3A]"
                          />
                          <Icon className="h-3.5 w-3.5 text-[#C41E3A]" />
                          <span>
                            <span className="block text-xs font-bold text-slate-900">{label}</span>
                            <span className="block text-[10px] text-slate-500">{detail}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>

                {/* Print Specifications */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1">
                    Print Specifications
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Filament Color
                      </label>
                      <select
                        value={selectedColor}
                        onChange={(e) => setSelectedColor(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                      >
                        {colors.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={15}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden font-mono font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                      Inquiry Notes
                    </label>
                    <textarea
                      rows={2}
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Special requirements, infill density, or target completion date..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                    />
                  </div>

                  {/* Deposit Checkbox */}
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={payDepositNow}
                      onChange={(e) => setPayDepositNow(e.target.checked)}
                      className="rounded text-[#C41E3A] focus:ring-[#C41E3A]"
                    />
                    <span>
                      Show payment instructions after inquiry submission (${depositSuggested.toFixed(2)} suggested deposit)
                    </span>
                  </label>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 px-4 bg-[#C41E3A] hover:bg-[#A0182E] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <span>Submitting Quote Inquiry...</span>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Request Quote</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-slate-400 font-mono mt-2">
                    Room Q10 Maker Lab • Non-commercial Oxnard Union High School District
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
