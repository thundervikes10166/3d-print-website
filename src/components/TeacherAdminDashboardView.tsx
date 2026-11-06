import React, {useMemo,useState} from 'react';
import { Check, X, Trash2, Plus, ChevronDown, ShieldCheck, ShoppingBag, FileText, Users, Package, FolderPlus, DollarSign } from 'lucide-react';
import {useLab} from '../context/LabContext';
import {OrderManagementCard} from './OrderManagementCard';
import {RequestManagementCard} from './RequestManagementCard';
import {displayRequestDateTime} from '../lib/requestWorkflow';
import {BASELINE_ADMIN_WHITELIST} from '../types';

type Panel='orders'|'requests'|'catalog'|'categories'|'financials'|'class_students'|'admin_accounts';
const primary='bg-[#C41E3A] hover:bg-red-800 text-white';
const secondary='bg-white hover:bg-slate-100 text-slate-800 border border-slate-300';

export const TeacherAdminDashboardView:React.FC=()=>{
  const lab=useLab();
  const {currentUser,isAdminWhitelisted,canManageStore,canManageAccounts,setShowAuthModal,
    listings,orders,requests,categories,classStudents,studentApplications,adminWhitelist,
    navigateTo,approveListing,deleteListing,updateRequestStatus,updateRequestDetails,addRequestNote,
    updateOrderStatus,updateOrderDetails,confirmCashDeposit,addCategory,deleteCategory,
    approveStudentApplication,rejectStudentApplication,addClassStudent,removeClassStudent,
    updateClassStudent,addAdminEmail,removeAdminEmail}=lab;
  const [tab,setTab]=useState<Panel>('orders');
  const [orderQueue,setOrderQueue]=useState<'active'|'completed'>('active');
  const [cadQueue,setCadQueue]=useState<'active'|'completed'>('active');
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null);
  const [newCategory,setNewCategory]=useState('');
  const [studentEmail,setStudentEmail]=useState('');
  const [studentName,setStudentName]=useState('');
  const [studentPeriod,setStudentPeriod]=useState('Robotics / Makers');
  const [adminEmail,setAdminEmail]=useState('');
  const [studentSearch,setStudentSearch]=useState('');
  const pendingStudents=studentApplications.filter(a=>a.status==='pending');
  const activeTab=(canManageAccounts || !['financials','class_students','admin_accounts'].includes(tab))?tab:'orders';
  const visibleOrders=useMemo(()=>orders.filter(o=>orderQueue==='completed'?o.status==='completed':o.status!=='completed'),[orders,orderQueue]);
  const visibleRequests=useMemo(()=>requests.filter(r=>cadQueue==='completed'?r.status==='completed':r.status!=='completed'),[requests,cadQueue]);
  const filteredStudents=classStudents.filter(s=>[s.email,s.name,s.period].join(' ').toLowerCase().includes(studentSearch.toLowerCase()));
  const run=async(task:()=>Promise<unknown>,success:string)=>{
    setBusy(true);setError(null);setNotice(null);
    try{await task();setNotice(success);}catch(e:any){setError(e.message||'Could not save the changes.');throw e;}
    finally{setBusy(false);}
  };
  const guarded=async(task:()=>Promise<unknown>,success:string)=>{try{await run(task,success);}catch{/* Message is shown above. */}};
  if(!currentUser||!canManageStore) return <div className="max-w-lg mx-auto my-14 bg-white border border-slate-200 rounded-xl p-8 space-y-4 text-center">
    <ShieldCheck className="w-10 h-10 text-red-700 mx-auto"/>
    <h1 className="text-xl font-black">Store Management</h1>
    <p className="text-sm text-slate-600">This dashboard is for administrators and approved Class Students. A new registration must be approved in Class Students before it can manage products or requests.</p>
    {!currentUser?<button className={`${primary} px-4 py-2 rounded text-xs font-bold`} onClick={()=>setShowAuthModal(true)}>Sign in</button>:<p className="text-xs text-amber-700 font-semibold">Signed in as {currentUser.email}. Your account does not have staff access yet.</p>}
  </div>;
  const tabs:[Panel,string,React.ReactNode][]=[
    ['orders','Orders & Print Status',<ShoppingBag className="w-4 h-4"/>],
    ['requests','Custom 3D Requests',<FileText className="w-4 h-4"/>],
    ['catalog','Catalog Management',<Package className="w-4 h-4"/>],
    ['categories','Categories',<FolderPlus className="w-4 h-4"/>],
    ...(canManageAccounts?[
      ['financials','Deposits & Refunds',<DollarSign className="w-4 h-4"/>],
      ['class_students',`Class Students${pendingStudents.length?` (${pendingStudents.length})`:''}`,<Users className="w-4 h-4"/>],
      ['admin_accounts','Admin Accounts',<ShieldCheck className="w-4 h-4"/>],
    ] as [Panel,string,React.ReactNode][]:[]),
  ];
  return <div className="space-y-5 pb-20">
    <header className="bg-slate-900 text-white rounded-lg p-6 flex flex-wrap items-center justify-between gap-3">
      <div><div className="text-[10px] uppercase tracking-widest text-red-300 font-bold">Thunder Vikes · Room Q10</div><h1 className="text-2xl font-black mt-1">Store Management</h1><p className="text-xs text-slate-300 mt-1">{canManageAccounts?'Administrator':'Approved Class Student'} · Shop orders and custom requests are managed separately.</p></div>
      <div className="text-xs font-mono text-slate-300 break-all">{currentUser.email}</div>
    </header>
    {notice&&<p className="p-3 rounded border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold" role="status">{notice}</p>}
    {error&&<p className="p-3 rounded border border-red-200 bg-red-50 text-red-800 text-xs font-semibold" role="alert">{error}</p>}
    <nav aria-label="Store management sections" className="flex flex-wrap border-b border-slate-200 gap-2">
      {tabs.map(([key,label,icon])=><button key={key} type="button" onClick={()=>{setTab(key);setNotice(null);setError(null);}} className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 ${activeTab===key?'text-red-700 border-red-600':'text-slate-600 border-transparent hover:text-slate-900'}`}>{icon}{label}</button>)}
    </nav>
    {activeTab==='orders'&&<section className="space-y-4">
      <div className="bg-white border border-slate-200 rounded p-4 space-y-2"><h2 className="text-base font-extrabold">Orders & Print Status</h2><p className="text-xs text-slate-600">Orders placed from Shop only. Expand an item to edit order details, move forward or backward through the six stages, and review the full history.</p>
        <div className="flex gap-2">
          <button className={`px-3 py-2 rounded text-xs font-bold ${orderQueue==='active'?primary:secondary}`} onClick={()=>setOrderQueue('active')}>Active ({orders.filter(o=>o.status!=='completed').length})</button>
          <button className={`px-3 py-2 rounded text-xs font-bold ${orderQueue==='completed'?primary:secondary}`} onClick={()=>setOrderQueue('completed')}>Completed ({orders.filter(o=>o.status==='completed').length})</button>
        </div>
      </div>
      {visibleOrders.length?visibleOrders.map(order=><OrderManagementCard key={order.id} order={order} processing={busy}
        onChangeStage={(id,status,note)=>run(()=>updateOrderStatus(id,status,note),'Shop order stage updated and recorded.')}
        onSaveDetails={(id,updates)=>run(()=>updateOrderDetails(id,updates),'Shop order details saved.')}/>):<p className="bg-white p-8 border border-slate-200 rounded text-sm text-slate-500 text-center">No {orderQueue} shop orders.</p>}
    </section>}
    {activeTab==='requests'&&<section className="space-y-4">
      <div className="bg-white border border-slate-200 rounded p-4 space-y-2"><h2 className="text-base font-extrabold">Custom 3D Print Requests</h2><p className="text-xs text-slate-600">CAD/print quote requests only. Expand each request to edit details, record stage changes in either direction, or add private staff notes.</p>
        <div className="flex gap-2">
          <button className={`px-3 py-2 rounded text-xs font-bold ${cadQueue==='active'?primary:secondary}`} onClick={()=>setCadQueue('active')}>Active ({requests.filter(r=>r.status!=='completed').length})</button>
          <button className={`px-3 py-2 rounded text-xs font-bold ${cadQueue==='completed'?primary:secondary}`} onClick={()=>setCadQueue('completed')}>Completed ({requests.filter(r=>r.status==='completed').length})</button>
        </div>
      </div>
      {visibleRequests.length?visibleRequests.map(request=><RequestManagementCard key={request.id} request={request} processing={busy}
        onChangeStage={(id,status,note)=>run(()=>updateRequestStatus(id,status,note),'Custom request stage updated and recorded.')}
        onSaveDetails={(id,updates)=>run(()=>updateRequestDetails(id,updates),'Custom request details saved.')}
        onAddNote={(id,note)=>run(()=>addRequestNote(id,note),'Internal staff note saved.')}/>):<p className="bg-white p-8 border border-slate-200 rounded text-sm text-slate-500 text-center">No {cadQueue} custom print requests.</p>}
    </section>}
    {activeTab==='catalog'&&<section className="space-y-3">
      <div className="bg-white border border-slate-200 rounded p-4 flex items-center justify-between gap-4"><div><h2 className="text-base font-extrabold">Shop Catalog</h2><p className="text-xs text-slate-600">Approved Class Students and admins can add, edit and remove products.</p></div><button className={`${primary} px-4 py-2 rounded text-xs font-bold`} onClick={()=>navigateTo('create_listing')}>+ Add product</button></div>
      {listings.length?listings.map(item=><article key={item.id} className="bg-white border border-slate-200 rounded p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">{item.imageUrl&&<img src={item.imageUrl} alt="" className="w-12 h-12 object-cover rounded border"/>}<div className="min-w-0"><strong className="block text-sm truncate">{item.title}</strong><p className="text-xs text-slate-500">{item.category} · {item.status} · {item.priceType==='quote'?'Quote':`$${(item.price||0).toFixed(2)}`}</p></div></div>
        <div className="flex gap-2 shrink-0"><button className={`${secondary} px-3 py-1.5 rounded text-xs font-bold`} onClick={()=>navigateTo('edit_listing',{listingId:item.id})}>Edit</button>{item.status==='pendingApproval'&&<button className={`${primary} px-3 py-1.5 rounded text-xs font-bold`} disabled={busy} onClick={()=>guarded(()=>approveListing(item.id),'Older pending listing published.')}>Publish</button>}<button className="text-red-700 hover:bg-red-50 px-2 rounded" aria-label={`Delete ${item.title}`} title="Delete product" disabled={busy} onClick={()=>{if(window.confirm(`Delete ${item.title}?`))guarded(()=>deleteListing(item.id),'Product deleted.');}}><Trash2 className="w-4 h-4"/></button></div>
      </article>):<div className="p-8 text-sm text-slate-500 text-center bg-white border rounded">No products yet.</div>}
    </section>}
    {activeTab==='categories'&&<section className="bg-white border border-slate-200 rounded p-5 space-y-4"><h2 className="text-base font-extrabold">Product Categories</h2><form onSubmit={e=>{e.preventDefault();if(newCategory.trim())guarded(()=>addCategory(newCategory.trim()),'Category saved.').then(()=>setNewCategory(''));}} className="flex gap-2"><input value={newCategory} onChange={e=>setNewCategory(e.target.value)} required className="min-w-0 flex-1 border rounded p-2 text-sm" placeholder="Category name"/><button className={`${primary} rounded px-3 text-xs font-bold`} disabled={busy}>Add</button></form>
      {categories.map(c=><div key={c.id} className="border-b border-slate-100 py-2 flex items-center justify-between text-sm">{c.name}<button className="text-red-700" onClick={()=>{if(window.confirm(`Delete ${c.name}?`))guarded(()=>deleteCategory(c.id),'Category removed.');}}><Trash2 className="w-4 h-4"/></button></div>)}
    </section>}
    {activeTab==='financials'&&canManageAccounts&&<section className="bg-white border border-slate-200 rounded p-5 space-y-4"><h2 className="text-base font-extrabold">Deposits & Refunds</h2><p className="text-xs text-slate-600">Cash confirmation is limited to administrators. Refunds are handled manually by the teacher.</p>
      {orders.filter(o=>!o.depositPaid).length===0?<p className="text-xs text-slate-500">No unconfirmed deposits.</p>:orders.filter(o=>!o.depositPaid).map(o=><div className="flex flex-wrap gap-2 justify-between border-b py-2 items-center text-xs" key={o.id}><span>{o.listingTitle} · {o.buyerDisplayName} · ${(o.depositAmount||2.5).toFixed(2)} suggested deposit</span><button className={`${secondary} rounded px-3 py-2 font-bold`} disabled={busy} onClick={()=>{if(window.confirm(`Confirm cash received for ${o.listingTitle}?`))guarded(()=>confirmCashDeposit(o.id,o.depositAmount||2.5),'Cash deposit recorded.');}}>Confirm cash received</button></div>)}
    </section>}
    {activeTab==='class_students'&&canManageAccounts&&<section className="space-y-5">
      <div className="bg-white border border-slate-200 rounded p-5 space-y-3"><h2 className="text-base font-extrabold">Registration Approvals ({pendingStudents.length})</h2><p className="text-xs text-slate-600">Every new registered customer appears here as pending. Approve with ✓ to give a student shop-management privileges, or deny with ✕. Denied accounts can still shop as customers.</p>
        {pendingStudents.length?pendingStudents.map(a=><div key={a.uid} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3"><div><strong className="text-sm block">{a.name||'New registration'}</strong><span className="text-xs text-slate-500">{a.email} · {displayRequestDateTime(a.createdAt)}</span></div><div className="flex gap-2"><button disabled={busy} aria-label={`Approve ${a.email}`} title="Approve student" className="rounded border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-2" onClick={()=>guarded(()=>approveStudentApplication(a.uid),`Approved ${a.email}.`)}><Check className="w-5 h-5"/></button><button disabled={busy} aria-label={`Deny ${a.email}`} title="Deny student" className="rounded border border-rose-200 bg-rose-50 text-rose-800 px-3 py-2" onClick={()=>guarded(()=>rejectStudentApplication(a.uid),`Denied ${a.email}.`)}><X className="w-5 h-5"/></button></div></div>):<p className="text-xs text-slate-500">No pending registrations.</p>}
      </div>
      <div className="bg-white border border-slate-200 rounded p-5 space-y-3"><h2 className="text-base font-extrabold">Approved Class Students ({classStudents.filter(s=>s.approved).length})</h2><p className="text-xs text-slate-600">Approved students can manage shop listings, shop orders, custom print stages, and internal notes. Only you can approve, pause, or remove these permissions. Removing this entry does not delete their Firebase Authentication account.</p>
        <form onSubmit={e=>{e.preventDefault();guarded(()=>addClassStudent(studentEmail,studentName,studentPeriod),'Student access granted.').then(()=>{setStudentEmail('');setStudentName('');});}} className="grid sm:grid-cols-4 gap-2"><input type="email" required className="border rounded p-2 text-xs" placeholder="Registered student email" value={studentEmail} onChange={e=>setStudentEmail(e.target.value)}/><input className="border rounded p-2 text-xs" placeholder="Name (optional)" value={studentName} onChange={e=>setStudentName(e.target.value)}/><input className="border rounded p-2 text-xs" placeholder="Class / period" value={studentPeriod} onChange={e=>setStudentPeriod(e.target.value)}/><button disabled={busy} className={`${primary} rounded px-3 py-2 text-xs font-bold`}>Add registered student</button></form>
        <input className="border rounded p-2 text-xs w-full" placeholder="Search student" value={studentSearch} onChange={e=>setStudentSearch(e.target.value)}/>
        {filteredStudents.map(student=><div key={student.id} className="flex flex-wrap gap-2 justify-between items-center border-b border-slate-100 py-3"><div><strong className="block text-sm">{student.name||student.email}</strong><span className="text-xs text-slate-500">{student.email} · {student.period||'Class Student'} {student.approved!==true?'· Legacy entry: reapprove via registration':''}</span></div><div className="flex gap-2 items-center"><button className={`${student.canPublish&&student.approved?'bg-emerald-50 text-emerald-700 border-emerald-200':'bg-slate-100 text-slate-500 border-slate-200'} border rounded px-3 py-2 text-xs font-bold`} disabled={busy||!student.approved} onClick={()=>guarded(()=>updateClassStudent(student.id,{canPublish:!student.canPublish}),`Student access ${student.canPublish?'paused':'restored'}.`)}>{student.canPublish&&student.approved?'Active: Pause':'Paused: Resume'}</button><button disabled={busy} title="Remove Class Student access" className="p-2 rounded text-red-700 hover:bg-red-50" onClick={()=>{if(window.confirm(`Remove class access for ${student.email}? This does not delete the login account.`))guarded(()=>removeClassStudent(student.id),'Class access removed.');}}><Trash2 className="w-4 h-4"/></button></div></div>)}
      </div>
    </section>}
    {activeTab==='admin_accounts'&&canManageAccounts&&<section className="bg-white border border-slate-200 rounded p-5 space-y-4"><h2 className="text-base font-extrabold">Admin Accounts</h2><p className="text-xs text-slate-600">The trusted Firestore users/UID role controls full administrator permissions. Adding or removing an email here does not change that role. To revoke a full admin, also change their Firebase user role in Console.</p><form className="flex gap-2" onSubmit={e=>{e.preventDefault();guarded(()=>addAdminEmail(adminEmail),'Email added to admin allowlist.').then(()=>setAdminEmail(''));}}><input type="email" required value={adminEmail} onChange={e=>setAdminEmail(e.target.value)} className="flex-1 border rounded p-2 text-sm" placeholder="Administrator email"/><button disabled={busy} className={`${primary} rounded px-3 py-2 text-xs font-bold`}>Add</button></form>
      {adminWhitelist.map(email=><div key={email} className="flex gap-2 items-center justify-between border-b py-2 text-sm"><span>{email}</span>{email.toLowerCase()===BASELINE_ADMIN_WHITELIST[0].toLowerCase()?<span className="text-xs text-slate-500">Protected</span>:<button className="text-red-700" title="Remove email from list (does not revoke Firebase admin role)" onClick={()=>{if(window.confirm(`Remove ${email} from the admin allowlist?`))guarded(()=>removeAdminEmail(email),'Admin email removed.');}}><Trash2 className="w-4 h-4"/></button>}</div>)}
    </section>}
  </div>;
};
