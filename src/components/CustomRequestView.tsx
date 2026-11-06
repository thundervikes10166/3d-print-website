import React, { useEffect, useRef, useState } from 'react';
import { useLab } from '../context/LabContext';
import {
  ImagePlus,
  X,
  Send,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Mail,
  Phone,
  User,
} from 'lucide-react';
import { MaterialType, PreferredUpdateMethod } from '../types';
import { deleteUploadedRequestImage, uploadRequestImage, validateRequestImage } from '../lib/requestImageUpload';

type RequestedSize = 'Small' | 'Medium' | 'Large' | 'X-Large';
type ColorMode = 'solid' | 'multicolor';

const SIZE_OPTIONS: { value: RequestedSize; label: string }[] = [
  { value: 'Small', label: 'Small (approximately 3 in × 3 in)' },
  { value: 'Medium', label: 'Medium (approximately 6 in × 6 in)' },
  { value: 'Large', label: 'Large (approximately 10 in × 10 in)' },
  { value: 'X-Large', label: 'X-Large (12 in and up)' },
];

const MATERIALS: { value: MaterialType; description: string }[] = [
  { value: 'PLA', description: 'Standard prints, good for decorations' },
  { value: 'PLA+', description: 'Stronger PLA for everyday use' },
  { value: 'PETG', description: 'Durable and moisture-resistant' },
  { value: 'TPU', description: 'Flexible, rubber-like material' },
  { value: 'ABS', description: 'Tougher, more heat-resistant plastic' },
];

