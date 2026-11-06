import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, History, Save, ArrowLeft, ArrowRight, Pencil } from 'lucide-react';
import { CustomRequest, RequestStatus } from '../types';
import { RequestNotesPanel } from './RequestNotesPanel';
import { RequestReferenceAttachments } from './RequestReferenceAttachments';
import { RequestPipeline } from './RequestPipeline';
import {
  displayRequestDateTime, displayRequestedDimensions, nextRequestStatus,
  previousRequestStatus, requestStatusLabel,
} from '../lib/requestWorkflow';

interface Props {
  request: CustomRequest;
  processing: boolean;
  onChangeStage: (id: string, status: RequestStatus, note?: string) => Promise<void>;
  onSaveDetails: (id: string, updates: Partial<CustomRequest>) => Promise<void>;
  onAddNote: (id: string, text: string) => Promise<void>;
}

export const RequestManagementCard: React.FC<Props> = ({request,processing,onChangeStage,onSaveDetails,onAddNote}) => {
  const [open,setOpen] = useState(false);
  const [editing,setEditing] = useState(false);
  const [history,setHistory] = useState(false);
  const [note,setNote] = useState('');
  const [draft,setDraft] = useState<Partial<CustomRequest>>({});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const previous = previousRequestStatus(request.status);
  const next = nextRequestStatus(request.status);
  useEffect(() => { if (!editing) setDraft({
    itemTitle:request.itemTitle, description:request.description, quantity:request.quantity || 1,
    desiredSize:request.desiredSize || '', desiredDimensions:request.desiredDimensions || '',
    material:request.material, colorMode:request.colorMode || 'solid', color:request.color || '',
    neededByDate:request.neededByDate || '', estimatedCost:request.estimatedCost || '',
    contactEmail:request.contactEmail || '',contactPhone:request.contactPhone || '',pickupLocation:request.pickupLocation || '',
  }); },[request, editing]);
  const changeStage = async(status:RequestStatus) => {
    setBusy(true);setError(null);
    try {await onChangeStage(request.id,status,note);setNote('');}
    catch(e:any){setError(e.message || 'Stage change failed.');}
    finally{setBusy(false);}
  };
  const save = async (e:React.FormEvent) => {
    e.preventDefault();setBusy(true);setError(null);
    try {await onSaveDetails(request.id,draft);setEditing(false);}
    catch(e:any){setError(e.message || 'Could not save edits.');}
    finally{setBusy(false);}
  };
  return <article className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden">
    <button type="button" onClick={()=>setOpen(!open)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 p-4 sm:p-5 hover:bg-slate-50 text-left">
      <span className="min-w-0">
        <span className="block text-[10px] font-mono text-slate-500">{request.ticketNumber || request.id} · {displayRequestDateTime(request.createdAt)}</span>
        <span className="block text-sm font-extrabold text-slate-900 truncate">{request.itemTitle || 'Untitled custom request'}</span>
        <span className="block text-xs text-slate-500">{request.customerFirstName || request.requesterDisplayName} · Qty {request.quantity || 1} · {request.desiredSize || displayRequestedDimensions(request)}</span>
      </span>
      <span className="flex items-center gap-2 shrink-0">
        <span className={`px-2.5 py-1 rounded border text-[10px] font-bold ${request.status === 'completed'?'bg-emerald-50 border-emerald-200 text-emerald-800':'bg-red-50 border-red-100 text-red-800'}`}>{requestStatusLabel(request.status)}</span>
        {open?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}
      </span>
    </button>
    {open && <div className="p-4 sm:p-5 pt-0 space-y-4 border-t border-slate-100">
      <RequestPipeline status={request.status}/>
      <div className="grid sm:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded p-3 text-xs">
        <div><strong className="text-slate-500 block text-[10px] uppercase">Size</strong>{request.desiredSize || 'Not provided'}</div>
        <div><strong className="text-slate-500 block text-[10px] uppercase">Dimensions</strong>{displayRequestedDimensions(request)}</div>
        <div><strong className="text-slate-500 block text-[10px] uppercase">Quantity · Material</strong>{request.quantity || 1} · {request.material || 'Not provided'}</div>
        <div><strong className="text-slate-500 block text-[10px] uppercase">Color</strong>{request.colorMode === 'multicolor'?'Multicolor':'Solid'} · {request.color || 'Not provided'}</div>
        <div><strong className="text-slate-500 block text-[10px] uppercase">Contact</strong>{request.contactEmail || 'No email'} · {request.contactPhone || 'No phone'}</div>
        <div><strong className="text-slate-500 block text-[10px] uppercase">Needed by / Estimate</strong>{request.neededByDate || 'Flexible'} · {request.estimatedCost || 'Not quoted'}</div>
      </div>
      <div className="text-xs text-slate-700 space-y-2">
        <p className="whitespace-pre-wrap"><strong>Object:</strong> {request.description}</p>
        {request.additionalNotes && <p><strong>Customer notes:</strong> {request.additionalNotes}</p>}
        <RequestReferenceAttachments request={request}/>
        {request.isQuoteRequest && <p className="text-amber-800 font-bold">Send a cost estimate before printing.</p>}
      </div>
      <div className="border border-slate-200 rounded-lg p-3 space-y-3">
        <div className="flex items-center justify-between gap-2"><strong className="text-xs uppercase">Edit request details</strong><button type="button" onClick={()=>setEditing(!editing)} className="text-xs font-bold text-red-700 flex items-center gap-1"><Pencil className="w-3.5 h-3.5"/>{editing?'Cancel editing':'Edit details'}</button></div>
        {editing && <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {([
            ['itemTitle','Object title'],['quantity','Quantity'],['desiredDimensions','Exact dimensions (optional)'],
            ['color','Color(s)'],['neededByDate','Needed by'],['estimatedCost','Estimated price'],
            ['contactEmail','Contact email'],['contactPhone','Contact phone'],['pickupLocation','Pickup location'],
          ] as const).map(([key,label])=><label className="space-y-1" key={key}><span className="block font-semibold">{label}</span><input className="w-full border border-slate-300 rounded px-2 py-2" type={key==='quantity'?'number':'text'} min={key==='quantity'?1:undefined} max={key==='quantity'?1000:undefined} value={String(draft[key]??'')} onChange={e=>setDraft(v=>({...v,[key]:key==='quantity'?Number(e.target.value):e.target.value}))}/></label>)}
          <label className="space-y-1"><span className="block font-semibold">Size category</span><select className="w-full border border-slate-300 rounded px-2 py-2" value={draft.desiredSize || ''} onChange={e=>setDraft(v=>({...v,desiredSize:e.target.value}))}>{['','Small','Medium','Large','X-Large'].map(v=><option key={v} value={v}>{v||'Unspecified'}</option>)}</select></label>
          <label className="space-y-1"><span className="block font-semibold">Material</span><select className="w-full border border-slate-300 rounded px-2 py-2" value={draft.material || ''} onChange={e=>setDraft(v=>({...v,material:e.target.value}))}>{['','PLA','PLA+','PETG','TPU','ABS','Resin'].map(v=><option key={v} value={v}>{v||'Unspecified'}</option>)}</select></label>
          <label className="space-y-1"><span className="block font-semibold">Color type</span><select className="w-full border border-slate-300 rounded px-2 py-2" value={draft.colorMode||'solid'} onChange={e=>setDraft(v=>({...v,colorMode:e.target.value as 'solid'|'multicolor'}))}><option value="solid">Solid color</option><option value="multicolor">Multicolor</option></select></label>
          <label className="space-y-1 sm:col-span-2"><span className="block font-semibold">Description</span><textarea rows={3} className="w-full border border-slate-300 rounded px-2 py-2" value={draft.description || ''} onChange={e=>setDraft(v=>({...v,description:e.target.value}))}/></label>
          <button type="submit" disabled={busy||processing} className="bg-slate-900 hover:bg-red-700 text-white font-bold px-3 py-2 rounded flex gap-1 items-center justify-center"><Save className="w-4 h-4"/>Save changes</button>
        </form>}
      </div>
      <div className="bg-red-50/50 border border-red-100 rounded p-3 space-y-2">
        <strong className="text-xs uppercase text-slate-800">Production stage</strong>
        <label className="block text-xs">Stage change note (optional)<textarea rows={2} maxLength={2000} value={note} onChange={e=>setNote(e.target.value)} className="block mt-1 w-full rounded border border-slate-300 bg-white p-2"/></label>
        <div className="flex flex-wrap gap-2">
          {previous&&<button type="button" disabled={processing||busy} onClick={()=>changeStage(previous)} className="flex gap-1 items-center border border-slate-300 bg-white px-3 py-2 rounded text-xs font-bold disabled:opacity-50"><ArrowLeft className="w-4 h-4"/>Previous: {requestStatusLabel(previous)}</button>}
          {next&&<button type="button" disabled={processing||busy} onClick={()=>changeStage(next)} className="flex gap-1 items-center bg-[#C41E3A] text-white px-3 py-2 rounded text-xs font-bold disabled:opacity-50">Next: {requestStatusLabel(next)}<ArrowRight className="w-4 h-4"/></button>}
        </div>
        <p className="text-[10px] text-slate-500">Moving backward also creates a new stage-history entry.</p>
      </div>
      {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
      <RequestNotesPanel requestId={request.id} onAddNote={onAddNote} processing={processing||busy}/>
      <div className="border-t border-slate-200 pt-3">
        <button type="button" className="text-xs font-bold flex items-center gap-2" onClick={()=>setHistory(!history)}><History className="w-4 h-4"/>{history?'Hide':'Show'} history ({request.statusLog?.length||0} stages · {request.editLog?.length||0} edits)</button>
        {history&&<div className="mt-3 text-xs space-y-2">
          {(request.statusLog||[]).slice().reverse().map((entry,i)=><div key={i} className="border-l-2 border-red-200 pl-3"><strong>{requestStatusLabel(entry.status)}</strong><span className="block text-slate-500">{displayRequestDateTime(entry.timestamp)} · {entry.changedByName||entry.changedByEmail||'Older record'}</span>{entry.note&&<p>{entry.note}</p>}</div>)}
          {(request.editLog||[]).slice().reverse().map((entry,i)=><div key={`edit-${i}`} className="border-l-2 border-blue-200 pl-3"><strong>Edited {entry.fields.join(', ')}</strong><span className="block text-slate-500">{displayRequestDateTime(entry.timestamp)} · {entry.changedByName}</span></div>)}
        </div>}
      </div>
    </div>}
  </article>;
};
