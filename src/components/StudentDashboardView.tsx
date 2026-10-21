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
import { ListingStatus, RequestStatus, OrderStatus } from '../types';

export const StudentDashboardView: React.FC = () => {
  const {
    currentUser,
    userProfile,
    listings,
    requests,
    orders,
    navigateTo,
    deleteListing,
    updateRequestStatus,
    updateOrderStatus,
    setShowAuthModal,
    canPublishModel,
  } = useLab();

  const [activeTab, setActiveTab] = useState<'listings' | 'requests' | 'orders'>('listings');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filter listings created by the currently authenticated user
  const myListings = useMemo(() => {
    if (!currentUser) return [];
    return listings.filter(
      (l) => l.creatorId === currentUser.uid || l.makerId === currentUser.uid
    );
  }, [listings, currentUser]);

  // Filter incoming orders for items this student created
  const incomingOrders = useMemo(() => {
    if (!currentUser) return [];
    return orders.filter(
      (o) => o.sellerId === currentUser.uid
    );
  }, [orders, currentUser]);

  // Custom requests assigned to this student or unassigned open queue
  const assignedRequests = useMemo(() => {
    if (!currentUser) return [];
    return requests.filter(
      (r) => r.assignedMakerId === currentUser.uid
    );
  }, [requests, currentUser]);

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

  const handleUpdateReqStatus = async (reqId: string, newStatus: RequestStatus) => {
    setActionError(null);
    try {
      await updateRequestStatus(reqId, newStatus, `Student maker updated status to ${newStatus}`);
      setActionSuccess(`Status updated to ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update request status.');
    }
  };

  const handleUpdateOrdStatus = async (ordId: string, newStatus: OrderStatus) => {
    setActionError(null);
    try {
      await updateOrderStatus(ordId, newStatus, `Maker updated order status to ${newStatus}`);
      setActionSuccess(`Order status updated to ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 3000);
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
          <span>My Listings ({myListings.length})</span>
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

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded border transition-colors flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Assigned CAD Requests ({assignedRequests.length})</span>
        </button>
      </div>

      {/* Tab: My Listings */}
      {activeTab === 'listings' && (
        <div className="space-y-4">
          {myListings.length === 0 ? (
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
              {myListings.map((listing) => (
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
                        Material: {listing.material} • Fee: ${((listing.price ?? listing.priceAmount) || 0).toFixed(2)}
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
                  className="bg-white rounded border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
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
                    <span className="text-[10px] font-mono uppercase text-slate-400 font-bold block sm:hidden">
                      Update Production State:
                    </span>
                    {ord.status === 'requested' && (
                      <button
                        onClick={() => handleUpdateOrdStatus(ord.id, 'inProduction')}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-red-600 text-white rounded text-[11px] font-mono font-bold uppercase tracking-wider transition-colors"
                      >
                        Start 3D Printing
                      </button>
                    )}
                    {ord.status === 'inProduction' && (
                      <button
                        onClick={() => handleUpdateOrdStatus(ord.id, 'ready')}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-mono font-bold uppercase tracking-wider transition-colors"
                      >
                        Mark Ready for Pickup
                      </button>
                    )}
                    {ord.status === 'ready' && (
                      <button
                        onClick={() => handleUpdateOrdStatus(ord.id, 'completed')}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded text-[11px] font-mono font-bold uppercase tracking-wider transition-colors"
                      >
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Assigned Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {assignedRequests.length === 0 ? (
            <div className="bg-white rounded border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded bg-slate-100 flex items-center justify-center mx-auto text-slate-500">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                No Assigned Custom Requests
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-normal">
                When teachers or robotics teams assign a custom CAD fabrication ticket to you, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded border border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500">
                        {req.ticketNumber}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-800 border border-purple-200 rounded text-[10px] font-mono font-bold uppercase">
                        {req.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold uppercase tracking-tight text-slate-900">
                      {req.itemTitle}
                    </h4>
                    <p className="text-xs text-slate-600 line-clamp-2 font-normal">
                      {req.description}
                    </p>
                    <div className="text-xs text-slate-500 font-mono">
                      Requester: <strong>{req.requesterDisplayName}</strong> • Needed By: {req.neededByDate}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {req.status === 'underReview' && (
                      <button
                        onClick={() => handleUpdateReqStatus(req.id, 'inProduction')}
                        className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded text-[11px] font-mono font-bold uppercase tracking-wider transition-colors"
                      >
                        Queue on Print Bed
                      </button>
                    )}
                    {req.status === 'inProduction' && (
                      <button
                        onClick={() => handleUpdateReqStatus(req.id, 'ready')}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-mono font-bold uppercase tracking-wider transition-colors"
                      >
                        Mark Ready
                      </button>
                    )}
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
