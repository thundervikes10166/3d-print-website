import React, { useState } from 'react';
import { getIdToken } from 'firebase/auth';
import { useLab } from '../context/LabContext';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Send,
  Phone,
  Mail,
} from 'lucide-react';
import { PreferredUpdateMethod } from '../types';
import { isMerchListing } from '../lib/listingKinds';

export const ProductPageView: React.FC = () => {
  const {
    selectedProductId,
    listings,
    navigateTo,
    currentUser,
    userProfile,
  } = useLab();

  const product = listings.find((p) => p.id === selectedProductId);
  const isMerch = product ? isMerchListing(product) : false;
  const backView = isMerch ? 'merch' : 'marketplace';
  const isWoodwork = product?.category === 'Woodwork';

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
  const [selectedColor, setSelectedColor] = useState<string>(product?.specs?.availableColors?.[0] || 'Standard');
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [orderNotes, setOrderNotes] = useState<string>('');
  // Honeypot: bots may fill this field, normal visitors never see it.
  const [website, setWebsite] = useState('');

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
          The requested item may have been moved or updated.
        </p>
        <button
          onClick={() => navigateTo(backView)}
          className="px-4 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded"
        >
          Back to Store
        </button>
      </div>
    );
  }

  const title = product.title || product.name || 'Product';
  const stock = typeof product.stockQuantity === 'number' ? product.stockQuantity : null;
  const outOfStock = stock === 0;
  const maxQuantity = stock === null ? 15 : Math.min(15, stock);
  const itemSizes = !isMerch ? product.sizeOptions || [] : [];
  const selectedVariant = itemSizes.find(x => x.label === selectedSize);
  const makerName = product.creatorDisplayName || product.makerName || 'Student Maker';

  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Customer Updates Requirement (Requirement 5):
    // Require First Name, Last Name, and at least one Contact Point (Email or Phone Number)
    if (!firstName.trim() || !lastName.trim()) {
      setFormError('First Name and Last Name are required.');
      return;
    }

    const hasEmail = contactEmail.trim().length > 0;
    const hasPhone = contactPhone.trim().length > 0;

    if (!hasEmail && !hasPhone) {
      setFormError('Please provide an email or phone number so we can contact you to confirm the order.');
      return;
    }

    if (isMerch && product?.merchSizes?.length && !product.merchSizes.includes(selectedSize)) {
      setFormError('Please select a valid apparel size.');
      return;
    }

    if (!isMerch && itemSizes.length && !itemSizes.some(x => x.label === selectedSize)) {
      setFormError('Please choose an available print or woodwork size.');
      return;
    }
    if (product.availableOptions?.length && !product.availableOptions.includes(selectedOption)) {
      setFormError('Please choose an available item option.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity) {
      setFormError(outOfStock ? 'This item is out of stock.' : `Please choose a quantity between 1 and ${maxQuantity}.`);
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
      // The Netlify Function validates the product/price against Firestore,
      // protects the guest write, and creates a request in the shop orders queue.
      // A logged-in buyer is linked to their purchase history automatically.
      const idToken = currentUser ? await getIdToken(currentUser).catch(() => null) : null;
      const response = await fetch('/.netlify/functions/submit-shop-estimate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          listingId: product.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
          preferredUpdateMethod,
          selectedColor,
          selectedSize,
          selectedOption,
          quantity,
          notes: orderNotes.trim(),
          website,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.orderId) {
        throw new Error(result?.error || 'Could not submit your request. Please try again or email the team.');
      }
      setCreatedOrderId(result.orderId);
    } catch (err: any) {
      console.error('Quote request error:', err);
      setFormError(err.message || 'Failed to submit quote inquiry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const colors = product.specs?.availableColors?.length ? product.specs.availableColors : ['Standard'];

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {/* Navigation */}
      <div>
        <button
          onClick={() => navigateTo(backView)}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {isMerch ? 'Merch' : 'Shop'}</span>
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
            {product.secondaryImageUrl && <div className="border-t border-slate-200 p-3 bg-slate-50">
              <p className="text-xs font-semibold text-slate-500 mb-2">Additional product photo</p>
              <img src={product.secondaryImageUrl} alt={`${title} alternate view`} className="max-h-40 rounded border object-contain" />
            </div>}

            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 bg-red-50 text-[#C41E3A] border border-red-100 rounded text-xs font-mono font-bold">
                  {product.material || (isMerch ? 'Apparel' : 'Made to order')}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  Est. Delivery: {product.estimatedProductionTime || 'Confirm availability'}
                </span>
              </div>

              {stock !== null && <p role="status" className="text-sm font-extrabold text-red-600">
                {outOfStock ? 'Out of stock' : `${stock} left in stock`}
              </p>}
              <h1 className="text-xl font-extrabold uppercase tracking-tight text-slate-900">
                {title}
              </h1>

              <p className="text-xs text-slate-600 leading-relaxed">{product.description}</p>
              {product.orderInstructions && <p className="rounded bg-sky-50 border border-sky-200 p-3 text-xs text-slate-700"><strong>Item notes:</strong> {product.orderInstructions}</p>}
              {selectedVariant && <p className="text-xs text-slate-700">Selected size: {selectedVariant.dimensions}</p>}
            </div>
          </div>

          {/* Pricing Alert (Requirement 3) */}
          <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <span className="font-bold">Before fulfillment:</span> Submit your request without an account. Our team will contact you to confirm availability, your order, and the estimate before we start preparing it.
            </div>
          </div>

          <div className="p-3 bg-sky-50 border border-sky-200 rounded-lg text-xs text-sky-900 leading-relaxed">
            <strong>Pickup notice:</strong> When your order is complete and ready for pickup, visit <strong>Hueneme High School, Room Q10</strong>. Please wait for our team to confirm it is ready.
          </div>
        </div>

        {/* Right Column: Guest-friendly quote inquiry */}
        <div className="lg:col-span-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm space-y-5">
            
            <div>
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#C41E3A] mb-1">
                ROOM Q10 • SHOP INQUIRY
              </div>
              <h2 className="text-lg font-extrabold uppercase tracking-tight text-slate-900">
                Request Custom Quote
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                No account required. Share your contact details and we will reach out to confirm your order and estimate before making or preparing the item.
              </p>
            </div>

            {/* Success State */}
            {createdOrderId ? (
              <div className="space-y-4 py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span className="font-bold uppercase tracking-wider font-mono">
                      Request Received
                    </span>
                  </div>
                  <p className="leading-relaxed">
                    Your request for <strong>{title}</strong> has been received. Our team will contact you to confirm your order and estimate <strong>before fulfillment begins</strong>.
                  </p>
                  <p className="pt-1 font-mono text-[11px]">Request reference: <strong>#{createdOrderId.slice(0, 8).toUpperCase()}</strong></p>
                  <p>When we tell you the item is ready for pickup, please visit <strong>Hueneme High School, Room Q10</strong>.</p>
                  {!currentUser && <p>Guest requests do not appear in online purchase history. Save your reference number for follow-up.</p>}
                </div>

                <button type="button" onClick={() => navigateTo(backView)} className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded">
                  Continue Browsing
                </button>
              </div>
            ) : outOfStock ? (
              <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800">This item is currently out of stock. Please check back later or contact the team at thundervikes10166@gmail.com.</p>
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
                        required
                        maxLength={80}
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
                        required
                        maxLength={80}
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
                          maxLength={254}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="name@oxnardunion.org"
                          className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                        />
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Phone Contact
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={contactPhone}
                          maxLength={30}
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
                        { value: 'email' as const, label: 'Email', detail: 'We will reach out by email', Icon: Mail },
                        { value: 'phone' as const, label: 'Phone', detail: 'We will reach out by phone', Icon: Phone },
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

                {/* Item Options */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-100 pb-1">
                    Item Options
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        {isMerch ? 'Clothing Color' : isWoodwork ? 'Finish / Color' : 'Filament Color'}
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

                    {(isMerch ? !!product.merchSizes?.length : !!itemSizes.length) && <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">{isMerch ? "Clothing Size *" : "Product Size *"}</label>
                      <select required value={selectedSize} onChange={e => setSelectedSize(e.target.value)} className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden">
                        <option value="">Select a size</option>
                        {isMerch ? product.merchSizes?.map(size=><option key={size} value={size}>{size}</option>) : itemSizes.map(size=><option key={size.label} value={size.label}>{size.label} — {size.dimensions}{typeof size.price === 'number' && product.priceType === 'fixed' ? ` ($${size.price.toFixed(2)})` : ''}</option>)}
                      </select>
                    </div>}
                    {!!product.availableOptions?.length && <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">Other item option *</label>
                      <select required className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded" value={selectedOption} onChange={e=>setSelectedOption(e.target.value)}>
                        <option value="">Select an option</option>
                        {product.availableOptions.map(option=><option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>}
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-600 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={maxQuantity}
                        required
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
                      maxLength={1500}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      placeholder="Special requests, preferred style, or needed-by date..."
                      className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                    />
                  </div>

                  {/* Hidden honeypot. Real users leave this blank. */}
                  <div className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden="true">
                    <label htmlFor="quote-website">Website</label>
                    <input id="quote-website" name="website" type="text" autoComplete="off" tabIndex={-1} value={website} onChange={e => setWebsite(e.target.value)} />
                  </div>
                  <p className="text-xs text-slate-600 bg-sky-50 border border-sky-200 rounded p-3">
                    <strong>What happens next?</strong> We will contact you to confirm the estimate and your order before production starts. Once it is complete and ready for pickup, visit <strong>Room Q10 at Hueneme High School</strong>.
                  </p>
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
                        <span>Submit Estimate Request</span>
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
