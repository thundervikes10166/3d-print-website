import React, { useMemo } from 'react';
import { useLab } from '../context/LabContext';
import { ProductCard } from './ProductCard';
import {
  Search,
  PlusCircle,
  Printer,
  Inbox,
  Sparkles,
} from 'lucide-react';

export const MarketplaceView: React.FC = () => {
  const {
    listings,
    categories,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    navigateTo,
    isLoadingData,
    currentUser,
    setShowAuthModal,
    canPublishModel,
  } = useLab();

  // Filter listings by status == published, category, and search query
  const publishedListings = useMemo(() => {
    return listings.filter((item) => {
      const isApproved = item.status === 'published';
      if (!isApproved) return false;

      const categoryMatch =
        selectedCategory === 'All' || item.category === selectedCategory;

      const titleText = (item.title || item.name || '').toLowerCase();
      const descText = (item.description || '').toLowerCase();
      const makerText = (item.creatorDisplayName || item.makerName || '').toLowerCase();
      const matText = (item.material || '').toLowerCase();
      const q = searchQuery.toLowerCase();

      const searchMatch =
        !searchQuery ||
        titleText.includes(q) ||
        descText.includes(q) ||
        makerText.includes(q) ||
        matText.includes(q);

      return categoryMatch && searchMatch;
    });
  }, [listings, selectedCategory, searchQuery]);

  // Derived category list
  const categoryNames = useMemo(() => {
    const base = ['All', 'Robotics', 'Desk Accessories', 'Tools', 'Games', 'Decorations', 'Other'];
    const dynamic = categories.map((c) => c.name);
    return Array.from(new Set([...base, ...dynamic]));
  }, [categories]);

  return (
    <div className="space-y-6 pb-16">
      
      {/* Clean Cardinal & White Header (Requirement 1) */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-red-50 border border-red-100 rounded text-[10px] font-mono font-bold uppercase tracking-wider text-[#C41E3A]">
            <Printer className="w-3.5 h-3.5" />
            <span>Hueneme High School • Room Q10 Print Lab</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-slate-900 leading-tight">
            Robotics 3D Print Exchange
          </h1>

          <p className="text-xs sm:text-sm text-slate-600 font-normal leading-relaxed">
            Browse verified mechanical brackets, custom lab accessories, and student-engineered prints.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => navigateTo('custom_request')}
            className="px-4 py-2 bg-[#C41E3A] hover:bg-[#A0182E] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
          >
            Custom CAD Request
          </button>

          {canPublishModel && (
            <button
              id="btn-publish-model"
              onClick={() => navigateTo('create_listing')}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <PlusCircle className="w-3.5 h-3.5 text-[#C41E3A]" />
              <span>Publish Model</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="space-y-3">
        
        {/* Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative grow max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search prints, materials, student makers..."
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded text-xs text-slate-900 focus:border-[#C41E3A] outline-hidden font-medium shadow-xs"
            />
          </div>

          <div className="text-[11px] font-mono text-slate-500">
            <span className="font-bold text-slate-900 uppercase">
              {publishedListings.length}
            </span>{' '}
            MODELS AVAILABLE
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {categoryNames.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider whitespace-nowrap transition-colors border ${
                  isActive
                    ? 'bg-[#C41E3A] text-white border-[#C41E3A]'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Grid View */}
      {isLoadingData ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-lg border border-slate-200">
          <div className="w-8 h-8 border-2 border-[#C41E3A] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">
            Loading Catalog from Firestore...
          </div>
        </div>
      ) : publishedListings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {publishedListings.map((product) => (
            <ProductCard key={product.id} product={product as any} />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded bg-red-50 text-[#C41E3A] flex items-center justify-center mx-auto border border-red-100">
            <Inbox className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
              No Published Listings Found
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-normal">
              {searchQuery || selectedCategory !== 'All'
                ? 'No published models match your active search or category filters.'
                : 'The catalog currently has no approved prints. Students can publish the first 3D print model!'}
            </p>
          </div>

          <div className="pt-2 flex items-center justify-center gap-3">
            {searchQuery || selectedCategory !== 'All' ? (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Clear Filters
              </button>
            ) : canPublishModel ? (
              <button
                onClick={() => navigateTo('create_listing')}
                className="px-4 py-2 bg-[#C41E3A] hover:bg-[#A0182E] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Publish Model</span>
              </button>
            ) : (
              <button
                onClick={() => navigateTo('custom_request')}
                className="px-4 py-2 bg-[#C41E3A] hover:bg-[#A0182E] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>Request Custom Fabrication</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