export const CustomRequestView: React.FC = () => {
  const {
    currentUser,
    userProfile,
    createCustomRequest,
    navigateTo,
    setShowAuthModal,
  } = useLab();

  // The form starts empty; contact details are confirmed before sending a quote request.
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [preferredUpdateMethod, setPreferredUpdateMethod] = useState<PreferredUpdateMethod | ''>('');

  const [itemTitle, setItemTitle] = useState('');
  const [description, setDescription] = useState('');
  const [desiredSize, setDesiredSize] = useState<RequestedSize | ''>('');
  const [material, setMaterial] = useState<MaterialType | ''>('');
  const [colorMode, setColorMode] = useState<ColorMode | ''>('');
  const [requestedColors, setRequestedColors] = useState('');
  const [quantity, setQuantity] = useState('');
  const [neededByDate, setNeededByDate] = useState('');
  const [referenceFileUrl, setReferenceFileUrl] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!referenceImage) {
      setImagePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(referenceImage);
    setImagePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [referenceImage]);

  const clearImage = () => {
    setReferenceImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    setSubmitError(null);
    if (!selected) {
      clearImage();
      return;
    }
    const validationError = validateRequestImage(selected);
    if (validationError) {
      clearImage();
      setSubmitError(validationError);
      return;
    }
    setReferenceImage(selected);
  };
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

    if (!desiredSize) {
      setSubmitError('Please select a print size.');
      return;
    }
    if (!material) {
      setSubmitError('Please select a material.');
      return;
    }
    if (!Number.isInteger(Number(quantity)) || Number(quantity) < 1 || Number(quantity) > 1000) {
      setSubmitError('Please enter a quantity between 1 and 1000.');
      return;
    }
    if (!colorMode || !requestedColors.trim()) {
      setSubmitError('Please select solid or multicolor and enter the requested color(s).');
      return;
    }
    if (referenceImage) {
      const imageError = validateRequestImage(referenceImage);
      if (imageError) {
        setSubmitError(imageError);
        return;
      }
    }
    if (referenceFileUrl.trim()) {
      try {
        const url = new URL(referenceFileUrl.trim());
        if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('Unsupported link');
      } catch {
        setSubmitError('Please enter a valid http(s) link to your STL file or photo.');
        return;
      }
    }

    setShowContactConfirmation(true);
  };

  const handleConfirmedSubmit = async () => {
    if (!currentUser || !preferredUpdateMethod || !material || !desiredSize || !colorMode || !requestedColors.trim()) {
      setShowContactConfirmation(false);
      setSubmitError('Please complete the required fields before requesting a quote.');
      return;
    }
    setShowContactConfirmation(false);
    setIsSubmitting(true);

    let uploadedImagePath: string | null = null;
    try {
      // Upload the image first, then save its URL on the same Firestore request.
      // If the Firestore write fails, try to clean up the unused upload.
      let uploadedImageUrl: string | null = null;
      if (referenceImage) {
        const upload = await uploadRequestImage(referenceImage, currentUser.uid);
        uploadedImageUrl = upload.imageUrl;
        uploadedImagePath = upload.imagePath;
      }

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
        description: description.trim(),
        desiredSize,
        // Retain the dimensions field for compatibility with older request displays.
        desiredDimensions: SIZE_OPTIONS.find((option) => option.value === desiredSize)?.label || desiredSize,
        material,
        preferredMaterial: material,
        colorMode,
        color: requestedColors.trim(),
        preferredColor: requestedColors.trim(),
        isQuoteRequest: true,
        quantity: Number(quantity),
        neededByDate: neededByDate || 'Next lab cycle',
        ...(referenceFileUrl.trim() ? { referenceFileUrl: referenceFileUrl.trim() } : {}),
        ...(uploadedImageUrl ? { referenceImageUrl: uploadedImageUrl } : {}),
        ...(uploadedImagePath ? { referenceImageStoragePath: uploadedImagePath } : {}),
        ...(additionalNotes.trim() ? { additionalNotes: additionalNotes.trim() } : {}),
        pickupLocation: 'Hueneme High School • Room Q10 Print Pickup Shelf',
      };

      const docId = await createCustomRequest(requestData);

      setSubmitSuccessTicket(docId);
    } catch (err: any) {
      if (uploadedImagePath) {
        await deleteUploadedRequestImage(uploadedImagePath).catch(() => {});
      }
      const errorCode = String(err?.code || '');
      const errorMessage = String(err?.message || '');
      const friendlyMessage = errorCode.startsWith('storage/')
        ? 'The image could not be uploaded. Please check Firebase Storage is enabled, the Storage rules are published, and your account is signed in.'
        : errorMessage.includes('Image uploads are not configured')
          ? errorMessage
          : errorCode.includes('permission-denied')
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
          Tell us what you would like printed. Our student team will review your request and provide a quote.
        </p>
      </div>

      {/* Pricing Alert (Requirement 3) */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2 shadow-xs">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-snug">
          <strong>Quote request only:</strong> After you submit, we will reach out with a price estimate before printing begins. Submitting does not start a print job.
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
              Your request has been submitted. Our team will reach out with an estimate before printing begins.
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
                setFirstName('');
                setLastName('');
                setContactEmail('');
                setContactPhone('');
                setPreferredUpdateMethod('');
                setItemTitle('');
                setDescription('');
                setReferenceFileUrl('');
                clearImage();
                setMaterial('');
                setDesiredSize('');
                setColorMode('');
                setRequestedColors('');
                setQuantity('');
                setNeededByDate('');
                setAdditionalNotes('');
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

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Item Title *
              </label>
              <input
                type="text"
                value={itemTitle}
                onChange={(e) => setItemTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Description & Purpose *
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Link to STL File or Reference Photo (Optional)
              </label>
              <input
                type="url"
                value={referenceFileUrl}
                onChange={(e) => setReferenceFileUrl(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
              />
              <p className="mt-1 text-[10px] text-slate-500">
                Paste a shareable link to an STL file or photo (Google Drive, Dropbox, etc.). Please make sure we can open it.
              </p>
            </div>

            <div className="rounded border border-slate-200 bg-slate-50 p-4 space-y-2">
              <label htmlFor="request-image" className="flex items-center gap-2 text-[11px] font-bold uppercase text-slate-700">
                <ImagePlus className="h-4 w-4 text-[#C41E3A]" /> Upload a Reference Image (Optional)
              </label>
              <input
                id="request-image"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelect}
                className="block w-full text-xs text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-[#C41E3A] file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-[#A0182E]"
              />
              <p className="text-[10px] text-slate-500">JPG, PNG, or WebP only, up to 5 MB. You can also provide a separate STL or photo link above.</p>
              {referenceImage && (
                <div className="flex items-start gap-3 rounded border border-slate-200 bg-white p-2">
                  {imagePreviewUrl && (
                    <img src={imagePreviewUrl} alt="Selected reference image preview" className="h-24 w-24 rounded object-contain" />
                  )}
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="break-all text-xs font-medium text-slate-700">{referenceImage.name}</p>
                    <button type="button" onClick={clearImage} className="inline-flex items-center gap-1 text-xs font-semibold text-[#C41E3A] hover:underline">
                      <X className="h-3.5 w-3.5" /> Remove image
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Material *
                </label>
                <select
                  required
                  value={material}
                  onChange={(e) => setMaterial(e.target.value as MaterialType | '')}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                >
                  <option value="" disabled></option>
                  {MATERIALS.map(({ value, description }) => (
                    <option key={value} value={value}>{value} - {description}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-500">{MATERIALS.find((item) => item.value === material)?.description || 'Choose the filament that best fits your project.'}</p>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  Requested Size *
                </label>
                <select
                  required
                  value={desiredSize}
                  onChange={(e) => setDesiredSize(e.target.value as RequestedSize | '')}
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                >
                  <option value="" disabled></option>
                  {SIZE_OPTIONS.map((size) => (
                    <option key={size.value} value={size.value}>{size.label}</option>
                  ))}
                </select>
                <p className="mt-1 text-[10px] text-slate-500">Approximate sizes; we will confirm the final dimensions in your quote.</p>
              </div>
            </div>

            <div>
              <label htmlFor="request-quantity" className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                Quantity *
              </label>
              <input
                id="request-quantity"
                type="number"
                min={1}
                max={1000}
                step={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full sm:w-40 px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
              />
            </div>

            <fieldset className="space-y-3">
              <legend className="block text-[11px] font-bold uppercase text-slate-700">
                Print Colors *
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { value: 'solid' as const, label: 'Solid Color', detail: 'One color for the entire print' },
                  { value: 'multicolor' as const, label: 'Multicolor', detail: 'Two or more colors in one print' },
                ]).map(({ value, label, detail }) => (
                  <label key={value} className={`flex cursor-pointer items-start gap-3 rounded border p-3 ${colorMode === value ? 'border-[#C41E3A] bg-red-50' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                    <input
                      type="radio"
                      name="colorMode"
                      value={value}
                      checked={colorMode === value}
                      onChange={() => setColorMode(value)}
                      className="h-4 w-4 mt-0.5 accent-[#C41E3A]"
                    />
                    <span>
                      <span className="block text-xs font-bold text-slate-900">{label}</span>
                      <span className="block text-[10px] text-slate-500">{detail}</span>
                    </span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-700 mb-1">
                  {colorMode === 'multicolor' ? 'What Colors Would You Like? *' : 'What Color Would You Like? *'}
                </label>
                <input
                  type="text"
                  value={requestedColors}
                  onChange={(e) => setRequestedColors(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-[#C41E3A] outline-hidden"
                />
              </div>
            </fieldset>
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
                  <span>Request an Estimate</span>
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
                  Please confirm your contact information. We will reach out with an estimated price before printing.
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
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quantity</div>
                <div className="font-semibold text-slate-900">{quantity}</div>
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
                Confirm & Request Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
