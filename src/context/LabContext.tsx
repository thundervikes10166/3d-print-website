import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../lib/firebase';
import { isAdjacentRequestStage } from '../lib/requestWorkflow';
import { isAdjacentOrderStage } from '../lib/orderWorkflow';
import {
  UserProfile,
  Listing,
  CustomRequest,
  Order,
  ActiveView,
  ListingStatus,
  RequestStatus,
  OrderStatus,
  CategoryItem,
  MaterialInventoryItem,
  BASELINE_ADMIN_WHITELIST,
  ClassStudent,
  ClassStudentApplication,
} from '../types';

interface LabContextType {
  // Auth state
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isAuthLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;

  // Auth actions
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateStudentProfile: (data: Partial<UserProfile>) => Promise<void>;

  // Navigation & UI state
  activeView: ActiveView;
  navigateTo: (view: ActiveView, params?: { productId?: string; makerId?: string; listingId?: string }) => void;
  selectedProductId: string | null;
  selectedMakerId: string | null;
  editingListingId: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  showStatusModal: boolean;
  setShowStatusModal: (show: boolean) => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authModalMode: 'login' | 'signup' | 'reset';
  setAuthModalMode: (mode: 'login' | 'signup' | 'reset') => void;

  // Real Firestore Data
  listings: Listing[];
  categories: CategoryItem[];
  requests: CustomRequest[];
  orders: Order[];
  inventory: MaterialInventoryItem[];
  isLoadingData: boolean;
  firebaseConnectionError: string | null;
  isConfigured: boolean;

  // Whitelist & Role Flags
  isAdminWhitelisted: boolean;
  canManageStore: boolean;
  canManageAccounts: boolean;
  isPrintHandler: boolean;
  canModifyPrintStatus: (sellerId?: string) => boolean;

  // Payment instructions
  showPaymentModal: boolean;
  setShowPaymentModal: (show: boolean) => void;
  paymentModalData: { orderId: string; orderTitle: string; amount: number } | null;
  openPaymentGateway: (data: { orderId: string; orderTitle: string; amount: number }) => void;
  closePaymentGateway: () => void;

  // Firestore Operations (Listings)
  createListing: (listingData: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updateListing: (listingId: string, updates: Partial<Listing>) => Promise<void>;
  deleteListing: (listingId: string) => Promise<void>;
  approveListing: (listingId: string) => Promise<void>;
  rejectListing: (listingId: string) => Promise<void>;

  // Firestore Operations (Custom Requests)
  createCustomRequest: (requestData: Omit<CustomRequest, 'id' | 'ticketNumber' | 'createdAt' | 'status'>) => Promise<string>;
  updateRequestStatus: (requestId: string, status: RequestStatus, note?: string) => Promise<void>;
  addRequestNote: (requestId: string, note: string) => Promise<void>;
  updateRequestDetails: (requestId: string, updates: Partial<CustomRequest>) => Promise<void>;
  assignMakerToRequest: (requestId: string, makerId: string, makerName: string) => Promise<void>;

  // Firestore Operations (Orders)
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  updateOrderDetails: (orderId: string, updates: Partial<Order>) => Promise<void>;
  confirmCashDeposit: (orderId: string, amount: number) => Promise<void>;

  // Categories & Inventory Management (Teachers/Admins)
  addCategory: (name: string, description?: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateInventoryItem: (id: string, spools: number) => Promise<void>;

  // Class Students & Model Publishing Authorization
  classStudents: ClassStudent[];
  studentApplications: ClassStudentApplication[];
  approveStudentApplication: (uid: string) => Promise<void>;
  rejectStudentApplication: (uid: string) => Promise<void>;
  canPublishModel: boolean;
  addClassStudent: (email: string, name?: string, period?: string, notes?: string) => Promise<void>;
  removeClassStudent: (studentId: string) => Promise<void>;
  updateClassStudent: (studentId: string, updates: Partial<ClassStudent>) => Promise<void>;

  // Admin Accounts Whitelist
  adminWhitelist: string[];
  isWhitelistedAdminEmail: (email?: string | null) => boolean;
  addAdminEmail: (email: string) => Promise<void>;
  removeAdminEmail: (email: string) => Promise<void>;
}

// Legacy local browser caches must never grant elevated privileges.
const loadInitialClassStudents = (): ClassStudent[] => [];

const loadInitialAdminWhitelist = (): string[] => {
  try {
    const cached = localStorage.getItem('lab_admin_whitelist');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...BASELINE_ADMIN_WHITELIST, ...parsed]));
      }
    }
  } catch {}
  return [...BASELINE_ADMIN_WHITELIST];
};

