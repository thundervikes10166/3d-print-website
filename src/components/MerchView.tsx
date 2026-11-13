import React, { useMemo, useState } from 'react';
import { Shirt, Search, PackageOpen, PlusCircle } from 'lucide-react';
import { useLab } from '../context/LabContext';
import { ProductCard } from './ProductCard';
import { MERCH_CATEGORIES, isMerchListing } from '../lib/listingKinds';

export const MerchView: React.FC = () => {
  const { listings, navigateTo, isLoadingData, canPublishModel } = useLab();
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const products = useMemo(() => listings.filter(item => {
    if (item.status !== 'published' || !isMerchListing(item)) return false;
    if (category !== 'All' && item.category !== category) return false;
    const text = `${item.title} ${item.description} ${item.material}`.toLowerCase();
    return text.includes(search.trim().toLowerCase());
  }), [listings, category, search]);

  return (
    <div className="space-y-6 pb-16">
      <header className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row justify-between gap-4 sm:items-center">
        <div className="max-w-2xl space-y-2">
          <div className="inline-flex gap-2 items-center text-[10px] uppercase tracking-wider font-bold text-[#C41E3A]"><Shirt className="w-4 h-4"/> Thunder Vikes Robotics</div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase">Team Merch</h1>
          <p className="text-sm text-slate-600">T-shirts, hats, hoodies, and other Thunder Vikes apparel. Request an item without making an account. We'll contact you to confirm availability and pricing.</p>
        </div>
        {canPublishModel && <button onClick={() => navigateTo('create_listing')} className="px-4 py-2 rounded bg-[#C41E3A] text-white text-xs font-bold inline-flex gap-2 items-center"><PlusCircle className="w-4 h-4"/> Add Merch</button>}
      </header>
      <div className="space-y-3">
        <div className="relative max-w-md"><Search className="w-4 h-4 absolute top-1/2 -translate-y-1/2 left-3 text-slate-400"/><input aria-label="Search merch" type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search shirts, hats, hoodies..." className="w-full bg-white border border-slate-200 rounded py-2 pl-9 pr-3 text-sm outline-hidden focus:border-[#C41E3A]"/></div>
        <div className="flex gap-2 overflow-x-auto pb-1">{['All', ...MERCH_CATEGORIES].map(item=><button key={item} onClick={()=>setCategory(item)} className={`rounded px-3 py-1.5 text-xs uppercase font-bold whitespace-nowrap border ${category===item?'bg-[#C41E3A] text-white border-[#C41E3A]':'bg-white text-slate-600 border-slate-200'}`}>{item}</button>)}</div>
      </div>
      {isLoadingData ? <div className="bg-white rounded-lg border p-12 text-center text-sm">Loading merch...</div> : products.length ?
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">{products.map(item=><ProductCard key={item.id} product={item}/>)}</div> :
        <div className="bg-white rounded-lg border border-slate-200 text-center p-12 space-y-3"><PackageOpen className="w-9 h-9 mx-auto text-slate-400"/><h2 className="font-black">{search || category !== 'All' ? 'No matching merch' : 'Merch coming soon'}</h2><p className="text-sm text-slate-600">{search || category !== 'All' ? 'Try clearing your search or selecting All.' : 'T-shirts, hats, and hoodies will appear here when our team publishes them.'}</p>{(search || category !== 'All') && <button className="text-xs font-bold text-[#C41E3A]" onClick={()=>{setSearch('');setCategory('All');}}>Clear filters</button>}</div>
      }
      <p className="bg-sky-50 border border-sky-200 rounded p-3 text-xs text-sky-900">After we confirm your request and notify you that your item is ready, pick up at Hueneme High School, Room Q10.</p>
    </div>
  );
};
