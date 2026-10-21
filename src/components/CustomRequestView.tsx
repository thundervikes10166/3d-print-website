import React, { useState } from 'react';
import { useLab } from '../context/LabContext';
import {
  FileText,
  Send,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  ArrowLeft,
  Calendar,
  Layers,
  HelpCircle,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import { MaterialType, Category, PreferredUpdateMethod } from '../types';

const CATEGORIES: Category[] = [
  'Robotics',
  'Desk Accessories',
  'Tools',
  'Games',
  'Decorations',
  'Other',
];

const MATERIALS: MaterialType[] = ['PLA', 'PLA+', 'PETG', 'TPU', 'ABS'];

export const CustomRequestView: React.FC = () => {
  const {
    currentUser,
    userProfile,
    createCustomRequest,
    navigateTo,
    setShowAuthModal,
  } = useLab();

  // Contact fields (Requirement 5)
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

  const [itemTitle, setItemTitle] = useState('');
  const [category, setCategory] = useState<Category>('Robotics');
  const [description, setDescription] = useState('');
  const [desiredDimensions, setDesiredDimensions] = useState('50 x 30 x 15 mm');
  const [material, setMaterial] = useState<MaterialType>('PLA');
  const [color, setColor] = useState('Cardinal Red');
  const [quantity, setQuantity] = useState(1);
  const [neededByDate, setNeededByDate] = useState('');
  const [referenceImageUrl, setReferenceImageUrl] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showContactConfirmation, setShowContactConfirmation] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccessTicket, setSubmitSuccessTicket] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccessTicket(null);

    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      setSubmitError('First Name and Last Name are required.');
      return;
    }

    const hasEmail = contactEmail.trim().length > 0;
    const hasPhone = contactPhone.trim().length > 0;
    if (!hasEmail && !hasPhone) {
      setSubmitError('At least one contact point (Email or Phone Number) is required to activate order updates.');
      return;
    }

    if (!preferredUpdateMethod) {
      setSubmitError('Please choose whether you prefer updates by Email or Phone.');
      return;
    }

    if (preferredUpdateMethod === 'email' && !hasEmail) {
      setSubmitError('Please provide an email address for your preferred update method.');
      return;
    }

    if (preferredUpdateMethod === 'phone' && !hasPhone) {
      setSubmitError('Please provide a phone number for your preferred update method.');
      return;
    }

    if (!itemTitle.trim()) {
      setSubmitError('Please enter a title for your custom 3D design.');
      return;
    }

    if (!description.trim()) {
      setSubmitError('Please describe the geometry, mounting specs, or functional purpose.');
      return;
    }

    setShowContactConfirmation(true);
  };

  const handleConfirmedSubmit = async () => {
    setShowContactConfirmation(false);
    setIsSubmitting(true);

    try {
      const requestData = {
        requesterId: currentUser.uid,
        requesterDisplayName: `${firstName.trim()} ${lastName.trim()}`,
        customerFirstName: firstName.trim(),
        customerLastName: lastName.trim(),
        ...(contactEmail.trim() ? { contactEmail: contactEmail.trim() } : {}),
        ...(contactPhone.trim() ? { contactPhone: contactPhone.trim() } : {}),
        preferredUpdateMethod,
        updatesActivated: true,
        requesterRole: (userProfile?.role === 'teacher' ? 'Teacher' : 'Student') as any,
        itemTitle: itemTitle.trim(),
        category,
        description: description.trim(),
        desiredDimensions: desiredDimensions.trim(),
        desiredSize: desiredDimensions.trim(),
        material,
        preferredMaterial: material,
        color: color.trim(),
        preferredColor: color,
        quantity: Number(quantity),
        neededByDate: neededByDate || 'Next lab cycle',
        ...(referenceImageUrl.trim() ? { referenceImageUrl: referenceImageUrl.trim() } : {}),
        ...(additionalNotes.trim() ? { additionalNotes: additionalNotes.trim() } : {}),
        pickupLocation: 'Hueneme High School • Room Q10 Print Pickup Shelf',
      };

      const docId = await createCustomRequest(requestData);

      setSubmitSuccessTicket(docId);
    } catch (err: any) {
      const errorCode = String(err?.code || '');
      const errorMessage = String(err?.message || '');
      const friendlyMessage = errorCode.includes('permission-denied')
        ? 'Your request could not be submitted because your account does not have permission. Please sign in again and try once more.'
        : errorMessage.includes('Unsupported field value')
          ? 'Some optional request details were empty. Please review the form and try again.'
          : 'We could not submit your request right now. Please check your connection and try again.';
      setSubmitError(friendlyMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigateTo('marketplace')}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Marketplace</span>
        </button>
      </div>

      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-7 shadow-xs">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#C41E3A] mb-1">
          FABRICATION QUEUE • ROOM Q10
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-slate-900">
          Submit Custom 3D Print Request
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1 font-normal leading-relaxed">
          Need a custom motor bracket, sensor mount, or enclosure? Submit your specifications to the student lab queue.
        </p>
      </div>

      {/* Pricing Alert (Requirement 3) */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2 shadow-xs">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-snug">
          <strong>Notice:</strong> Students or teachers must align on pricing details prior to entering production, as costs vary.
        </div>
      </div>

      {/* Error / Success Notices */}
      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>{submitError}</div>
        </div>
      )}

      {submitSuccessTicket ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-extrabold uppercase tracking-tight text-slate-900">
              Request Submitted to Queue
            </h2>
            <p className="text-xs text-slate-600 max-w-md mx-auto">
              Your custom CAD request has been recorded in Cloud Firestore. A student maker will review the dimensions and provide a custom quote.
            </p>
            <div className="pt-2 text-xs font-mono text-[#C41E3A] font-bold">
              Preferred Updates: {preferredUpdateMethod === 'email' ? 'Email' : 'Phone'} ({preferredUpdateMethod === 'email' ? contactEmail : contactPhone})
            </div>
          </div>

          {/* Refund Notice (Requirement 4) */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 max-w-md mx-auto">
            <strong>Refund Policy:</strong> Handling and processing refunds is purely the teacher's responsibility.
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => navigateTo('my_requests')}
              className="px-4 py-2 bg-[#C41E3A] hover:bg-[#A0182E] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
            >
              View My Requests
            </button>
            <button
              onClick={() => {
                setSubmitSuccessTicket(null);
                setItemTitle('');
                setDescription('');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Submit Another Request
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs">
          
          {/* Section 1: Customer Contact Info (Requirement 5) */}
          <div className="space-y-3 pb-4 border-b border-slate-100">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Customer Contact Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Email Contact
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="name@oxnardunion.org"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Phone (SMS Updates)
                </label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(805) 555-0199"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">
              Enter at least one contact point, then choose which method you prefer for order updates.
            </p>

            <fieldset className="space-y-2">
              <legend className="block text-[11px] font-bold uppercase text-slate-700">
                Preferred Update Method *
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { value: 'email' as const, label: 'Email', detail: 'Best for detailed updates', Icon: Mail },
                  { value: 'phone' as const, label: 'Phone', detail: 'SMS or call updates', Icon: Phone },
                ]).map(({ value, label, detail, Icon }) => (
                  <label
                    key={value}
                    className={`flex cursor-pointer items-center gap-3 rounded border p-3 transition-colors ${
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
                    <Icon className="h-4 w-4 text-[#C41E3A]" />
                    <span>
                      <span className="block text-xs font-bold text-slate-900">{label}</span>
                      <span className="block text-[10px] text-slate-500">{detail}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Section 2: Request Specifications */}
          <div className="space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Model Specifications
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Item Title *
                </label>
                <input
                  type="text"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="e.g. Dual Motor Servo Bracket"
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Description & Purpose *
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the mounting holes, functional stress load, or mechanical requirements..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Material
                </label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value as MaterialType)}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                >
                  {MATERIALS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Dimensions
                </label>
                <input
                  type="text"
                  value={desiredDimensions}
                  onChange={(e) => setDesiredDimensions(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-[#C41E3A] hover:bg-[#A0182E] text-white font-bold text-xs uppercase tracking-wider rounded transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Submitting Request...</span>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {showContactConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-[#C41E3A]">
                <User className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                  Confirm Contact Information
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  Please confirm this is the information the lab should use for updates.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded border border-slate-200 bg-slate-50 p-4 text-sm">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Name</div>
                <div className="font-semibold text-slate-900">{firstName.trim()} {lastName.trim()}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</div>
                <div className="break-all text-slate-900">{contactEmail.trim() || 'Not provided'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</div>
                <div className="text-slate-900">{contactPhone.trim() || 'Not provided'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Preferred Updates</div>
                <div className="font-semibold capitalize text-slate-900">{preferredUpdateMethod || 'Not selected'}</div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowContactConfirmation(false)}
                className="rounded bg-slate-100 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 hover:bg-slate-200"
              >
                Edit Info
              </button>
              <button
                type="button"
                onClick={handleConfirmedSubmit}
                className="rounded bg-[#C41E3A] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#A0182E]"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