const getTimestampMillis = (val: any): number => {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (typeof val.seconds === 'number') return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const d = Date.parse(val);
    return isNaN(d) ? 0 : d;
  }
  return 0;
};

const LabContext = createContext<LabContextType | undefined>(undefined);

const getFriendlyAuthError = (err: any, fallback: string): string => {
  switch (err?.code) {
    case 'auth/popup-closed-by-user':
      return 'Sign-in was cancelled. Please try again when you are ready.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in window. Allow pop-ups for this site and try again.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'The email or password is not correct.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email. Try signing in instead.';
    case 'auth/network-request-failed':
      return 'Connection problem. Check your internet and try again.';
    default:
      return fallback;
  }
};

export const LabProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [adminWhitelist, setAdminWhitelist] = useState<string[]>(loadInitialAdminWhitelist);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Helper to check admin authorization
  const isWhitelistedAdminEmail = (email?: string | null): boolean => {
    if (!email) return false;
    const clean = email.trim().toLowerCase();
    return adminWhitelist.map((e) => e.toLowerCase()).includes(clean);
  };

  // Nav state
  const [activeView, setActiveView] = useState<ActiveView>('marketplace');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedMakerId, setSelectedMakerId] = useState<string | null>(null);
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showStatusModal, setShowStatusModal] = useState<boolean>(false);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup' | 'reset'>('login');

  // Payment instructions modal state
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentModalData, setPaymentModalData] = useState<{
    orderId: string;
    orderTitle: string;
    amount: number;
  } | null>(null);

  const openPaymentGateway = (data: { orderId: string; orderTitle: string; amount: number }) => {
    setPaymentModalData(data);
    setShowPaymentModal(true);
  };

  const closePaymentGateway = () => {
    setShowPaymentModal(false);
    setPaymentModalData(null);
  };

  // Trusted backend role is the source of admin authorization.
  // An editable client-side allowlist cannot securely grant or revoke this role.
  const isAdminWhitelisted = Boolean(currentUser && userProfile?.role === 'admin');

  // Firestore collections state
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<MaterialInventoryItem[]>([]);
  const [classStudents, setClassStudents] = useState<ClassStudent[]>(loadInitialClassStudents);
  const [studentApplications, setStudentApplications] = useState<ClassStudentApplication[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [firebaseConnectionError, setFirebaseConnectionError] = useState<string | null>(null);

  // Print Handler privileges (Requirement 5)
  // Store operators are verified Firebase admins or an APPROVED class-student
  // document keyed to the signed-in user's Auth UID. Email-only entries are
  // intentionally not enough to grant staff access.
  const isApprovedClassStudent = Boolean(currentUser && classStudents.some(student =>
    student.id === currentUser.uid && student.approved === true && student.canPublish === true
  ));
  const canManageAccounts = Boolean(isAdminWhitelisted);
  const canManageStore = Boolean(isAdminWhitelisted || (userProfile?.role === 'teacher' || userProfile?.role === 'teacher_admin') || isApprovedClassStudent);

  const isPrintHandler = canManageStore;

  const canModifyPrintStatus = (_sellerId?: string): boolean => canManageStore;

  // Model Publishing Access: Whitelisted admins, teachers, and enrolled class students
  const canPublishModel = canManageStore;

  const clearAuthError = () => setAuthError(null);

  // 1. Auth State Listener
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setUserProfile(null);
      setIsAuthLoading(true);

      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            // Roles come from Firestore, not from an editable browser whitelist.
            setUserProfile(userDoc.data() as UserProfile);
          } else {
            // Firestore rules only allow self-service creation as a student.
            // Promote a trusted account to admin in Firebase Console afterwards.
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'Maker',
              role: 'student',
              gradeClass: 'Robotics Lab Student',
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
            // First-time Google users also appear in the admin approval queue.
            await setDoc(doc(db, 'class_student_applications', user.uid), {
              uid: user.uid, email: (user.email || '').trim().toLowerCase(),
              name: newProfile.displayName || 'New user', status: 'pending',
              createdAt: serverTimestamp(),
            });
          }
        } catch (err: any) {
          console.error('Error fetching user profile from Firestore:', err);
        }
      } else {
        setUserProfile(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-Time Firestore Synchronization for Public Listings & Categories
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setListings([]);
      setCategories([]);
      setInventory([]);
      setClassStudents(loadInitialClassStudents());
      setIsLoadingData(false);
      setFirebaseConnectionError(null);
      return;
    }

    setIsLoadingData(true);
    setFirebaseConnectionError(null);

    // Public visitors may only query published listings. Firestore security
    // rules are NOT filters: querying all listings as a visitor is denied.
    // Signed-in makers also receive their own drafts/pending listings.
    // Authorized teachers/admins may fetch all listings for moderation.
    const canModerateListings = canManageStore;
    let publishedOrAllListings: Listing[] = [];
    let ownListings: Listing[] = [];
    const updateVisibleListings = () => {
      const combined = canModerateListings
        ? publishedOrAllListings
        : [...publishedOrAllListings, ...ownListings];
      const byId = new Map(combined.map((item) => [item.id, item]));
      const sorted = Array.from(byId.values()).sort(
        (a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt)
      );
      setListings(sorted);
      setIsLoadingData(false);
    };

    const listingsQuery = canModerateListings
      ? collection(db, 'listings')
      : query(collection(db, 'listings'), where('status', '==', 'published'));
    const unsubListings = onSnapshot(
      listingsQuery,
      (snapshot) => {
        publishedOrAllListings = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Listing));
        updateVisibleListings();
      },
      (error) => {
        console.error('Firestore Listings snapshot error:', error);
        setFirebaseConnectionError(error.message);
        setIsLoadingData(false);
      }
    );

    let unsubOwnListings = () => {};
    if (currentUser && !canModerateListings) {
      const ownQuery = query(collection(db, 'listings'), where('creatorId', '==', currentUser.uid));
      unsubOwnListings = onSnapshot(
        ownQuery,
        (snapshot) => {
          ownListings = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Listing));
          updateVisibleListings();
        },
        (error) => console.warn('Own listings query notice:', error)
      );
    }

    // Fetch / Listen to Categories
    const unsubCategories = onSnapshot(
      collection(db, 'categories'),
      (snapshot) => {
        const cats: CategoryItem[] = [];
        snapshot.forEach((docSnap) => {
          cats.push({ id: docSnap.id, ...docSnap.data() } as CategoryItem);
        });
        setCategories(cats);
      },
      (error) => {
        console.warn('Categories query notice:', error);
      }
    );

    // Fetch / Listen to Inventory
    const unsubInventory = onSnapshot(
      collection(db, 'inventory'),
      (snapshot) => {
        const inv: MaterialInventoryItem[] = [];
        snapshot.forEach((docSnap) => {
          inv.push({ id: docSnap.id, ...docSnap.data() } as MaterialInventoryItem);
        });
        setInventory(inv);
      },
      (err) => {
        console.warn('Inventory query notice:', err);
      }
    );

    // Approved student memberships are tied to Firebase Auth UIDs, never to
    // editable client-side emails or localStorage lists.
    const studentMembershipSource = currentUser
      ? (canManageAccounts ? collection(db, 'class_students') : doc(db, 'class_students', currentUser.uid))
      : null;
    const unsubClassStudents = studentMembershipSource ? onSnapshot(
      studentMembershipSource as any,
      (snapshot: any) => {
        if ('docs' in snapshot) {
          setClassStudents(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as ClassStudent)));
        } else {
          setClassStudents(snapshot.exists() ? [{ id: snapshot.id, ...snapshot.data() } as ClassStudent] : []);
        }
      },
      (err: any) => console.warn('Class students subscription error:', err)
    ) : () => { setClassStudents([]); };

    const unsubStudentApplications = currentUser && canManageAccounts ? onSnapshot(
      collection(db, 'class_student_applications'),
      snapshot => setStudentApplications(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClassStudentApplication))
        .sort((a,b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt))),
      err => console.warn('Student applications subscription error:', err)
    ) : () => { setStudentApplications([]); };

    // Fetch / Listen to Admin Whitelist
    const unsubAdminWhitelist = currentUser && canManageAccounts ? onSnapshot(
      collection(db, 'admin_whitelist'),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: string[] = [...BASELINE_ADMIN_WHITELIST];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.email) {
              list.push(data.email.trim().toLowerCase());
            }
          });
          const unique = Array.from(new Set(list));
          setAdminWhitelist(unique);
          try {
            localStorage.setItem('lab_admin_whitelist', JSON.stringify(unique));
          } catch {}
        }
      },
      (err) => {
        console.warn('Admin whitelist listener notice:', err);
      }
    ) : () => {};

    return () => {
      unsubListings();
      unsubOwnListings();
      unsubCategories();
      unsubInventory();
      unsubClassStudents();
      unsubStudentApplications();
      unsubAdminWhitelist();
    };
  }, [currentUser?.uid, userProfile?.role, canManageStore, canManageAccounts]);

  // 3. User-Specific / Role-Specific Listeners (Requests and Orders)
  useEffect(() => {
    if (!currentUser) {
      setRequests([]);
      setOrders([]);
      return;
    }

    const isTeacher = canManageStore;

    // Teachers/admins can read all. Customers can read their own requests.
    // An assigned student maker additionally receives only requests assigned to them.
    const isTeacherOrAdmin = isTeacher;
    const ownRequestsQuery = isTeacherOrAdmin
      ? collection(db, 'requests')
      : query(collection(db, 'requests'), where('requesterId', '==', currentUser.uid));
    let ownRequests: CustomRequest[] = [];
    let makerRequests: CustomRequest[] = [];
    const publishRequests = () => {
      const merged = new Map<string, CustomRequest>();
      [...ownRequests, ...makerRequests].forEach((request) => merged.set(request.id, request));
      setRequests(Array.from(merged.values()).sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt)));
    };
    const unsubRequests = onSnapshot(
      ownRequestsQuery,
      (snapshot) => {
        ownRequests = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as CustomRequest));
        publishRequests();
      },
      (err) => console.error('Requests subscription error:', err)
    );
    // Unapproved buyers may read only their own requests. No background query
    // for assigned-maker tickets is made, avoiding Firestore permission errors.
    const unsubMakerRequests = () => {};


    // Orders query - avoid composite index requirement by filtering only and sorting client-side
    const ordQuery = isTeacher
      ? collection(db, 'orders')
      : query(collection(db, 'orders'), where('buyerId', '==', currentUser.uid));

    const unsubOrders = onSnapshot(
      ordQuery,
      (snapshot) => {
        const ords: Order[] = [];
        snapshot.forEach((docSnap) => {
          ords.push({ id: docSnap.id, ...docSnap.data() } as Order);
        });
        // Safe client-side sort by createdAt descending
        ords.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
        setOrders(ords);
      },
      (err) => {
        console.error('Orders subscription error:', err);
      }
    );

    return () => {
      unsubRequests();
      unsubMakerRequests();
      unsubOrders();
    };
  }, [currentUser?.uid, canManageStore]);

  // Auth Operations
  const loginWithEmail = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(getFriendlyAuthError(err, 'Sign-in failed. Please try again.'));
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string) => {
    setAuthError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      if (result.user) {
        await updateProfile(result.user, { displayName: name.trim() });
        // onAuthStateChanged creates the initial student profile and pending
        // class approval request ONCE. A second setDoc here would race with
        // that listener and be blocked by the secure update rules.
      }
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(getFriendlyAuthError(err, 'Account creation failed. Please try again.'));
      throw err;
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setShowAuthModal(false);
    } catch (err: any) {
      setAuthError(getFriendlyAuthError(err, 'Google sign-in could not be completed. Please try again.'));
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setActiveView('marketplace');
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      setAuthError(getFriendlyAuthError(err, 'Password reset could not be sent. Please try again.'));
      throw err;
    }
  };

  const updateStudentProfile = async (data: Partial<UserProfile>) => {
    if (!currentUser) throw new Error('You must be signed in.');
    // Prevent client from escalating role
    const sanitized = { ...data };
    // Identity and authorization fields can only change through trusted admins.
    delete sanitized.role;
    delete sanitized.isPrintHandler;
    delete sanitized.uid;
    delete sanitized.email;
    delete sanitized.isWhitelistedAdmin;
    const docRef = doc(db, 'users', currentUser.uid);
    await updateDoc(docRef, sanitized);
    setUserProfile((prev) => (prev ? { ...prev, ...sanitized } : null));
  };

  // Navigation Helper
  const navigateTo = (
    view: ActiveView,
    params?: { productId?: string; makerId?: string; listingId?: string }
  ) => {
    if (params?.productId) setSelectedProductId(params.productId);
    if (params?.makerId) setSelectedMakerId(params.makerId);
    if (params?.listingId) setEditingListingId(params.listingId);
    setActiveView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Firestore Write Operations (Listings)
  const createListing = async (
    listingData: Omit<Listing, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<string> => {
    if (!currentUser) throw new Error('Authentication required to create a listing.');
    
    if (!canManageStore) throw new Error('Only approved class students and administrators can publish products.');
    const statusToSet: ListingStatus = 'published';

    const newDoc = {
      ...listingData,
      title: listingData.title || listingData.name || 'Untitled Design',
      name: listingData.title || listingData.name || 'Untitled Design',
      creatorId: currentUser.uid,
      creatorDisplayName: userProfile?.displayName || currentUser.displayName || 'Student Maker',
      makerId: currentUser.uid,
      makerName: userProfile?.displayName || currentUser.displayName || 'Student Maker',
      status: statusToSet,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'listings'), newDoc);
    return docRef.id;
  };

  const updateListing = async (listingId: string, updates: Partial<Listing>) => {
    if (!canManageStore) throw new Error('Staff approval required.');
    const docRef = doc(db, 'listings', listingId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteListing = async (listingId: string) => {
    if (!canManageStore) throw new Error('Staff approval required.');
    const docRef = doc(db, 'listings', listingId);
    await deleteDoc(docRef);
  };

  const approveListing = async (listingId: string) => {
    if (!currentUser) throw new Error('Teacher authentication required.');
    const docRef = doc(db, 'listings', listingId);
    await updateDoc(docRef, {
      status: 'published',
      updatedAt: serverTimestamp(),
    });
  };

  const rejectListing = async (listingId: string) => {
    if (!currentUser) throw new Error('Teacher authentication required.');
    const docRef = doc(db, 'listings', listingId);
    await updateDoc(docRef, {
      status: 'rejected',
      updatedAt: serverTimestamp(),
    });
  };

  // Firestore Write Operations (Custom Requests)
  const createCustomRequest = async (
    requestData: Omit<CustomRequest, 'id' | 'ticketNumber' | 'createdAt' | 'status'>
  ): Promise<string> => {
    if (!currentUser) throw new Error('Authentication required to submit custom requests.');

    const ticketNumber = `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRequest: Omit<CustomRequest, 'id'> = {
      ...requestData,
      ticketNumber,
      requesterId: currentUser.uid,
      requesterDisplayName: requestData.requesterDisplayName || userProfile?.displayName || currentUser.displayName || 'Requester',
      status: 'submitted',
      statusLog: [{
        status: 'submitted',
        timestamp: new Date().toISOString(),
        note: 'Quote request submitted.',
        changedByUid: currentUser.uid,
        changedByName: requestData.requesterDisplayName || currentUser.displayName || currentUser.email || 'Requester',
        changedByEmail: currentUser.email || '',
      }],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'requests'), newRequest);
    return docRef.id;
  };

  const ensureRequestEditor = (request: CustomRequest) => {
    if (!currentUser) throw new Error('Authentication required.');
    if (!canManageStore) throw new Error('An approved class-student or administrator account is required.');
  };

  const updateRequestStatus = async (
    requestId: string,
    status: RequestStatus,
    note?: string
  ): Promise<void> => {
    if (!currentUser) throw new Error('Authentication required.');
    const docRef = doc(db, 'requests', requestId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(docRef);
      if (!snap.exists()) throw new Error('Request not found.');
      const currentData = snap.data() as CustomRequest;
      ensureRequestEditor(currentData);
      if (!isAdjacentRequestStage(currentData.status, status)) {
        throw new Error('Move one stage forward or backward from the current request stage.');
      }
      const nextLog = [
        ...(currentData.statusLog || []),
        {
          status,
          timestamp: new Date().toISOString(),
          note: note?.trim() || `Moved to ${status}`,
          changedByUid: currentUser.uid,
          changedByName: userProfile?.displayName || currentUser.displayName || currentUser.email || 'Staff member',
          changedByEmail: currentUser.email || '',
        },
      ];
      transaction.update(docRef, { status, statusLog: nextLog, updatedAt: serverTimestamp() });
    });
  };

  const updateRequestDetails = async (requestId: string, updates: Partial<CustomRequest>): Promise<void> => {
    if (!currentUser || !canManageStore) throw new Error('Staff approval required.');
    const allowed = [
      'itemTitle', 'description', 'quantity', 'desiredSize', 'desiredDimensions',
      'material', 'color', 'colorMode', 'neededByDate', 'estimatedCost',
      'contactEmail', 'contactPhone', 'pickupLocation',
    ] as const;
    const cleanUpdates: Record<string, any> = {};
    allowed.forEach(key => { if (key in updates) cleanUpdates[key] = updates[key]; });
    if ('quantity' in cleanUpdates && (!Number.isInteger(cleanUpdates.quantity) || cleanUpdates.quantity < 1 || cleanUpdates.quantity > 1000)) {
      throw new Error('Quantity must be between 1 and 1000.');
    }
    if (!Object.keys(cleanUpdates).length) return;
    await runTransaction(db, async transaction => {
      const ref = doc(db, 'requests', requestId);
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error('Request not found.');
      const previous = snap.data() as CustomRequest;
      transaction.update(ref, {
        ...cleanUpdates,
        editLog: [...(previous.editLog || []), {
          timestamp: new Date().toISOString(), changedByUid: currentUser.uid,
          changedByName: userProfile?.displayName || currentUser.email || 'Staff member',
          fields: Object.keys(cleanUpdates),
        }],
        updatedAt: serverTimestamp(),
      });
    });
  };

  const addRequestNote = async (requestId: string, text: string): Promise<void> => {
    if (!currentUser) throw new Error('Authentication required.');
    const content = text.trim();
    if (!content || content.length > 2000) throw new Error('Notes must contain 1 to 2000 characters.');
    const requestSnap = await getDoc(doc(db, 'requests', requestId));
    if (!requestSnap.exists()) throw new Error('Request not found.');
    ensureRequestEditor(requestSnap.data() as CustomRequest);
    await addDoc(collection(db, 'requests', requestId, 'staffNotes'), {
      text: content,
      timestamp: new Date().toISOString(),
      createdAt: serverTimestamp(),
      authorUid: currentUser.uid,
      authorName: userProfile?.displayName || currentUser.displayName || currentUser.email || 'Staff member',
      authorEmail: currentUser.email || '',
    });
  };

  const assignMakerToRequest = async (
    requestId: string,
    makerId: string,
    makerName: string
  ): Promise<void> => {
    if (!currentUser || !canManageStore) {
      throw new Error('Approved staff access is required to assign makers.');
    }
    await updateDoc(doc(db, 'requests', requestId), {
      assignedMakerId: makerId,
      assignedMakerName: makerName,
      // Assignment does not silently skip a workflow stage.
      updatedAt: serverTimestamp(),
    });
  };

  // Firestore Write Operations (Orders)
  const createOrder = async (
    orderData: Omit<Order, 'id' | 'createdAt' | 'status'>
  ): Promise<string> => {
    if (!currentUser) throw new Error('Authentication required to place an order.');

    const timestampStr = new Date().toISOString();

    const newOrder: any = {
      ...orderData,
      buyerId: currentUser.uid,
      buyerDisplayName: userProfile?.displayName || currentUser.displayName || 'Buyer',
      status: 'requested' as OrderStatus,
      statusLog: [
        {
          status: 'requested' as OrderStatus,
          timestamp: timestampStr,
          note: 'Shop order submitted.',
          changedByUid: currentUser.uid,
          changedByName: userProfile?.displayName || currentUser.email || 'Customer',
          changedByEmail: currentUser.email || '',
        },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'orders'), newOrder);
    return docRef.id;
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, note?: string) => {
    if (!currentUser || !canManageStore) throw new Error('Approved staff access required.');
    await runTransaction(db, async transaction => {
      const ref = doc(db, 'orders', orderId);
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error('Order not found.');
      const existing = snap.data() as Order;
      if (!isAdjacentOrderStage(existing.status, status)) {
        throw new Error('Move one stage forward or backward from the current shop order stage.');
      }
      const entry = {
        status,
        timestamp: new Date().toISOString(),
        note: note?.trim() || `Moved to ${status}`,
        changedByUid: currentUser.uid,
        changedByName: userProfile?.displayName || currentUser.email || 'Staff member',
        changedByEmail: currentUser.email || '',
      };
      transaction.update(ref, {
        status,
        statusLog: [...(existing.statusLog || []), entry],
        updatedAt: serverTimestamp(),
      });
    });
  };

  const updateOrderDetails = async (orderId: string, updates: Partial<Order>): Promise<void> => {
    if (!currentUser || !canManageStore) throw new Error('Approved staff access required.');
    const allowed = ['quantity','selectedColor','selectedMaterial','notes','pickupLocation','contactEmail','contactPhone'] as const;
    const cleanUpdates: Record<string, any> = {};
    allowed.forEach(key => { if (key in updates) cleanUpdates[key] = updates[key]; });
    if ('quantity' in cleanUpdates && (!Number.isInteger(cleanUpdates.quantity) || cleanUpdates.quantity < 1 || cleanUpdates.quantity > 1000)) {
      throw new Error('Quantity must be between 1 and 1000.');
    }
    if (!Object.keys(cleanUpdates).length) return;
    await runTransaction(db, async transaction => {
      const ref = doc(db, 'orders', orderId);
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error('Order not found.');
      const existing = snap.data() as Order;
      transaction.update(ref, {
        ...cleanUpdates,
        editLog: [...(existing.editLog || []), {
          timestamp: new Date().toISOString(), changedByUid: currentUser.uid,
          changedByName: userProfile?.displayName || currentUser.email || 'Staff member',
          fields: Object.keys(cleanUpdates),
        }],
        updatedAt: serverTimestamp(),
      });
    });
  };

  const confirmCashDeposit = async (orderId: string, amount: number) => {
    if (!currentUser) throw new Error('Authentication required.');
    if (!canManageAccounts) {
      throw new Error('Only an administrator can confirm a cash deposit.');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Deposit amount must be greater than zero.');
    }

    const docRef = doc(db, 'orders', orderId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Order not found.');

    const currentData = snap.data() as Order;
    const timestampStr = new Date().toISOString();
    const receiptId = `CASH-${Date.now().toString().slice(-8)}`;
    const newLog = [
      ...(currentData.statusLog || []),
      {
        status: currentData.status,
        timestamp: timestampStr,
        note: `Cash deposit of $${amount.toFixed(2)} confirmed (${receiptId}).`,
        changedByUid: currentUser.uid,
        changedByName: userProfile?.displayName || currentUser.email || 'Administrator',
        changedByEmail: currentUser.email || '',
      },
    ];

    await updateDoc(docRef, {
      depositPaid: true,
      depositAmount: amount,
      depositTransactionId: receiptId,
      depositPaidAt: serverTimestamp(),
      statusLog: newLog,
      updatedAt: serverTimestamp(),
    });
  };

  // Categories & Inventory
  const addCategory = async (name: string, description?: string) => {
    if (!canManageStore) throw new Error('Approved staff access required.');
    await addDoc(collection(db, 'categories'), {
      name,
      description: description || '',
      createdAt: serverTimestamp(),
    });
  };

  const deleteCategory = async (categoryId: string) => {
    if (!canManageStore) {
      throw new Error('Approved staff access required.');
    }
    await deleteDoc(doc(db, 'categories', categoryId));
  };

  const updateInventoryItem = async (id: string, spools: number) => {
    if (!canManageStore) throw new Error('Approved staff access required.');
    const docRef = doc(db, 'inventory', id);
    const status = spools > 2 ? 'In Stock' : spools > 0 ? 'Low' : 'Out of Stock';
    await updateDoc(docRef, {
      spoolsAvailable: spools,
      status,
      updatedAt: serverTimestamp(),
    });
  };

  // Admin-only class student approval and roster management. These records
  // authorize access, but removing one cannot delete Firebase Auth identities.
  const approveStudentApplication = async (uid: string): Promise<void> => {
    if (!currentUser || !canManageAccounts) throw new Error('Administrator access required.');
    const application = studentApplications.find(a => a.uid === uid && a.status === 'pending');
    if (!application) throw new Error('Pending application not found.');
    const batch = writeBatch(db);
    batch.set(doc(db, 'class_students', uid), {
      uid, email: application.email, name: application.name,
      period: 'Robotics / Makers', canPublish: true, approved: true,
      approvedAt: new Date().toISOString(), approvedBy: currentUser.email || currentUser.uid,
      addedAt: new Date().toISOString(), addedBy: currentUser.email || currentUser.uid,
    }, { merge: true });
    batch.update(doc(db, 'class_student_applications', uid), {
      status: 'approved', reviewedAt: serverTimestamp(), reviewedBy: currentUser.email || currentUser.uid,
    });
    await batch.commit();
  };

  const rejectStudentApplication = async (uid: string): Promise<void> => {
    if (!currentUser || !canManageAccounts) throw new Error('Administrator access required.');
    const application = studentApplications.find(a => a.uid === uid && a.status === 'pending');
    if (!application) throw new Error('Pending application not found.');
    await updateDoc(doc(db, 'class_student_applications', uid), {
      status: 'rejected', reviewedAt: serverTimestamp(), reviewedBy: currentUser.email || currentUser.uid,
    });
  };

  const addClassStudent = async (email: string, name?: string, period?: string, notes?: string) => {
    if (!currentUser || !canManageAccounts) throw new Error('Only admins can approve students.');
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Student email is required.');
    const existingAccounts = await getDocs(query(collection(db,'users'),where('email','==',cleanEmail)));
    if (existingAccounts.empty) throw new Error('This email must register an account before it can be added. Ask the student to sign up first.');
    const found = existingAccounts.docs[0];
    const uid = found.id;
    await setDoc(doc(db, 'class_students', uid), {
      uid, email: cleanEmail, name: name?.trim() || found.data().displayName || cleanEmail,
      period: period?.trim() || 'Robotics / Makers', notes: notes?.trim() || '',
      canPublish: true, approved: true,
      approvedAt: new Date().toISOString(), approvedBy: currentUser.email || currentUser.uid,
      addedAt: new Date().toISOString(), addedBy: currentUser.email || currentUser.uid,
    }, { merge: true });
    const applicationRef = doc(db, 'class_student_applications', uid);
    const applicationSnap = await getDoc(applicationRef);
    if (applicationSnap.exists()) await updateDoc(applicationRef, {
      status: 'approved', reviewedAt: serverTimestamp(), reviewedBy: currentUser.email || currentUser.uid,
    });
  };

  const removeClassStudent = async (studentId: string) => {
    if (!canManageAccounts) throw new Error('Only admins can remove students.');
    await deleteDoc(doc(db, 'class_students', studentId));
  };

  const updateClassStudent = async (studentId: string, updates: Partial<ClassStudent>) => {
    if (!canManageAccounts) throw new Error('Only admins can edit student access.');
    const clean: Record<string, unknown> = {};
    for (const key of ['canPublish','period','name','notes'] as const) {
      if (key in updates) clean[key] = updates[key];
    }
    if (!Object.keys(clean).length) return;
    await updateDoc(doc(db, 'class_students', studentId), {
      ...clean, updatedAt: serverTimestamp(),
    });
  };

  const addAdminEmail = async (email: string) => {
    if (!canManageAccounts) throw new Error('Only admins can manage accounts.');
    const clean = email.trim().toLowerCase();
    if (!clean) throw new Error('Please enter a valid administrator email address.');
    if (adminWhitelist.map((e) => e.toLowerCase()).includes(clean)) {
      throw new Error(`Email ${clean} is already an authorized administrator.`);
    }
    const updated = [...adminWhitelist, clean];
    setAdminWhitelist(updated);
    try {
      localStorage.setItem('lab_admin_whitelist', JSON.stringify(updated));
    } catch {}

    try {
      await addDoc(collection(db, 'admin_whitelist'), {
        email: clean,
        addedAt: serverTimestamp(),
        addedBy: currentUser?.email || 'admin',
      });
    } catch (err) {
      console.warn('Could not persist admin email to Firestore:', err);
    }
  };

  const removeAdminEmail = async (email: string) => {
    if (!canManageAccounts) throw new Error('Only admins can manage accounts.');
    const clean = email.trim().toLowerCase();
    if (clean === BASELINE_ADMIN_WHITELIST[0].toLowerCase()) {
      throw new Error(`The primary root administrator (${BASELINE_ADMIN_WHITELIST[0]}) cannot be removed.`);
    }
    const updated = adminWhitelist.filter((e) => e.toLowerCase() !== clean);
    setAdminWhitelist(updated);
    try {
      localStorage.setItem('lab_admin_whitelist', JSON.stringify(updated));
    } catch {}

    try {
      const q = query(collection(db, 'admin_whitelist'), where('email', '==', clean));
      const snaps = await getDocs(q);
      snaps.forEach(async (d) => {
        await deleteDoc(doc(db, 'admin_whitelist', d.id));
      });
    } catch (err) {
      console.warn('Could not remove admin email from Firestore:', err);
    }
  };

  return (
    <LabContext.Provider
      value={{
        currentUser,
        userProfile,
        isAuthLoading,
        authError,
        clearAuthError,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        logout,
        resetPassword,
        updateStudentProfile,
        activeView,
        navigateTo,
        selectedProductId,
        selectedMakerId,
        editingListingId,
        searchQuery,
        setSearchQuery,
        selectedCategory,
        setSelectedCategory,
        showStatusModal,
        setShowStatusModal,
        showAuthModal,
        setShowAuthModal,
        authModalMode,
        setAuthModalMode,
        listings,
        categories,
        requests,
        orders,
        inventory,
        isLoadingData,
        firebaseConnectionError,
        isConfigured: isFirebaseConfigured,
        isAdminWhitelisted,
        canManageStore,
        canManageAccounts,
        isPrintHandler,
        canModifyPrintStatus,
        showPaymentModal,
        setShowPaymentModal,
        paymentModalData,
        openPaymentGateway,
        closePaymentGateway,
        createListing,
        updateListing,
        deleteListing,
        approveListing,
        rejectListing,
        createCustomRequest,
        updateRequestStatus,
        addRequestNote,
        updateRequestDetails,
        assignMakerToRequest,
        createOrder,
        updateOrderStatus,
        updateOrderDetails,
        confirmCashDeposit,
        addCategory,
        deleteCategory,
        updateInventoryItem,
        classStudents,
        studentApplications,
        approveStudentApplication,
        rejectStudentApplication,
        canPublishModel,
        addClassStudent,
        removeClassStudent,
        updateClassStudent,
        adminWhitelist,
        isWhitelistedAdminEmail,
        addAdminEmail,
        removeAdminEmail,
      }}
    >
      {children}
    </LabContext.Provider>
  );
};

export const useLab = () => {
  const context = useContext(LabContext);
  if (!context) {
    throw new Error('useLab must be used within a LabProvider');
  }
  return context;
};
