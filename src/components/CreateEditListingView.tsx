import React, { useState } from 'react';
import { useLab } from '../context/LabContext';
import {
  PlusCircle,
  ArrowLeft,
  Image as ImageIcon,
  AlertCircle,
  CheckCircle2,
  Box,
  Layers,
  Clock,
  Weight,
  HelpCircle,
} from 'lucide-react';
import { MaterialType, Category } from '../types';

const CATEGORIES: Category[] = [
  'Desk Accessories',
  'Robotics',
  'Decorations',
  'Games',
  'Tools',
  'Other',
];

const MATERIALS: MaterialType[] = ['PLA', 'PLA+', 'PETG', 'TPU', 'ABS'];

export const CreateEditListingView: React.FC = () => {
  const {
    currentUser,
    userProfile,
    editingListingId,
    listings,
    createListing,
    updateListing,
    navigateTo,
    setShowAuthModal,
  } = useLab();

  // If editing an existing listing, load its data
  const existingListing = editingListingId
    ? listings.find((l) => l.id === editingListingId)
    : null;

  const [title, setTitle] = useState(existingListing?.title || existingListing?.name || '');
  const [description, setDescription] = useState(existingListing?.description || '');
  const [category, setCategory] = useState<Category>((existingListing?.category as Category) || 'Robotics');
  const [price, setPrice] = useState<number>(existingListing?.price ?? existingListing?.priceAmount ?? 3.5);
  const [priceType, setPriceType] = useState<'fixed' | 'quote'>(existingListing?.priceType || 'fixed');
  const [material, setMaterial] = useState<MaterialType>((existingListing?.material as MaterialType) || 'PLA');
  const [imageUrl, setImageUrl] = useState(existingListing?.imageUrl || '');
  const [estimatedProductionTime, setEstimatedProductionTime] = useState(
    existingListing?.estimatedProductionTime || '2-3 school days'
  );
  const [dimensions, setDimensions] = useState(existingListing?.specs?.dimensions || '85 x 45 x 20 mm');
  const [layerHeight, setLayerHeight] = useState(existingListing?.specs?.layerHeight || '0.20 mm standard');
  const [infill, setInfill] = useState(existingListing?.specs?.infill || '15% Gyroid');
  const [printTimeHours, setPrintTimeHours] = useState(existingListing?.specs?.printTimeHours || 2.5);
  const [filamentGrams, setFilamentGrams] = useState(existingListing?.specs?.filamentGrams || 45);
  const [availableColors, setAvailableColors] = useState<string>(
    existingListing?.specs?.availableColors?.join(', ') || 'Signal Blue, Stealth Black, White'
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded border border-slate-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center mx-auto text-slate-700">
          <Box className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-extrabold uppercase tracking-tight text-slate-900">
          Authentication Required to Publish Designs
        </h2>
        <p className="text-xs text-slate-600 font-normal">
          Please sign in with your student or teacher account to create real listings in Cloud Firestore.
        </p>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-red-600 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!title.trim()) {
      setSubmitError('Please enter a listing title.');
      return;
    }

    if (!imageUrl.trim()) {
      setSubmitError('Please provide a valid direct Image URL for your 3D model render.');
      return;
    }

    setIsSubmitting(true);

    try {
      const colorsArray = availableColors
        .split(',')
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const listingPayload = {
        title,
        name: title,
        description,
        creatorId: currentUser.uid,
        creatorDisplayName: userProfile?.displayName || currentUser.displayName || 'Student Maker',
        makerId: currentUser.uid,
        makerName: userProfile?.displayName || currentUser.displayName || 'Student Maker',
        category,
        price: Number(price),
        priceAmount: Number(price),
        priceType,
        material,
        estimatedProductionTime,
        imageUrl,
        specs: {
          dimensions,
          layerHeight,
          infill,
          printTimeHours: Number(printTimeHours),
          filamentGrams: Number(filamentGrams),
          supportedMaterials: [material],
          availableColors: colorsArray.length > 0 ? colorsArray : ['Standard White', 'Stealth Black'],
        },
        status: userProfile?.role === 'teacher' || userProfile?.role === 'admin' ? 'published' : 'pendingApproval',
      };

      if (editingListingId) {
        await updateListing(editingListingId, listingPayload as any);
        setSubmitSuccess('Listing updated successfully in Firestore!');
      } else {
        const newId = await createListing(listingPayload as any);
        setSubmitSuccess('Listing submitted to Firestore! Awaiting teacher safety clearance.');
      }

      setTimeout(() => {
        navigateTo('student_dashboard');
      }, 1500);
    } catch (err: any) {
      console.error('Listing submit error:', err);
      setSubmitError(err.message || 'Failed to save listing to Firestore.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      
      {/* Back Button */}
      <div>
        <button
          onClick={() => navigateTo('student_dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Maker Dashboard</span>
        </button>
      </div>

      {/* Header */}
      <div className="bg-slate-900 text-white rounded p-6 sm:p-8 border border-slate-800">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-400 mb-1">
          FIRESTORE_CATALOG_SYNC • ROOM Q10
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white">
          {editingListingId ? 'Edit Model Listing' : 'Publish New 3D Model Listing'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 font-normal leading-relaxed">
          Create verified 3D prints for the school marketplace. Provide technical print specs and material replacement costs.
        </p>
      </div>

      {/* Error & Success Feedback */}
      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold uppercase font-mono text-[11px]">Firestore Operation Failed</div>
            <div>{submitError}</div>
          </div>
        </div>
      )}

      {submitSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold uppercase font-mono text-[11px]">Saved to Firebase</div>
            <div>{submitSuccess}</div>
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded border border-slate-200 p-6 sm:p-8 space-y-6">
        
        {/* Section 1: Basic Details */}
        <div className="space-y-4">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-200">
            01. MODEL IDENTITY & METADATA
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Model Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hexagon Desktop Cable Organizer (Modular)"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-red-600 outline-hidden font-medium"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-red-600 outline-hidden font-bold uppercase"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Primary Material *
              </label>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value as MaterialType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-red-600 outline-hidden font-mono font-bold"
              >
                {MATERIALS.map((m) => (
                  <option key={m} value={m}>
                    {m} Filament
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Description & Purpose *
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this model does, mounting requirements, and assembly tips..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-red-600 outline-hidden font-normal"
            />
          </div>
        </div>

        {/* Section 2: Image URL (Storage-free image support) */}
        <div className="space-y-4">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-200">
            02. MODEL RENDER / IMAGE URL
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Direct Image URL * (No Firebase Storage Uploads Required)
            </label>
            <div className="relative">
              <ImageIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="url"
                required
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... or hosted CAD render URL"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-red-600 outline-hidden font-mono text-[11px]"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-normal">
              Enter a public image link (Unsplash, Imgur, or direct CAD preview URL). This URL will be securely stored in Firestore.
            </p>
          </div>

          {imageUrl && (
            <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center gap-3">
              <img
                src={imageUrl}
                alt="Preview"
                className="w-16 h-16 object-cover rounded border border-slate-200 bg-white"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="text-xs text-slate-600 font-mono">
                <span className="font-bold text-slate-900">Image Preview Loaded</span>
                <div className="text-[10px] text-slate-400 truncate max-w-sm">{imageUrl}</div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Technical Fabrication Specs */}
        <div className="space-y-4">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-200">
            03. SLICING & PRINT SPECS
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Dimensions
              </label>
              <input
                type="text"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="e.g. 85 x 45 x 20 mm"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-900 focus:bg-white focus:border-red-600 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Print Time (Hours)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={printTimeHours}
                onChange={(e) => setPrintTimeHours(parseFloat(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-900 focus:bg-white focus:border-red-600 outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Filament Grams (g)
              </label>
              <input
                type="number"
                min="1"
                value={filamentGrams}
                onChange={(e) => setFilamentGrams(parseInt(e.target.value) || 20)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-900 focus:bg-white focus:border-red-600 outline-hidden"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Layer Height & Infill
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={layerHeight}
                  onChange={(e) => setLayerHeight(e.target.value)}
                  placeholder="0.20mm standard"
                  className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-900 outline-hidden"
                />
                <input
                  type="text"
                  value={infill}
                  onChange={(e) => setInfill(e.target.value)}
                  placeholder="15% Gyroid"
                  className="w-1/2 px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-900 outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Available Lab Colors
              </label>
              <input
                type="text"
                value={availableColors}
                onChange={(e) => setAvailableColors(e.target.value)}
                placeholder="Viking Red, Matte Black, White, Gold"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-red-600 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Classroom Fee & Turnaround */}
        <div className="space-y-4">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-200">
            04. MATERIAL REIMBURSEMENT & TURNAROUND
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Pricing Type
              </label>
              <select
                value={priceType}
                onChange={(e) => setPriceType(e.target.value as 'fixed' | 'quote')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold uppercase text-slate-900 outline-hidden"
              >
                <option value="fixed">Fixed Material Cost ($)</option>
                <option value="quote">Custom Quote Only</option>
              </select>
            </div>

            {priceType === 'fixed' && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Material Fee ($ USD)
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="0.5"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-red-600 outline-hidden"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Turnaround SLA
              </label>
              <input
                type="text"
                value={estimatedProductionTime}
                onChange={(e) => setEstimatedProductionTime(e.target.value)}
                placeholder="2-3 school days"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-red-600 outline-hidden font-medium"
              />
            </div>
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 font-mono">
            {userProfile?.role === 'teacher' || userProfile?.role === 'admin'
              ? 'Published immediately by Lab Supervisor'
              : 'Will be queued for Teacher Approval before going public'}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => navigateTo('student_dashboard')}
              className="w-1/2 sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-1/2 sm:w-auto px-6 py-2 bg-slate-900 hover:bg-red-600 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {isSubmitting ? (
                <span>Writing to Firestore...</span>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>{editingListingId ? 'Save Changes' : 'Publish to Firestore'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
