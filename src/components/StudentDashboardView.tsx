import React, { useState, useMemo } from 'react';
import { useLab } from '../context/LabContext';
import {
  Layers,
  PlusCircle,
  Clock,
  CheckCircle2,
  Trash2,
  Edit,
  AlertCircle,
  Inbox,
  User,
  ShoppingBag,
  FileText,
  Printer,
} from 'lucide-react';
import { ListingStatus, OrderStatus } from '../types';
import { listingPriceLabel } from '../lib/pricing';

export const StudentDashboardView: React.FC = () => {
  const {
    currentUser,
    userProfile,
    listings,
    requests,
    orders,
    navigateTo,
    deleteListing,
    updateOrderStatus,
    setShowAuthModal,
    canPublishModel,
  } = useLab();

  const [activeTab, setActiveTab] = useState<'listings' | 'orders'>('listings');
  // Staff share one store: show every product by default, with an option to see only your own.
  const [onlyMine, setOnlyMine] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filter listings created by the currently authenticated user
  const myListings = useMemo(() => {
    if (!currentUser) return [];
    return listings.filter(
      (l) => l.creatorId === currentUser.uid || l.makerId === currentUser.uid
    );
  }, [listings, currentUser]);
  const shownListings = onlyMine ? myListings : listings;

  // Filter incoming orders for items this student created
  const incomingOrders = useMemo(() => {
    if (!currentUser) return [];
    return orders.filter(
      (o) => o.sellerId === currentUser.uid
    );
  }, [orders, currentUser]);

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto my-16 bg-white rounded border border-slate-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center mx-auto text-slate-700">
          <User className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-extrabold uppercase tracking-tight text-slate-900">
          Sign In to Access Student Maker Dashboard
        </h2>
        <p className="text-xs text-slate-600 font-normal">
          Manage your uploaded CAD listings, respond to custom print requests, and log hardware fabrication times stored in Firestore.
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

  const handleDeleteListing = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this listing from Firestore?')) return;
    setActionError(null);
    try {
      await deleteListing(id);
      setActionSuccess('Listing deleted from Firestore.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete listing.');
    }
  };

  const handleUpdateOrdStatus = async (ordId: string, newStatus: OrderStatus) => {
    setActionError(null);
    try {
      const emailNote = await updateOrderStatus(ordId, newStatus, `Maker updated order status to ${newStatus}`);
      setActionSuccess(`Order status updated to ${newStatus}.${emailNote ? ` ${emailNote}` : ''}`);
      setTimeout(() => setActionSuccess(null), emailNote ? 8000 : 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update order status.');
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="bg-slate-900 text-white rounded p-6 sm:p-8 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-400 mb-1">
            MAKER_WORKBENCH • UID: {currentUser.uid.slice(0, 8)}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white">
            {userProfile?.displayName || currentUser.displayName || 'Student Maker'} Workbench
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-normal">
            Manage your personal 3D listings, slice configurations, and production pipeline.
          </p>
        </div>

        <div>
          {canPublishModel ? (
            <button
              onClick={() => navigateTo('create_listing')}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New Listing</span>
            </button>
          ) : (
            <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded text-xs text-slate-600 font-mono flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span>Publishing restricted to enrolled Class Students</span>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {actionError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded text-xs text-rose-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-xs text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('listings')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded border transition-colors flex items-center gap-2 ${
            activeTab === 'listings'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Store Products ({listings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded border transition-colors flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Incoming Orders ({incomingOrders.length})</span>
        </button>

      </div>

      {/* Tab: My Listings */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          {listings.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs" role="group" aria-label="Which products to show">
              <span className="font-bold text-slate-600">Show:</span>
              {([['All store products', false, listings.length], ['Only mine', true, myListings.length]] as const).map(([text, mine, count]) => (
                <button key={text} type="button" aria-pressed={onlyMine === mine} onClick={() => setOnlyMine(mine)}
                  className={`px-3 py-1.5 rounded border font-bold ${onlyMine === mine ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                  {text} ({count})
                </button>
              ))}
            </div>
          )}
          {shownListings.length === 0 ? (
            <div className="bg-white rounded border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                No Listings Created Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-normal">
                {canPublishModel
                  ? "You haven't uploaded any 3D model designs to Firestore yet. Publish your first design to share it with the school."
                  : "Your account is currently in viewer mode. Only students added to the teacher's Class Students roster can publish models."}
              </p>
              {canPublishModel ? (
                <button
                  onClick={() => navigateTo('create_listing')}
                  className="px-4 py-2 bg-slate-900 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors inline-flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Create Your First Listing</span>
                </button>
              ) : (
                <div className="text-[11px] font-mono text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
                  Contact instructor in Room Q10 to be added to the publishing roster
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {shownListings.map((listing) => (
                <div
                  key={listing.id}
                  className="bg-white rounded border border-slate-200 p-4 flex flex-col justify-between space-y-4 shadow-xs"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={listing.imageUrl}
                      alt={listing.title}
                      className="w-20 h-20 object-cover rounded border border-slate-200 bg-slate-100 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="space-y-1 grow min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${
                            listing.status === 'published'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : listing.status === 'pendingApproval'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {listing.status === 'pendingApproval' ? 'Awaiting Teacher Clearance' : listing.status}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">
                          {listing.category}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm uppercase tracking-tight text-slate-900 truncate">
                        {listing.title || listing.name}
                      </h4>

                      <p className="text-xs text-slate-500 font-mono">
                        Material: {listing.material} • Price: {listingPriceLabel(listing)}
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => navigateTo('product_detail', { productId: listing.id })}
                      className="text-xs font-bold uppercase tracking-wider text-red-600 hover:text-red-800 font-mono"
                    >
                      View Live Page &rarr;
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigateTo('edit_listing', { listingId: listing.id })}
                        className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
                        title="Edit Listing"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteListing(listing.id)}
                        className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                        title="Delete Listing from Firestore"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Incoming Orders */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {incomingOrders.length === 0 ? (
            <div className="bg-white rounded border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                No Incoming Orders Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-normal">
                When students or teachers order your published 3D prints, they will appear here in real-time.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {incomingOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-white rounded border border-slate-200 p-4 sm:p-5 space-y-4 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                        ORDER #{ord.id.slice(0, 6).toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded text-[10px] font-mono font-bold uppercase">
                        {ord.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold uppercase tracking-tight text-slate-900">
                      {ord.listingTitle} (x{ord.quantity})
                    </h4>
                    <div className="text-xs text-slate-500 font-mono">
                      Buyer: <strong className="text-slate-800">{ord.buyerDisplayName}</strong> • Color: {ord.selectedColor || 'Default'}
                    </div>
                    {ord.notes && (
                      <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 font-normal">
                        <strong>Buyer Note:</strong> {ord.notes}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canPublishModel && <button onClick={() => navigateTo('teacher_dashboard')}
                      className="bg-slate-900 hover:bg-red-700 px-3 py-2 rounded text-white text-xs font-bold">
                      Manage stages & order details
                    </button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
