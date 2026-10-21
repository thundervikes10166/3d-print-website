import React, { useState } from 'react';
import { useLab } from '../context/LabContext';
import {
  Inbox,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShoppingBag,
  ArrowRight,
  Package,
  Printer,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Lock,
} from 'lucide-react';
import { RequestStatus, OrderStatus } from '../types';

export const MyRequestsView: React.FC = () => {
  const {
    currentUser,
    requests,
    orders,
    navigateTo,
    setShowAuthModal,
    updateRequestStatus,
    updateOrderStatus,
    openPaymentGateway,
    canModifyPrintStatus,
    isPrintHandler,
  } = useLab();

  const [activeTab, setActiveTab] = useState<'requests' | 'orders'>('orders');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [nextStatus, setNextStatus] = useState<OrderStatus>('inProduction');
  const [statusNote, setStatusNote] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto my-16 bg-white rounded-lg border border-slate-200 p-8 text-center space-y-4 shadow-xs">
        <div className="w-12 h-12 rounded-full bg-red-50 text-[#C41E3A] flex items-center justify-center mx-auto border border-red-100">
          <FileText className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-extrabold uppercase tracking-tight text-slate-900">
          Sign In to View Print Pipeline
        </h2>
        <p className="text-xs text-slate-600 font-normal">
          Track production stages, teacher clearances, and print bed status for parts submitted from your account.
        </p>
        <button
          onClick={() => setShowAuthModal(true)}
          className="px-4 py-2 bg-slate-900 hover:bg-[#C41E3A] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleUpdateStatus = async (orderId: string) => {
    setIsProcessing(true);
    try {
      await updateOrderStatus(orderId, nextStatus, statusNote.trim() || undefined);
      setUpdatingOrderId(null);
      setStatusNote('');
    } catch (err: any) {
      alert(err.message || 'Failed to update order status.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'requested':
      case 'submitted':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'inProduction':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'completed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'declined':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#C41E3A] mb-1">
            ROOM Q10 • PRINT TRACKER
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-slate-900">
            My Orders & Quote Inquiries
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Monitor real-time fabrication stages, line-item print status, and deposit records.
          </p>
        </div>

        {/* Policy notice (Requirement 4) */}
        <div className="bg-slate-50 border border-slate-200 rounded p-3 text-[11px] text-slate-600 max-w-sm">
          <strong>Refund Policy:</strong> Handling and processing refunds is purely the teacher's responsibility.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded border transition-colors flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-[#C41E3A] text-white border-[#C41E3A]'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Catalog Orders & Quotes ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider rounded border transition-colors flex items-center gap-2 ${
            activeTab === 'requests'
              ? 'bg-[#C41E3A] text-white border-[#C41E3A]'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Custom CAD Requests ({requests.length})</span>
        </button>
      </div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-red-50 text-[#C41E3A] flex items-center justify-center mx-auto border border-red-100">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                No Orders or Quotes Placed Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-normal">
                Browse our student-engineered 3D models and submit a quote inquiry.
              </p>
              <button
                onClick={() => navigateTo('marketplace')}
                className="px-4 py-2 bg-[#C41E3A] hover:bg-[#A0182E] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
              >
                Browse Marketplace Models
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((ord) => {
                const canEditStatus = canModifyPrintStatus(ord.sellerId);

                return (
                  <div
                    key={ord.id}
                    className="bg-white rounded-lg border border-slate-200 p-5 space-y-4 shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {ord.listingImageUrl && (
                          <img
                            src={ord.listingImageUrl}
                            alt={ord.listingTitle}
                            className="w-14 h-14 object-cover rounded bg-slate-100 shrink-0 border border-slate-200"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                              Order #{ord.id.slice(0, 6).toUpperCase()}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${getStatusBadge(
                                ord.status
                              )}`}
                            >
                              Status: {ord.status}
                            </span>
                          </div>
                          <h4 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                            {ord.listingTitle}
                          </h4>
                          <div className="text-xs text-slate-500 font-mono">
                            Qty: {ord.quantity} • Material: {ord.selectedMaterial || 'PLA'} • Color: {ord.selectedColor || 'Standard'}
                          </div>
                        </div>
                      </div>

                      {/* Deposit Status & Trigger (Requirement 4) */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 border-t sm:border-t-0 pt-2 sm:pt-0">
                        {ord.depositPaid ? (
                          <div className="text-left sm:text-right">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Deposit Paid (${(ord.depositAmount || 2.5).toFixed(2)})</span>
                            </span>
                            <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                              TxID: {ord.depositTransactionId || 'CONFIRMED'}
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              openPaymentGateway({
                                orderId: ord.id,
                                orderTitle: ord.listingTitle,
                                amount: 2.5,
                              })
                            }
                            className="px-3 py-1.5 bg-[#C41E3A] hover:bg-[#A0182E] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Payment Instructions</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Customer Information & Notification Status (Requirement 5) */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">
                          Customer:
                        </span>
                        <strong className="text-slate-900">
                          {ord.customerFirstName || ord.buyerDisplayName} {ord.customerLastName || ''}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">
                          Contact Point:
                        </span>
                        <span className="text-slate-800">
                          {ord.contactEmail || ord.contactPhone || 'Provided'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-slate-400 block">
                          Order Updates:
                        </span>
                        <span className="text-emerald-700 font-bold">
                          ● Active (Email/SMS)
                        </span>
                      </div>
                    </div>

                    {/* Line-Item Status Control (Requirement 5) */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs font-mono">
                      <div className="text-slate-500 text-[11px]">
                        Pickup: {ord.pickupLocation || 'Room Q10 Print Shelf'}
                      </div>

                      {canEditStatus ? (
                        <button
                          onClick={() => {
                            setUpdatingOrderId(updatingOrderId === ord.id ? null : ord.id);
                            setNextStatus(ord.status);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold uppercase bg-slate-900 hover:bg-[#C41E3A] text-white rounded transition-colors"
                        >
                          {updatingOrderId === ord.id ? 'Close Controls' : 'Toggle Print Status'}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          <span>Handler Managed</span>
                        </span>
                      )}
                    </div>

                    {/* Status Toggle Box */}
                    {updatingOrderId === ord.id && (
                      <div className="p-3 bg-red-50/50 border border-red-100 rounded space-y-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                              Update Line-Item Status
                            </label>
                            <select
                              value={nextStatus}
                              onChange={(e) => setNextStatus(e.target.value as OrderStatus)}
                              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                            >
                              <option value="requested">Requested</option>
                              <option value="inProduction">In Production</option>
                              <option value="ready">Ready for Pickup</option>
                              <option value="completed">Completed</option>
                              <option value="declined">Declined</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                              Note
                            </label>
                            <input
                              type="text"
                              value={statusNote}
                              onChange={(e) => setStatusNote(e.target.value)}
                              placeholder="e.g. Sliced and sent to OctoPrint"
                              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setUpdatingOrderId(null)}
                            className="px-2 py-1 text-slate-600 hover:text-slate-900 font-bold uppercase text-[11px]"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isProcessing}
                            onClick={() => handleUpdateStatus(ord.id)}
                            className="px-3 py-1 bg-[#C41E3A] hover:bg-[#A0182E] text-white font-bold uppercase text-[11px] rounded shadow-xs"
                          >
                            Save Status
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Custom Requests Tab */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-red-50 text-[#C41E3A] flex items-center justify-center mx-auto border border-red-100">
                <Inbox className="w-6 h-6" />
              </div>
              <h3 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                No Custom Requests Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-normal">
                You haven't submitted any custom CAD requests to the queue yet.
              </p>
              <button
                onClick={() => navigateTo('custom_request')}
                className="px-4 py-2 bg-[#C41E3A] hover:bg-[#A0182E] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
              >
                Submit Custom Request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-lg border border-slate-200 p-5 space-y-3 shadow-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                          {req.ticketNumber}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider border ${getStatusBadge(
                            req.status
                          )}`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold uppercase tracking-tight text-slate-900 mt-0.5">
                        {req.itemTitle}
                      </h4>
                    </div>

                    <div className="text-left sm:text-right text-xs font-mono text-slate-500">
                      Material: <strong className="text-slate-800">{req.material}</strong> • Qty: {req.quantity}
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {req.description}
                  </p>

                  <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs font-mono flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-slate-400 uppercase text-[10px]">Contact: </span>
                      <span className="text-slate-800 font-bold">{req.customerFirstName || req.requesterDisplayName} ({req.contactEmail || req.contactPhone || 'Registered'})</span>
                    </div>
                    <div>
                      <span className="text-emerald-700 font-bold">Updates Active</span>
                    </div>
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
