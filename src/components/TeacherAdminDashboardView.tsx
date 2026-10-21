import React, { useState } from 'react';
import { useLab } from '../context/LabContext';
import { auth, db } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Layers,
  Inbox,
  FileText,
  ShoppingBag,
  Plus,
  RefreshCw,
  FolderPlus,
  Lock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Users,
  UserPlus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Mail,
  GraduationCap,
  Search,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { ListingStatus, RequestStatus, OrderStatus, BASELINE_ADMIN_WHITELIST, ClassStudent } from '../types';

export const TeacherAdminDashboardView: React.FC = () => {
  const {
    currentUser,
    userProfile,
    listings,
    requests,
    orders,
    categories,
    approveListing,
    rejectListing,
    deleteListing,
    updateRequestStatus,
    updateOrderStatus,
    confirmCashDeposit,
    addCategory,
    deleteCategory,
    setShowAuthModal,
    isAdminWhitelisted,
    isPrintHandler,
    canModifyPrintStatus,
    loginWithEmail,
    signUpWithEmail,
    classStudents,
    addClassStudent,
    removeClassStudent,
    updateClassStudent,
    adminWhitelist,
    isWhitelistedAdminEmail,
    addAdminEmail,
    removeAdminEmail,
  } = useLab();

  const [activeTab, setActiveTab] = useState<'pending_listings' | 'all_listings' | 'orders' | 'requests' | 'categories' | 'financials' | 'class_students' | 'admin_accounts'>('pending_listings');
  const [newCatName, setNewCatName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Restricted Screen Admin Sign-In State
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Management State for Admin Accounts
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');

  // Class Students Management State
  const [studentEmailInput, setStudentEmailInput] = useState('');
  const [studentNameInput, setStudentNameInput] = useState('');
  const [studentPeriodInput, setStudentPeriodInput] = useState('Period 3 Robotics');
  const [studentNotesInput, setStudentNotesInput] = useState('');
  const [studentSearchFilter, setStudentSearchFilter] = useState('');
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchEmailsInput, setBatchEmailsInput] = useState('');

  // Status updating state for orders
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus>('inProduction');
  const [statusNote, setStatusNote] = useState<string>('');

  // Whitelist rule enforcement: Check if email is in whitelist
  const isWhitelisted = isAdminWhitelisted || (
    currentUser?.email && isWhitelistedAdminEmail(currentUser.email)
  );

  // Admin authentication: Check password with Firebase and verify whitelist
  const handleAdminSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsAuthenticating(true);

    const cleanEmail = adminEmailInput.trim().toLowerCase();
    const cleanPassword = adminPasswordInput;

    if (!cleanEmail || !cleanPassword) {
      setLoginError('Please enter both your administrator email and password.');
      setIsAuthenticating(false);
      return;
    }

    // 1. Only accounts added to Admin Mode are authorized
    if (!isWhitelistedAdminEmail(cleanEmail)) {
      setLoginError(
        `Access Denied: The account "${cleanEmail}" is not registered as an authorized administrator. Only approved accounts can access Admin Mode.`
      );
      setIsAuthenticating(false);
      return;
    }

    // 2. Password check performed by Firebase
    try {
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
      } catch (authErr: any) {
        if (authErr.code === 'auth/wrong-password') {
          throw new Error('Incorrect password. Firebase could not verify your credentials.');
        } else if (
          authErr.code === 'auth/invalid-credential' ||
          authErr.code === 'auth/user-not-found'
        ) {
          // If the authorized admin has not initialized a password in Firebase Auth yet, initialize it
          try {
            userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPassword);
            if (userCredential.user) {
              await updateProfile(userCredential.user, { displayName: 'C. Kojwang (Lab Admin)' });
            }
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              throw new Error('Incorrect password. Firebase could not verify your credentials.');
            }
            throw new Error(createErr.message || 'Firebase authentication failed.');
          }
        } else {
          throw authErr;
        }
      }

      // 3. Confirm email is in Admin Mode and set role to trigger Admin Mode
      if (userCredential?.user?.email && isWhitelistedAdminEmail(userCredential.user.email)) {
        const userDocRef = doc(db, 'users', userCredential.user.uid);
        await setDoc(
          userDocRef,
          {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            displayName: userCredential.user.displayName || 'C. Kojwang (Lab Admin)',
            role: 'admin',
            gradeClass: 'Robotics Lab Instructor / Admin',
          },
          { merge: true }
        );
        // Firebase onAuthStateChanged triggers in LabContext and instantly displays the Admin Dashboard!
      } else {
        await signOut(auth);
        setLoginError(`Access Denied: "${cleanEmail}" is not authorized for Admin Mode.`);
      }
    } catch (err: any) {
      console.error('Admin Auth Error:', err);
      setLoginError(err.message || 'Firebase authentication failed. Please check your credentials.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // If not signed in or not in whitelist: RESTRICTED ACCESS SCREEN
  if (!currentUser || !isWhitelisted) {
    return (
      <div className="max-w-md mx-auto my-14 bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-left">
        <div className="flex items-center gap-3.5 mb-6 pb-5 border-b border-slate-100">
          <div className="w-12 h-12 rounded-xl bg-red-50 text-[#C41E3A] flex items-center justify-center border border-red-100 shrink-0 shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-100/80 text-[#C41E3A] text-[10px] font-mono font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3 h-3" />
              Restricted Area
            </div>
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight mt-1">
              Admin Mode Access
            </h2>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-5">
          Access is restricted exclusively to authorized school lab administrators and instructors. Please sign in with your email and password to verify your credentials.
        </p>

        {currentUser && !isWhitelisted && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-950">Student Account Detected</div>
              <p className="text-[11px] text-amber-800 leading-normal">
                Currently signed in as <strong>{currentUser.email}</strong>. This account does not have administrator privileges. Please sign in with an authorized administrator account below.
              </p>
            </div>
          </div>
        )}

        {loginError && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-snug">
              <strong className="block font-bold">Access Denied:</strong>
              {loginError}
            </div>
          </div>
        )}

        <form onSubmit={handleAdminSignIn} className="space-y-4">
          <div>
            <div className="mb-1.5">
              <label className="block text-[11px] font-mono font-bold uppercase text-slate-700 tracking-wider">
                Administrator Email
              </label>
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={adminEmailInput}
                onChange={(e) => setAdminEmailInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#C41E3A] focus:ring-1 focus:ring-[#C41E3A] outline-hidden font-medium transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-mono font-bold uppercase text-slate-700 tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                className="w-full pl-9 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-[#C41E3A] focus:ring-1 focus:ring-[#C41E3A] outline-hidden font-medium transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isAuthenticating}
            className="w-full mt-2 py-3 bg-[#C41E3A] hover:bg-[#A0182E] text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-xs disabled:opacity-60 cursor-pointer"
          >
            {isAuthenticating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying with Firebase...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Sign In to Admin Mode</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-mono">Hueneme High 3D Print Lab</span>
          <span className="font-mono text-slate-400">Room Q10</span>
        </div>
      </div>
    );
  }

  // Pending listings awaiting safety clearance
  const pendingListings = listings.filter((l) => l.status === 'pendingApproval');

  const handleApprove = async (id: string) => {
    setActionError(null);
    setIsProcessing(true);
    try {
      await approveListing(id);
      setActionSuccess('Listing approved and published to the live marketplace!');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to approve listing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionError(null);
    setIsProcessing(true);
    try {
      await rejectListing(id);
      setActionSuccess('Listing rejected.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reject listing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderId) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      await updateOrderStatus(selectedOrderId, newStatus, statusNote.trim() || undefined);
      setActionSuccess(`Line-item status updated to ${newStatus}!`);
      setSelectedOrderId(null);
      setStatusNote('');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update order status.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCashDeposit = async (orderId: string, amount: number) => {
    setActionError(null);
    setIsProcessing(true);
    try {
      await confirmCashDeposit(orderId, amount);
      setActionSuccess('Cash deposit confirmed and added to the reconciliation log.');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to confirm cash deposit.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setActionError(null);
    try {
      await addCategory(newCatName.trim());
      setNewCatName('');
      setActionSuccess('New category added to Firestore!');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to create category.');
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Delete the category "${categoryName}"?`)) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      await deleteCategory(categoryId);
      setActionSuccess(`Deleted "${categoryName}".`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete category.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Class Students Roster Handlers
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentEmailInput.trim()) {
      setActionError('Please enter a valid student email address.');
      return;
    }
    setActionError(null);
    setIsProcessing(true);
    try {
      await addClassStudent(
        studentEmailInput.trim(),
        studentNameInput.trim() || undefined,
        studentPeriodInput.trim() || undefined,
        studentNotesInput.trim() || undefined
      );
      setActionSuccess(`Enrolled "${studentEmailInput.trim()}" in Class Students! Model publishing permission is now active.`);
      setStudentEmailInput('');
      setStudentNameInput('');
      setStudentNotesInput('');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to add student to class roster.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddCurrentUserToRoster = async () => {
    if (!currentUser?.email) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      await addClassStudent(
        currentUser.email,
        userProfile?.displayName || currentUser.displayName || 'Current User',
        studentPeriodInput || 'Period 3 Robotics',
        'Direct teacher roster enrollment'
      );
      setActionSuccess(`Added "${currentUser.email}" to Class Students! Publishing button is now visible.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to add student.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTogglePublish = async (student: ClassStudent) => {
    setActionError(null);
    try {
      const nextVal = !student.canPublish;
      await updateClassStudent(student.id, { canPublish: nextVal });
      setActionSuccess(`Publishing permission ${nextVal ? 'ENABLED' : 'PAUSED'} for ${student.email}`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to toggle publishing status.');
    }
  };

  const handleRemoveStudentFromRoster = async (studentId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove "${email}" from the Class Students roster? They will no longer see the "Publish Model" button.`)) {
      return;
    }
    setActionError(null);
    try {
      await removeClassStudent(studentId);
      setActionSuccess(`Removed ${email} from Class Students.`);
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove student.');
    }
  };

  const handleBatchAddStudents = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchEmailsInput.trim()) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      const rawList = batchEmailsInput.split(/[\n,;]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
      let count = 0;
      for (const email of rawList) {
        if (!classStudents.some((s) => s.email?.toLowerCase() === email)) {
          await addClassStudent(email, email.split('@')[0], studentPeriodInput);
          count++;
        }
      }
      setActionSuccess(`Successfully added ${count} student(s) to the Class publishing roster!`);
      setBatchEmailsInput('');
      setShowBatchModal(false);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to batch add students.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmailInput.trim()) return;
    setActionError(null);
    setIsProcessing(true);
    try {
      await addAdminEmail(newAdminEmailInput.trim());
      setActionSuccess(`Added "${newAdminEmailInput.trim()}" to authorized Administrator Whitelist!`);
      setNewAdminEmailInput('');
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to add administrator.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveAdminAccount = async (email: string) => {
    if (!confirm(`Are you sure you want to remove administrator privileges for "${email}"? They will no longer have access to Admin Mode.`)) {
      return;
    }
    setActionError(null);
    try {
      await removeAdminEmail(email);
      setActionSuccess(`Removed "${email}" from Admin Whitelist.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove administrator.');
    }
  };

  const filteredClassStudents = classStudents.filter((s) => {
    if (!studentSearchFilter) return true;
    const q = studentSearchFilter.toLowerCase();
    return (
      s.email?.toLowerCase().includes(q) ||
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.period && s.period.toLowerCase().includes(q)) ||
      (s.notes && s.notes.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-20">
      
      {/* Admin Notice Header */}
      <div className="bg-slate-900 text-white rounded-lg p-6 sm:p-7 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
              ADMIN MODE ACTIVATED • WHITELIST VERIFIED
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold uppercase tracking-tight text-white">
            Teacher & Admin Moderation Console
          </h1>
          <p className="text-xs text-slate-300 mt-1 font-normal">
            Moderation, line-item print status control, and lab deposit reconciliation for Room Q10.
          </p>
        </div>

        <div className="text-xs font-mono bg-slate-800/80 px-3 py-2 rounded border border-slate-700 shrink-0">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">Admin Account</span>
          <span className="font-bold text-emerald-400">{currentUser.email}</span>
        </div>
      </div>

      {/* Refunds Policy Clean Statement (Requirement 4) */}
      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2 shadow-xs">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-snug">
          <strong>Refund Policy:</strong> Handling and processing refunds is purely the teacher's responsibility. Automated reversals are not executed by the system once spools are unsealed.
        </div>
      </div>

      {/* Feedback alerts */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-800 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('pending_listings')}
          className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'pending_listings'
              ? 'border-[#C41E3A] text-[#C41E3A]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Pending Approvals</span>
          {pendingListings.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-[#C41E3A] text-white rounded-full text-[10px] font-mono">
              {pendingListings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'orders'
              ? 'border-[#C41E3A] text-[#C41E3A]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Orders & Print Status</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'requests'
              ? 'border-[#C41E3A] text-[#C41E3A]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Requests</span>
          {requests.length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 bg-[#C41E3A]/10 text-[#C41E3A] rounded-full text-[10px] font-mono font-bold">
              {requests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('financials')}
          className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'financials'
              ? 'border-[#C41E3A] text-[#C41E3A]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Deposits & Refunds</span>
        </button>

        <button
          onClick={() => setActiveTab('all_listings')}
          className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'all_listings'
              ? 'border-[#C41E3A] text-[#C41E3A]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Catalog Management</span>
        </button>

        <button
          onClick={() => setActiveTab('class_students')}
          className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'class_students'
              ? 'border-[#C41E3A] text-[#C41E3A]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Class Students</span>
          <span className="ml-1 px-1.5 py-0.2 bg-[#C41E3A]/10 text-[#C41E3A] rounded-full text-[10px] font-mono font-bold">
            {classStudents.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'categories'
              ? 'border-[#C41E3A] text-[#C41E3A]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FolderPlus className="w-3.5 h-3.5" />
          <span>Categories</span>
        </button>

        <button
          onClick={() => setActiveTab('admin_accounts')}
          className={`pb-3 px-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
            activeTab === 'admin_accounts'
              ? 'border-[#C41E3A] text-[#C41E3A]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Admin Accounts</span>
          <span className="ml-1 px-1.5 py-0.2 bg-[#C41E3A]/10 text-[#C41E3A] rounded-full text-[10px] font-mono font-bold">
            {adminWhitelist.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Pending Approvals */}
      {activeTab === 'pending_listings' && (
        <div className="space-y-4">
          {pendingListings.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-xs text-slate-500 font-mono">
              All student 3D models reviewed. No pending safety clearances.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingListings.map((l) => (
                <div
                  key={l.id}
                  className="bg-white rounded-lg border border-slate-200 p-4 space-y-3 shadow-xs"
                >
                  <div className="flex gap-3">
                    <img
                      src={l.imageUrl}
                      alt={l.title}
                      className="w-16 h-16 object-cover rounded bg-slate-100 shrink-0"
                    />
                    <div className="space-y-1 grow">
                      <h3 className="font-extrabold text-sm uppercase text-slate-900">
                        {l.title || l.name}
                      </h3>
                      <div className="text-xs text-slate-600 font-mono">
                        Maker: {l.creatorDisplayName || l.makerName}
                      </div>
                      <div className="text-xs font-mono font-bold text-[#C41E3A]">
                        {l.priceType === 'quote' ? 'Quote Required' : `$${l.price.toFixed(2)}`} • {l.material}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {l.description}
                  </p>

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      onClick={() => handleReject(l.id)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase rounded transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(l.id)}
                      disabled={isProcessing}
                      className="px-3 py-1.5 bg-[#C41E3A] hover:bg-[#A0182E] text-white text-xs font-bold uppercase rounded transition-colors"
                    >
                      Approve & Publish
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Orders & Print Status Control (Requirement 5) */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-tight text-slate-900">
                  Line-Item Print Status Control
                </h3>
                <p className="text-xs text-slate-500">
                  Print handlers and teachers can toggle print status and review customer update points.
                </p>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No orders or quote inquiries currently recorded.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <div key={o.id} className="py-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs text-slate-400 uppercase font-bold">
                          Order #{o.id.slice(0, 6).toUpperCase()}
                        </span>
                        <h4 className="font-extrabold text-sm uppercase text-slate-900">
                          {o.listingTitle} ({o.quantity} unit)
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                            o.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-800'
                              : o.status === 'inProduction'
                              ? 'bg-blue-50 text-blue-800'
                                : o.status === 'ready'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          Status: {o.status}
                        </span>

                        <button
                          onClick={() => {
                            setSelectedOrderId(o.id);
                            setNewStatus(o.status);
                          }}
                          className="px-2.5 py-1 bg-slate-900 hover:bg-[#C41E3A] text-white text-[10px] font-bold uppercase rounded transition-colors"
                        >
                          Change Status
                        </button>
                      </div>
                    </div>

                    {/* Customer Contact Point (Requirement 5) */}
                    <div className="bg-slate-50 border border-slate-200 rounded p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Customer:</span>
                        <strong className="text-slate-900">
                          {o.customerFirstName || o.buyerDisplayName} {o.customerLastName || ''}
                        </strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Contact Point:</span>
                        <span className="text-slate-800">
                          {o.contactEmail || o.contactPhone || 'None Provided'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase">Deposit:</span>
                        <span className={o.depositPaid ? 'text-emerald-700 font-bold' : 'text-slate-500'}>
                          {o.depositPaid ? `Paid ($${o.depositAmount?.toFixed(2) || '2.50'})` : 'Unpaid'}
                        </span>
                      </div>
                    </div>

                    {/* Inline Status Changer */}
                    {selectedOrderId === o.id && (
                      <form
                        onSubmit={handleUpdateOrderStatus}
                        className="p-3 bg-red-50/50 border border-red-100 rounded space-y-2"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-bold uppercase text-slate-700 mb-1">
                              New Line-Item Status
                            </label>
                            <select
                              value={newStatus}
                              onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
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
                              Status Log Note
                            </label>
                            <input
                              type="text"
                              value={statusNote}
                              onChange={(e) => setStatusNote(e.target.value)}
                              placeholder="e.g. Sliced with Cura, Prusa MK3 Bed 2"
                              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded"
                            />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderId(null)}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900 uppercase font-bold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isProcessing}
                            className="px-3 py-1 bg-[#C41E3A] text-white text-xs font-bold uppercase rounded shadow-xs"
                          >
                            Save Status Change
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Custom Requests and Confirmed Contact Information */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs">
            <div className="mb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-tight text-slate-900">
                Custom Requests
              </h3>
              <p className="text-xs text-slate-500">
                Contact information shown here was confirmed by the requester before submission.
              </p>
            </div>

            {requests.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 font-mono">
                No custom requests currently recorded.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {requests.map((request) => (
                  <div key={request.id} className="py-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs text-slate-400 uppercase font-bold">
                          {request.ticketNumber}
                        </span>
                        <h4 className="font-extrabold text-sm uppercase text-slate-900">
                          {request.itemTitle}
                        </h4>
                      </div>
                      <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono font-bold uppercase">
                        {request.status}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">Requester</span>
                        <span className="font-semibold text-slate-900">
                          {request.customerFirstName || request.requesterDisplayName} {request.customerLastName || ''}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">Email</span>
                        <span className="break-all text-slate-800">{request.contactEmail || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">Phone</span>
                        <span className="text-slate-800">{request.contactPhone || 'Not provided'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold uppercase text-slate-400">Preferred Updates</span>
                        <span className="font-semibold capitalize text-slate-800">
                          {request.preferredUpdateMethod || 'Not selected'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Deposits & Refunds (Requirement 4) */}
      {activeTab === 'financials' && (
        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4 shadow-xs">
            <div>
              <h3 className="text-sm font-extrabold uppercase tracking-tight text-slate-900">
                Deposit Reconciliation & Refund Responsibility
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Overview of deposits confirmed by the teacher for Room Q10.
              </p>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
              <strong className="block text-sm uppercase">Refund Policy Notice:</strong>
              <p className="leading-relaxed">
                Handling and processing refunds is purely the teacher's responsibility. If an order fails due to filament snag or dimension mismatch, the teacher in charge of Room Q10 must manually credit the student account or re-queue the fabrication.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-tight text-slate-900">Awaiting Teacher Confirmation</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Confirm cash received in Room Q10. This is the only place an order becomes paid.</p>
              </div>
              {orders.filter((order) => !order.depositPaid).length === 0 ? (
                <p className="text-xs text-slate-500">No unpaid orders are waiting for confirmation.</p>
              ) : (
                <div className="space-y-2">
                  {orders.filter((order) => !order.depositPaid).map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white border border-slate-200 rounded p-3">
                      <div className="text-xs">
                        <strong className="text-slate-900">{order.listingTitle}</strong>
                        <span className="block text-slate-500">{order.customerFirstName || order.buyerDisplayName} • Suggested deposit ${(order.depositAmount || 2.5).toFixed(2)}</span>
                      </div>
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => handleConfirmCashDeposit(order.id, order.depositAmount || 2.5)}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[10px] font-bold uppercase tracking-wider disabled:opacity-60"
                      >
                        Confirm Cash Received
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Order</th>
                    <th className="p-3">Item</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Deposit</th>
                    <th className="p-3">Transaction ID</th>
                    <th className="p-3">Refund Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.filter(o => o.depositPaid).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No teacher-confirmed deposits are recorded yet.
                      </td>
                    </tr>
                  ) : (
                    orders
                      .filter(o => o.depositPaid)
                      .map(o => (
                        <tr key={o.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold text-slate-700">#{o.id.slice(0, 6).toUpperCase()}</td>
                          <td className="p-3 font-bold text-slate-900">{o.listingTitle}</td>
                          <td className="p-3 text-slate-600">{o.customerFirstName || o.buyerDisplayName} {o.customerLastName || ''}</td>
                          <td className="p-3 font-bold text-[#C41E3A]">${(o.depositAmount || 2.5).toFixed(2)}</td>
                          <td className="p-3 text-slate-500">{o.depositTransactionId || 'Teacher confirmed'}</td>
                          <td className="p-3 text-slate-500">
                            Teacher Handled
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: All Listings */}
      {activeTab === 'all_listings' && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3">Model</th>
                <th className="p-3">Material</th>
                <th className="p-3">Maker</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listings.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="p-3 font-bold text-slate-900">{l.title || l.name}</td>
                  <td className="p-3 text-slate-600">{l.material}</td>
                  <td className="p-3 text-slate-600">{l.creatorDisplayName || l.makerName}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        l.status === 'published'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => deleteListing(l.id)}
                      className="text-rose-600 hover:underline font-bold uppercase text-[11px]"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 5: Categories */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4 shadow-xs">
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-tight text-slate-900">
              Manage Categories
            </h3>
            <p className="text-xs text-slate-500">
              Categories added here are dynamically available in search and filter options.
            </p>
          </div>

          <form onSubmit={handleCreateCategory} className="flex gap-2 max-w-md">
            <input
              type="text"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              placeholder="e.g. Robotics, Architecture"
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded grow focus:bg-white focus:border-[#C41E3A] outline-hidden"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#C41E3A] hover:bg-[#A0182E] text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
            >
              Add Category
            </button>
          </form>

          <div className="flex flex-wrap gap-2 pt-2">
            {categories.map((c) => (
              <div
                key={c.id}
                className="inline-flex items-center gap-2 px-2.5 py-1 bg-slate-100 text-slate-800 rounded text-xs"
              >
                {c.name}
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(c.id, c.name)}
                  disabled={isProcessing}
                  aria-label={`Delete ${c.name}`}
                  title="Delete category"
                  className="text-slate-400 hover:text-rose-600 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Class Students (Publishing Access Control) */}
      {activeTab === 'class_students' && (
        <div className="space-y-6">
          {/* Main Info Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#C41E3A] bg-red-50 px-2 py-0.5 rounded border border-red-100">
                    ACCESS CONTROL • MODEL PUBLISHING ROSTER
                  </span>
                </div>
                <h3 className="text-lg font-extrabold uppercase tracking-tight text-slate-900 mt-1">
                  Class Students Roster & Publishing Permissions
                </h3>
                <p className="text-xs text-slate-600 mt-0.5 max-w-2xl leading-relaxed">
                  Only students added with that email the teacher will put will be able to see the button that says <strong className="text-slate-900 font-bold uppercase">"Publish Model"</strong> on the marketplace.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(true)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Batch Add Emails</span>
                </button>
              </div>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                  Enrolled Students
                </span>
                <span className="text-2xl font-extrabold text-slate-900 font-mono">
                  {classStudents.length}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                  Publishing Allowed
                </span>
                <span className="text-2xl font-extrabold text-emerald-600 font-mono">
                  {classStudents.filter((s) => s.canPublish !== false).length}
                </span>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block">
                  Active Admin Session
                </span>
                <span className="text-xs font-bold text-slate-900 block truncate mt-1">
                  {currentUser?.email}
                </span>
              </div>
            </div>

            {/* Quick Helper to add current user if testing */}
            {currentUser?.email && !classStudents.some((s) => s.email.toLowerCase() === currentUser.email?.toLowerCase()) && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-900 block">Testing as a student?</span>
                    <span className="text-amber-800">
                      Your current account (<span className="font-mono font-bold">{currentUser.email}</span>) is not yet listed in the student roster. Click below to add it instantly to verify the "Publish Model" button.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddCurrentUserToRoster}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold uppercase text-[11px] tracking-wider shrink-0 transition-colors"
                >
                  Add My Email To Class
                </button>
              </div>
            )}

            {/* Add Student Form */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-[#C41E3A]" />
                <span>Add Student by Email</span>
              </div>

              <form onSubmit={handleAddStudent} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-600 mb-1">
                    Student Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={studentEmailInput}
                    onChange={(e) => setStudentEmailInput(e.target.value)}
                    placeholder="student@oxnardunion.org"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-[#C41E3A] outline-hidden font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-600 mb-1">
                    Student Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={studentNameInput}
                    onChange={(e) => setStudentNameInput(e.target.value)}
                              placeholder="Student name"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-[#C41E3A] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase text-slate-600 mb-1">
                    Class Period / Group
                  </label>
                  <select
                    value={studentPeriodInput}
                    onChange={(e) => setStudentPeriodInput(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded focus:border-[#C41E3A] outline-hidden"
                  >
                    <option value="Period 3 Robotics">Period 3 Robotics</option>
                    <option value="Period 5 Engineering">Period 5 Engineering</option>
                    <option value="Period 1 CAD/Fab">Period 1 CAD/Fab</option>
                    <option value="Robotics Club (After-School)">Robotics Club (After-School)</option>
                    <option value="General Class Roster">General Class Roster</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full py-2 bg-[#C41E3A] hover:bg-[#A0182E] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-xs flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Authorize Student</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="relative max-w-sm w-full">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={studentSearchFilter}
                  onChange={(e) => setStudentSearchFilter(e.target.value)}
                  placeholder="Search student email, name, period..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:border-[#C41E3A] outline-hidden font-mono"
                />
              </div>

              <div className="text-[11px] font-mono text-slate-500">
                Showing <strong className="text-slate-900">{filteredClassStudents.length}</strong> of {classStudents.length} students
              </div>
            </div>

            {/* Students Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px] font-mono">
                  <tr>
                    <th className="p-3">Student / Email</th>
                    <th className="p-3">Class Period</th>
                    <th className="p-3">Publish Model Permission</th>
                    <th className="p-3">Added Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {filteredClassStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 font-mono text-xs">
                        {studentSearchFilter
                          ? `No students matching "${studentSearchFilter}"`
                          : 'No class students enrolled yet. Use the form above to authorize students.'}
                      </td>
                    </tr>
                  ) : (
                    filteredClassStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono text-xs text-slate-900">{student.email}</span>
                          </div>
                          {student.name && student.name !== student.email && (
                            <div className="text-[11px] text-slate-500 pl-5 font-medium">
                              {student.name} {student.studentId && `• ${student.studentId}`}
                            </div>
                          )}
                        </td>

                        <td className="p-3 text-slate-600 font-mono text-[11px]">
                          <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                            {student.period || 'Period 3 Robotics'}
                          </span>
                        </td>

                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => handleTogglePublish(student)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-colors ${
                              student.canPublish !== false
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {student.canPublish !== false ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Publishing Allowed</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3 text-slate-400" />
                                <span>Paused</span>
                              </>
                            )}
                          </button>
                        </td>

                        <td className="p-3 text-slate-500 font-mono text-[10px]">
                          {student.addedAt ? new Date(student.addedAt).toLocaleDateString() : 'Active'}
                        </td>

                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleRemoveStudentFromRoster(student.id, student.email)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase"
                            title="Remove student from class roster"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Remove</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Batch Add Modal */}
          {showBatchModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-[#C41E3A]" />
                    <h4 className="text-sm font-extrabold uppercase tracking-tight text-slate-900">
                      Batch Add Class Students
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowBatchModal(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Paste student emails separated by commas, semicolons, or new lines. Each student added will immediately receive permission to see the <strong>"Publish Model"</strong> button.
                </p>

                <form onSubmit={handleBatchAddStudents} className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono font-bold uppercase text-slate-600 mb-1">
                      Student Emails
                    </label>
                    <textarea
                      rows={5}
                      required
                      value={batchEmailsInput}
                      onChange={(e) => setBatchEmailsInput(e.target.value)}
                      placeholder={`student1@oxnardunion.org\nstudent2@oxnardunion.org\nstudent3@oxnardunion.org`}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded font-mono focus:bg-white focus:border-[#C41E3A] outline-hidden"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowBatchModal(false)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="px-4 py-1.5 bg-[#C41E3A] hover:bg-[#A0182E] text-white rounded text-xs font-bold uppercase tracking-wider"
                    >
                      Add All Students
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 8: Authorized Administrator Accounts */}
      {activeTab === 'admin_accounts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#C41E3A]" />
                  Authorized Administrator Accounts
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Only accounts authorized in this whitelist are permitted to log in and unlock Admin Mode.
                </p>
              </div>

              <div className="text-[11px] font-mono text-slate-500 bg-slate-50 px-3 py-1.5 rounded border border-slate-200 shrink-0">
                Total Admins: <strong className="text-slate-900">{adminWhitelist.length}</strong>
              </div>
            </div>

            {/* Add new admin account form */}
            <form onSubmit={handleAddAdminAccount} className="max-w-xl mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-700 mb-1.5">
                Authorize New Administrator
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={newAdminEmailInput}
                    onChange={(e) => setNewAdminEmailInput(e.target.value)}
                    placeholder="teacher@oxnardunion.org"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:border-[#C41E3A] focus:ring-1 focus:ring-[#C41E3A] outline-hidden font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-4 py-2 bg-[#C41E3A] hover:bg-[#A0182E] text-white rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shadow-xs disabled:opacity-60"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Authorize Admin</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                When authorized, this account will be able to verify their password and enter Admin Mode from the restricted portal.
              </p>
            </form>

            {/* Table of whitelisted admins */}
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-mono font-bold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Administrator Email</th>
                    <th className="py-2.5 px-4">Role & Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminWhitelist.map((email) => {
                    const isPrimary = email.toLowerCase() === BASELINE_ADMIN_WHITELIST[0].toLowerCase();
                    const isCurrent = currentUser?.email?.toLowerCase() === email.toLowerCase();
                    return (
                      <tr key={email} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">{email}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-900 text-white">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {isPrimary ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Primary Root Admin (Protected)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Authorized Administrator
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isPrimary ? (
                            <span className="text-[11px] text-slate-400 italic">Protected</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveAdminAccount(email)}
                              className="text-rose-600 hover:text-rose-800 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Revoke
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
