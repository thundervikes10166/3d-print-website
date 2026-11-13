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
import { isMerchListing } from '../lib/listingKinds';

const CATEGORIES: Category[] = [
  'Desk Accessories',
  'Robotics',
  'Decorations',
  'Games',
  'Toys',
  'Woodwork',
  'T-Shirts',
  'Hats',
  'Hoodies',
  'Other Merch',
  'Other',
];

const MATERIALS: MaterialType[] = ['PLA', 'PLA+', 'PETG', 'TPU', 'ABS'];

export const CreateEditListingView: React.FC = () => {
  const {
    currentUser,
    userProfile,
    canPublishModel,
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
  const initialCategory = (existingListing?.category as Category) || 'Robotics';
  const [category, setCategory] = useState<Category>(
    CATEGORIES.includes(initialCategory) ? initialCategory : 'Robotics'
  );
  const [price, setPrice] = useState<number>(existingListing?.price ?? existingListing?.priceAmount ?? 3.5);
  const [priceType, setPriceType] = useState<'fixed' | 'quote'>(existingListing?.priceType || 'fixed');
  const isMerch = isMerchListing(category);
  const isWoodwork = category === 'Woodwork';
  const isPrint = !isMerch && !isWoodwork;
  const [material, setMaterial] = useState<MaterialType>(
    MATERIALS.includes(existingListing?.material as MaterialType) ? existingListing!.material as MaterialType : 'PLA'
  );
  const [itemMaterial, setItemMaterial] = useState(
    existingListing && (isMerchListing(existingListing) || existingListing.category === 'Woodwork') ? existingListing.material : 'Cotton blend'
  );
  const [merchSizes, setMerchSizes] = useState(
    existingListing?.merchSizes?.join(', ') || 'S, M, L, XL, 2XL'
  );
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
    existingListing?.specs?.availableColors?.join(', ') || (isMerch ? 'Red, Black, White' : 'Signal Blue, Stealth Black, White')
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
        material: isPrint ? material : itemMaterial.trim(),
        merchSizes: isMerch ? merchSizes.split(',').map(s => s.trim()).filter(Boolean) : [],
        estimatedProductionTime,
        imageUrl,
        specs: {
          dimensions,
          layerHeight,
          infill,
          printTimeHours: Number(printTimeHours),
          filamentGrams: Number(filamentGrams),
          supportedMaterials: isPrint ? [material] : [],
          availableColors: colorsArray.length > 0 ? colorsArray : ['Standard White', 'Stealth Black'],
        },
        status: 'published',
      };

      if (editingListingId) {
        await updateListing(editingListingId, listingPayload as any);
        setSubmitSuccess('Listing updated successfully in Firestore!');
      } else {
        await createListing(listingPayload as any);
        setSubmitSuccess(
          'Product published successfully and now visible in its store section!'
        );
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
          {editingListingId ? 'Edit Product Listing' : 'Add Shop or Merch Listing'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mt-1 font-normal leading-relaxed">
          Publish 3D prints, woodwork, or clothing. Select a clothing category to show sizes and apparel options.
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
              Product Title *
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
                {isMerch ? 'Fabric / Material *' : isWoodwork ? 'Wood / Material *' : 'Primary Material *'}
              </label>
              {!isPrint ? <input
                type="text" required value={itemMaterial}
                onChange={e=>setItemMaterial(e.target.value)}
                placeholder={isMerch ? 'Cotton, polyester, cotton blend...' : 'Pine, plywood, hardwood...'}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-red-600 outline-hidden"
              /> : <select
                value={material}
                onChange={e=>setMaterial(e.target.value as MaterialType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 focus:bg-white focus:border-red-600 outline-hidden font-bold uppercase"
              >{MATERIALS.map(m=><option key={m} value={m}>{m}</option>)}</select>}
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

        {!isPrint && <div className="border border-slate-200 rounded bg-sky-50 p-4 space-y-3">
          <h3 className="text-xs font-black uppercase">{isMerch ? 'Merch options' : 'Woodwork options'}</h3>
          {isMerch && <label className="block text-xs font-bold">Available sizes (comma-separated)
            <input type="text" value={merchSizes} onChange={e=>setMerchSizes(e.target.value)} placeholder="S, M, L, XL, 2XL" className="mt-1 w-full p-2 border border-slate-200 rounded bg-white text-xs" />
          </label>}
          <label className="block text-xs font-bold">{isMerch ? 'Available clothing colors' : 'Available finishes / colors'} (comma-separated)
            <input type="text" value={availableColors} onChange={e=>setAvailableColors(e.target.value)} placeholder="Red, Black, White" className="mt-1 w-full p-2 border border-slate-200 rounded bg-white text-xs" />
          </label>
          <p className="text-xs text-slate-600">{isMerch ? 'Clothing appears only in Merch. Customers choose a size and color when requesting an estimate.' : 'Woodwork appears in Shop. Customers choose a finish/color when available.'}</p>
        </div>}

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

        {/* Technical fabrication specs are not relevant to apparel. */}
        {isPrint && <div className="space-y-4">
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
        </div>}

        {/* Section 4: Classroom Fee & Turnaround */}
        <div className="space-y-4">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500 pb-2 border-b border-slate-200">
            04. PRICING & AVAILABILITY
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
                Estimated availability / turnaround
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
            {canPublishModel
              ? 'Approved staff listing: publishes immediately'
              : 'Class Students approval is required to publish'}
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
