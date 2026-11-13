import React, { useState } from 'react';
import { ArrowLeft, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useLab } from '../context/LabContext';
import { Category, ListingSizeOption, MaterialType } from '../types';
import { isMerchListing } from '../lib/listingKinds';

const categories: Category[] = [
  'Desk Accessories', 'Robotics', 'Decorations', 'Games', 'Toys', 'Woodwork',
  'T-Shirts', 'Hats', 'Hoodies', 'Other Merch', 'Other',
];
const materials: MaterialType[] = ['PLA', 'PLA+', 'PETG', 'TPU', 'ABS', 'Resin'];
const field = 'w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none';
const label = 'block mb-1 text-xs font-bold text-slate-700';
const split = (value: string) => [...new Set(value.split(',').map(x => x.trim()).filter(Boolean))];
const validUrl = (value: string) => { try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; } };

export const CreateEditListingView: React.FC = () => {
  const { currentUser, userProfile, canPublishModel, editingListingId, listings,
    createListing, updateListing, navigateTo, setShowAuthModal } = useLab();
  const existing = editingListingId ? listings.find(x => x.id === editingListingId) : undefined;
  const [title, setTitle] = useState(existing?.title || existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [category, setCategory] = useState<Category>(
    categories.includes(existing?.category as Category) ? existing!.category as Category : 'Robotics'
  );
  const merch = isMerchListing(category);
  const wood = category === 'Woodwork';
  const print = !merch && !wood;
  const [material, setMaterial] = useState<MaterialType>(
    materials.includes(existing?.material as MaterialType) ? existing!.material as MaterialType : 'PLA'
  );
  const [otherMaterial, setOtherMaterial] = useState(
    existing && (isMerchListing(existing) || existing.category === 'Woodwork') ? existing.material : ''
  );
  const [merchSizes, setMerchSizes] = useState(existing?.merchSizes?.join(', ') || '');
  const [sizeOptions, setSizeOptions] = useState<ListingSizeOption[]>(
    existing?.sizeOptions?.length ? existing.sizeOptions.map(x => ({ ...x })) :
    existing && existing.specs?.dimensions && !isMerchListing(existing) ?
      [{ label: 'Standard', dimensions: existing.specs.dimensions }] : []
  );
  const [availableColors, setAvailableColors] = useState(existing?.specs?.availableColors?.join(', ') || '');
  const [otherOptions, setOtherOptions] = useState(existing?.availableOptions?.join(', ') || '');
  const [imageUrl, setImageUrl] = useState(existing?.imageUrl || '');
  const [secondaryImageUrl, setSecondaryImageUrl] = useState(existing?.secondaryImageUrl || '');
  const [orderInstructions, setOrderInstructions] = useState(existing?.orderInstructions || '');
  const [turnaround, setTurnaround] = useState(existing?.estimatedProductionTime || '');
  const [priceType, setPriceType] = useState<'fixed' | 'quote'>(existing?.priceType || 'quote');
  const [price, setPrice] = useState(String(existing?.price ?? existing?.priceAmount ?? ''));
  const [stockTracked, setStockTracked] = useState(typeof existing?.stockQuantity === 'number');
  const [stockQuantity, setStockQuantity] = useState(String(existing?.stockQuantity ?? ''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const editSize = (index: number, key: keyof ListingSizeOption, value: string) => {
    setSizeOptions(prev => prev.map((x, i) => i === index ? {
      ...x, [key]: key === 'price' ? (value === '' ? undefined : Number(value)) : value,
    } : x));
  };
  const addSize = () => setSizeOptions(prev => [...prev, { label: '', dimensions: '' }]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!currentUser || !canPublishModel) { setError('Only approved staff and class students can manage listings.'); return; }
    if (!title.trim() || !description.trim()) { setError('Product name and description are required.'); return; }
    if (!validUrl(imageUrl)) { setError('Add a valid public image URL starting with https://.'); return; }
    if (secondaryImageUrl && !validUrl(secondaryImageUrl)) { setError('The second image URL must be valid.'); return; }
    if (!split(availableColors).length) { setError('Enter at least one available color or finish.'); return; }
    if (!print && !otherMaterial.trim()) { setError('Enter the fabric or wood material.'); return; }
    if (merch && !split(merchSizes).length) { setError('Enter the available clothing sizes.'); return; }
    if (stockTracked && (!/^\d+$/.test(stockQuantity) || Number(stockQuantity) > 100000)) {
      setError('Stock must be a whole number from 0 to 100,000.'); return;
    }
    const sizes = sizeOptions.map(x => ({ label: x.label.trim(), dimensions: x.dimensions.trim(),
      ...(typeof x.price === 'number' && Number.isFinite(x.price) ? { price: x.price } : {}) }));
    if (!merch && sizes.some(x => !x.label || !x.dimensions)) {
      setError('Each added size needs a name and dimensions. Remove unused sizes.'); return;
    }
    if (new Set(sizes.map(x => x.label.toLowerCase())).size !== sizes.length) {
      setError('Each product size needs a different name.'); return;
    }
    if (sizes.some(x => 'price' in x && (x.price! < 0 || x.price! > 100000))) {
      setError('Size prices must be between $0 and $100,000.'); return;
    }
    if (priceType === 'fixed' && (!Number.isFinite(Number(price)) || !price.trim() || Number(price) < 0)) {
      setError('Enter a valid material price or select Custom quote.'); return;
    }
    setLoading(true);
    try {
      const name = title.trim();
      const payload = {
        title: name, name, description: description.trim(),
        creatorId: existing?.creatorId || currentUser.uid,
        creatorDisplayName: existing?.creatorDisplayName || userProfile?.displayName || currentUser.email || 'Student Maker',
        makerId: existing?.makerId || currentUser.uid,
        makerName: existing?.makerName || userProfile?.displayName || currentUser.email || 'Student Maker',
        category, priceType, price: priceType === 'fixed' ? Number(price) : 0,
        priceAmount: priceType === 'fixed' ? Number(price) : 0,
        material: print ? material : otherMaterial.trim(),
        merchSizes: merch ? split(merchSizes) : [],
        sizeOptions: merch ? [] : sizes,
        stockQuantity: stockTracked ? Number(stockQuantity) : null,
        availableOptions: split(otherOptions),
        estimatedProductionTime: turnaround.trim(),
        imageUrl: imageUrl.trim(), secondaryImageUrl: secondaryImageUrl.trim(),
        orderInstructions: orderInstructions.trim(),
        // Preserve any older, internal slicing fields without asking staff for irrelevant data.
        specs: {
          dimensions: sizes[0]?.dimensions || existing?.specs?.dimensions || '',
          layerHeight: existing?.specs?.layerHeight || '',
          infill: existing?.specs?.infill || '',
          printTimeHours: existing?.specs?.printTimeHours || 0,
          filamentGrams: existing?.specs?.filamentGrams || 0,
          supportedMaterials: print ? [material] : [],
          availableColors: split(availableColors),
        },
        status: existing?.status || 'published',
      };
      if (editingListingId) await updateListing(editingListingId, payload);
      else await createListing(payload);
      setSuccess(editingListingId ? 'Listing updated successfully.' : 'Listing published successfully.');
    } catch (err: any) { setError(err?.message || 'Could not save listing.'); }
    finally { setLoading(false); }
  };

  if (!currentUser || !canPublishModel) return <div className="mx-auto max-w-xl rounded-lg border bg-white p-8 text-center space-y-4">
    <h2 className="font-bold">Staff access required</h2>
    <p className="text-sm text-slate-600">Only approved class students and administrators can add products.</p>
    {!currentUser && <button type="button" className="px-4 py-2 rounded bg-slate-900 text-white" onClick={() => setShowAuthModal(true)}>Sign in</button>}
  </div>;

  return <div className="mx-auto max-w-4xl pb-20 space-y-5">
    <button type="button" onClick={() => navigateTo('student_dashboard')} className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-red-700"><ArrowLeft size={16}/> Back to Workbench</button>
    <header className="rounded-lg bg-slate-900 p-6 text-white">
      <p className="text-xs font-mono text-red-300 uppercase">Thunder Vikes · Product catalog</p>
      <h1 className="text-2xl font-extrabold mt-1">{existing ? 'Edit Product' : 'Add Product'}</h1>
      <p className="text-sm text-slate-300 mt-1">Enter only what customers need to choose an item. Unused options can stay blank.</p>
    </header>
    <form onSubmit={save} className="bg-white border border-slate-200 rounded-lg p-5 sm:p-7 space-y-7">
      {error && <p role="alert" className="flex gap-2 text-sm bg-red-50 border border-red-200 p-3 rounded text-red-800"><AlertCircle size={18}/>{error}</p>}
      {success && <p role="status" className="flex gap-2 text-sm bg-emerald-50 border border-emerald-200 p-3 rounded text-emerald-800"><CheckCircle2 size={18}/>{success}</p>}
      <section className="space-y-4">
        <h2 className="font-extrabold text-base border-b pb-2">1. Product information</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="listing-name" className={label}>Item name *</label><input id="listing-name" required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} className={field} placeholder="Viking keychain"/></div>
          <div><label htmlFor="listing-category" className={label}>Category *</label><select id="listing-category" value={category} onChange={e=>setCategory(e.target.value as Category)} className={field}>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
        </div>
        <div><label htmlFor="listing-description" className={label}>Item description *</label><textarea id="listing-description" required rows={3} maxLength={2500} value={description} onChange={e=>setDescription(e.target.value)} className={field} placeholder="What is the item? What can it be used for?"/></div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="listing-image" className={label}>Main product photo URL *</label><input id="listing-image" required type="url" value={imageUrl} onChange={e=>setImageUrl(e.target.value)} className={field} placeholder="https://..."/></div>
          <div><label htmlFor="listing-image-two" className={label}>Additional photo URL (optional)</label><input id="listing-image-two" type="url" value={secondaryImageUrl} onChange={e=>setSecondaryImageUrl(e.target.value)} className={field} placeholder="https://..."/></div>
        </div>
        {imageUrl && validUrl(imageUrl) && <img src={imageUrl} alt="Product photo preview" className="h-32 w-44 rounded object-cover border"/>}
      </section>
      <section className="space-y-4">
        <h2 className="font-extrabold text-base border-b pb-2">2. Customer choices</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="listing-material" className={label}>{merch ? 'Fabric / clothing material' : wood ? 'Wood / material' : 'Filament type'}</label>
            {print ? <select id="listing-material" className={field} value={material} onChange={e=>setMaterial(e.target.value as MaterialType)}>{materials.map(m=><option key={m}>{m}</option>)}</select> :
              <input id="listing-material" className={field} required value={otherMaterial} onChange={e=>setOtherMaterial(e.target.value)} placeholder={merch ? 'Cotton / poly blend' : 'Pine / plywood / hardwood'}/>}</div>
          <div><label htmlFor="listing-colors" className={label}>{merch ? 'Clothing colors' : wood ? 'Finishes / colors' : 'Print colors'} *</label><input id="listing-colors" required className={field} value={availableColors} onChange={e=>setAvailableColors(e.target.value)} placeholder="Red, White, Black"/><p className="text-xs text-slate-500 mt-1">Separate colors with commas.</p></div>
        </div>
        {merch && <div><label htmlFor="listing-apparel" className={label}>Available clothing sizes *</label><input id="listing-apparel" required className={field} value={merchSizes} onChange={e=>setMerchSizes(e.target.value)} placeholder="S, M, L, XL, 2XL"/><p className="text-xs text-slate-500 mt-1">Separate sizes with commas. Customers pick one.</p></div>}
        {!merch && <div className="rounded-lg border border-slate-200 p-4 space-y-3 bg-slate-50">
          <div className="flex flex-wrap justify-between items-center gap-2"><div><h3 className="font-bold text-sm">Available sizes and dimensions</h3><p className="text-xs text-slate-500">Add multiple versions of a print or woodwork item. Optional per-size fee overrides the base fee.</p></div><button type="button" className="flex items-center gap-1 rounded bg-slate-900 px-3 py-2 text-xs font-bold text-white" onClick={addSize}><Plus size={15}/> Add size</button></div>
          {sizeOptions.map((item,i)=><div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1.4fr_0.8fr_auto] items-end gap-2 bg-white border p-3 rounded">
            <div><label className={label}>Size name *</label><input className={field} value={item.label} onChange={e=>editSize(i,'label',e.target.value)} placeholder="Small / 6-inch"/></div>
            <div><label className={label}>Dimensions *</label><input className={field} value={item.dimensions} onChange={e=>editSize(i,'dimensions',e.target.value)} placeholder="6 × 6 × 3 in"/></div>
            <div><label className={label}>Fee (optional $)</label><input className={field} type="number" min="0" step="0.01" value={item.price ?? ''} onChange={e=>editSize(i,'price',e.target.value)} placeholder="Base fee"/></div>
            <button type="button" className="p-2 text-red-700 border border-red-200 rounded" aria-label={`Remove size ${i+1}`} onClick={()=>setSizeOptions(prev=>prev.filter((_,j)=>j!==i))}><Trash2 size={18}/></button>
          </div>)}
          {!sizeOptions.length && <p className="text-xs text-slate-500">No sizes added. Customers will request a standard version.</p>}
        </div>}
        <div><label htmlFor="listing-other-options" className={label}>Other choices (optional)</label><input id="listing-other-options" className={field} value={otherOptions} onChange={e=>setOtherOptions(e.target.value)} placeholder="With keyring, Without keyring"/><p className="text-xs text-slate-500 mt-1">For variants or optional features not covered by color and size.</p></div>
        <div><label htmlFor="listing-instructions" className={label}>Product-specific notes (optional)</label><textarea id="listing-instructions" className={field} rows={2} maxLength={500} value={orderInstructions} onChange={e=>setOrderInstructions(e.target.value)} placeholder="Customization instructions, care notes, or special requirements"/></div>
      </section>
      <section className="space-y-4">
        <h2 className="font-extrabold text-base border-b pb-2">3. Availability and pricing</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label htmlFor="listing-turnaround" className={label}>Estimated turnaround</label><input id="listing-turnaround" className={field} value={turnaround} onChange={e=>setTurnaround(e.target.value)} placeholder="3–5 school days"/><p className="text-xs text-slate-500 mt-1">Shown to customers, not a guaranteed pickup date.</p></div>
          <div><label htmlFor="listing-price-type" className={label}>Pricing method</label><select id="listing-price-type" className={field} value={priceType} onChange={e=>setPriceType(e.target.value as 'fixed'|'quote')}><option value="quote">Estimate on request</option><option value="fixed">Starting material fee</option></select></div>
          {priceType === 'fixed' && <div><label htmlFor="listing-price" className={label}>Starting material fee ($)</label><input id="listing-price" className={field} type="number" min="0" step="0.01" required value={price} onChange={e=>setPrice(e.target.value)}/></div>}
        </div>
        <div className="border rounded-lg p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={stockTracked} onChange={e=>setStockTracked(e.target.checked)}/> Track a limited quantity in stock</label>
          {stockTracked ? <div className="max-w-xs"><label htmlFor="listing-stock" className={label}>Quantity remaining *</label><input id="listing-stock" className={field} type="number" min="0" max="100000" step="1" required value={stockQuantity} onChange={e=>setStockQuantity(e.target.value)} placeholder="6"/><p className="text-xs text-red-700 mt-1">Customers will see: “6 left in stock” when you enter 6.</p></div> : <p className="text-xs text-slate-500">Made to order. No public stock count displayed.</p>}
          <p className="text-xs text-slate-500">Estimate requests do not reserve or deduct stock. Update the number when an order is confirmed or items are produced.</p>
        </div>
      </section>
      <div className="flex justify-end gap-3 border-t pt-5">
        <button type="button" onClick={()=>navigateTo('student_dashboard')} className="px-5 py-2 rounded border font-bold text-sm">Cancel</button>
        <button type="submit" disabled={loading} className="px-5 py-2 rounded bg-[#C41E3A] text-white font-bold text-sm disabled:opacity-60">{loading ? 'Saving...' : existing ? 'Save changes' : 'Publish product'}</button>
      </div>
    </form>
  </div>;
};
