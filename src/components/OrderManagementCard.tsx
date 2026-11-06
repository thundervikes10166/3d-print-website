import React,{useEffect,useState} from 'react';
import { ArrowLeft,ArrowRight,ChevronDown,ChevronUp,History,Pencil,Save } from 'lucide-react';
import {Order,OrderStatus} from '../types';
import {displayRequestDateTime} from '../lib/requestWorkflow';
import {nextOrderStatus,previousOrderStatus,orderStatusLabel,orderStageIndex,ORDER_STAGES} from '../lib/orderWorkflow';

interface Props {
  order:Order;
  processing:boolean;
  onChangeStage:(id:string,status:OrderStatus,note?:string)=>Promise<void>;
  onSaveDetails:(id:string,updates:Partial<Order>)=>Promise<void>;
}
export const OrderManagementCard:React.FC<Props>=({order,processing,onChangeStage,onSaveDetails})=>{
  const [open,setOpen]=useState(false);
  const [editing,setEditing]=useState(false);
  const [history,setHistory]=useState(false);
  const [note,setNote]=useState('');
  const [draft,setDraft]=useState<Partial<Order>>({});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const prev=previousOrderStatus(order.status);const next=nextOrderStatus(order.status);
  useEffect(()=>{if(!editing)setDraft({quantity:order.quantity,selectedColor:order.selectedColor||'',selectedMaterial:order.selectedMaterial||'',notes:order.notes||'',pickupLocation:order.pickupLocation||'',contactEmail:order.contactEmail||'',contactPhone:order.contactPhone||''});},[order,editing]);
  const move=async(status:OrderStatus)=>{setBusy(true);setError(null);try{await onChangeStage(order.id,status,note);setNote('');}catch(e:any){setError(e.message||'Could not move order.');}finally{setBusy(false);}};
  const save=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError(null);try{await onSaveDetails(order.id,draft);setEditing(false);}catch(e:any){setError(e.message||'Could not save order.');}finally{setBusy(false);}};
  return <article className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
    <button type="button" onClick={()=>setOpen(!open)} aria-expanded={open} className="flex w-full items-center justify-between p-4 sm:p-5 gap-3 text-left hover:bg-slate-50">
      <span className="min-w-0 flex items-center gap-3">
        {order.listingImageUrl&&<img src={order.listingImageUrl} alt="" className="w-12 h-12 rounded object-cover border border-slate-200 hidden sm:block"/>}
        <span className="min-w-0"><span className="block text-[10px] text-slate-500 font-mono">Order #{order.id.slice(0,8).toUpperCase()} · {displayRequestDateTime(order.createdAt)}</span><strong className="block text-sm truncate">{order.listingTitle}</strong><span className="text-xs text-slate-500">{order.buyerDisplayName} · {order.quantity} unit(s)</span></span>
      </span>
      <span className="flex items-center gap-2 shrink-0"><span className={`px-2.5 py-1 text-[10px] rounded border font-bold ${order.status==='completed'?'bg-emerald-50 text-emerald-800 border-emerald-200':'bg-blue-50 text-blue-800 border-blue-200'}`}>{orderStatusLabel(order.status)}</span>{open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</span>
    </button>
    {open&&<div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
      <div className="flex flex-wrap gap-1.5">{ORDER_STAGES.map((stage,index)=><span key={stage.status} className={`px-2 py-1 rounded text-[10px] border font-semibold ${index<=orderStageIndex(order.status)?'bg-red-50 border-red-200 text-red-800':'bg-slate-50 border-slate-200 text-slate-400'}`}>{index+1}. {stage.label}</span>)}</div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded p-3 text-xs">
        <div><strong className="block text-[10px] text-slate-500 uppercase">Customer</strong>{order.customerFirstName||order.buyerDisplayName} {order.customerLastName||''}</div>
        <div><strong className="block text-[10px] text-slate-500 uppercase">Email / Phone</strong>{order.contactEmail||'No email'} · {order.contactPhone||'No phone'}</div>
        <div><strong className="block text-[10px] text-slate-500 uppercase">Qty / Material</strong>{order.quantity} × {order.selectedMaterial||'Standard'}</div>
        <div><strong className="block text-[10px] text-slate-500 uppercase">Color</strong>{order.selectedColor||'Standard'}</div>
        <div><strong className="block text-[10px] text-slate-500 uppercase">Price / deposit</strong>{order.isQuoteRequest?'Estimate required':`$${(order.priceAtTimeOfOrder * order.quantity).toFixed(2)}`} · {order.depositPaid?'Paid':'Not recorded as paid'}</div>
        <div><strong className="block text-[10px] text-slate-500 uppercase">Pickup</strong>{order.pickupLocation||'Room Q10'}</div>
      </div>
      {order.notes&&<p className="text-xs"><strong>Order notes:</strong> {order.notes}</p>}
      <div className="border border-slate-200 rounded p-3 space-y-3">
        <div className="flex items-center justify-between gap-2"><strong className="text-xs uppercase">Order details</strong><button type="button" onClick={()=>setEditing(!editing)} className="text-red-700 text-xs font-bold flex items-center gap-1"><Pencil className="w-3.5 h-3.5"/>{editing?'Cancel editing':'Edit order'}</button></div>
        {editing&&<form onSubmit={save} className="grid sm:grid-cols-2 gap-3 text-xs">
          {([['quantity','Quantity'],['selectedColor','Color'],['selectedMaterial','Material'],['pickupLocation','Pickup location'],['contactEmail','Email'],['contactPhone','Phone']] as const).map(([key,label])=><label key={key} className="space-y-1"><span className="block font-semibold">{label}</span><input className="w-full border border-slate-300 rounded p-2" type={key==='quantity'?'number':'text'} min={key==='quantity'?1:undefined} max={key==='quantity'?1000:undefined} value={String(draft[key]??'')} onChange={e=>setDraft(d=>({...d,[key]:key==='quantity'?Number(e.target.value):e.target.value}))}/></label>)}
          <label className="sm:col-span-2 space-y-1"><span className="block font-semibold">Notes</span><textarea className="w-full border border-slate-300 rounded p-2" rows={3} value={draft.notes||''} onChange={e=>setDraft(d=>({...d,notes:e.target.value}))}/></label>
          <button disabled={busy||processing} type="submit" className="bg-slate-900 text-white rounded px-3 py-2 flex gap-2 justify-center items-center font-bold"><Save className="w-4 h-4"/>Save order</button>
        </form>}
      </div>
      <div className="bg-red-50/50 border border-red-100 rounded p-3 space-y-2">
        <strong className="block text-xs uppercase">Production stage</strong>
        <label className="text-xs block">Stage change note (optional)<textarea className="mt-1 w-full border border-slate-300 rounded p-2 bg-white" rows={2} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/></label>
        <div className="flex flex-wrap gap-2">
          {prev&&<button disabled={busy||processing} type="button" onClick={()=>move(prev)} className="flex gap-1 items-center px-3 py-2 rounded bg-white border border-slate-300 text-xs font-bold disabled:opacity-50"><ArrowLeft className="w-4 h-4"/>Previous: {orderStatusLabel(prev)}</button>}
          {next&&<button disabled={busy||processing} type="button" onClick={()=>move(next)} className="flex gap-1 items-center px-3 py-2 rounded bg-[#C41E3A] text-white text-xs font-bold disabled:opacity-50">Next: {orderStatusLabel(next)}<ArrowRight className="w-4 h-4"/></button>}
        </div>
      </div>
      {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
      <div className="border-t border-slate-200 pt-3"><button type="button" onClick={()=>setHistory(!history)} className="flex gap-2 items-center text-xs font-bold"><History className="w-4 h-4"/>{history?'Hide':'Show'} history ({order.statusLog?.length||0} stages · {order.editLog?.length||0} edits)</button>
      {history&&<div className="space-y-2 mt-3 text-xs">
        {(order.statusLog||[]).slice().reverse().map((e,i)=><div key={i} className="border-l-2 border-red-200 pl-3"><strong>{orderStatusLabel(e.status)}</strong><p className="text-slate-500">{displayRequestDateTime(e.timestamp)} · {e.changedByName||e.changedByEmail||'Older record'}</p>{e.note&&<p>{e.note}</p>}</div>)}
        {(order.editLog||[]).slice().reverse().map((e,i)=><div key={`edit-${i}`} className="border-l-2 border-blue-200 pl-3"><strong>Edited {e.fields.join(', ')}</strong><p className="text-slate-500">{displayRequestDateTime(e.timestamp)} · {e.changedByName}</p></div>)}
      </div>}</div>
    </div>}
  </article>;
};
