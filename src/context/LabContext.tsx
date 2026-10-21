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
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db, googleProvider, isFirebaseConfigured } from '../lib/firebase';
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
  assignMakerToRequest: (requestId: string, makerId: string, makerName: string) => Promise<void>;

  // Firestore Operations (Orders)
  createOrder: (orderData: Omit<Order, 'id' | 'createdAt' | 'status'>) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string) => Promise<void>;
  confirmCashDeposit: (orderId: string, amount: number) => Promise<void>;

  // Categories & Inventory Management (Teachers/Admins)
  addCategory: (name: string, description?: string) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateInventoryItem: (id: string, spools: number) => Promise<void>;

  // Class Students & Model Publishing Authorization
  classStudents: ClassStudent[];
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

const loadInitialClassStudents = (): ClassStudent[] => {
  try {
    const cached = localStorage.getItem('lab_class_students');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        const realStudents = parsed.filter(
          (student) => !String(student?.id || '').startsWith('student-seed-')
        );
        if (realStudents.length !== parsed.length) {
          localStorage.setItem('lab_class_students', JSON.stringify(realStudents));
        }
        return realStudents;
      }
    }
  } catch {}
  return [];
};

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

  // Explicit Backend Whitelist verification (Requirement 6)
  const isAdminWhitelisted = Boolean(
    currentUser?.email && isWhitelistedAdminEmail(currentUser.email)
  );

  // Print Handler privileges (Requirement 5)
  const isPrintHandler = Boolean(
    isAdminWhitelisted ||
    userProfile?.role === 'teacher' ||
    userProfile?.role === 'admin' ||
    userProfile?.isPrintHandler
  );

  const canModifyPrintStatus = (sellerId?: string): boolean => {
    if (!currentUser) return false;
    if (isAdminWhitelisted) return true;
    if (userProfile?.role === 'teacher' || userProfile?.role === 'admin' || userProfile?.isPrintHandler) return true;
    if (sellerId && sellerId === currentUser.uid) return true;
    return false;
  };

  // Firestore collections state
  const [listings, setListings] = useState<Listing[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [requests, setRequests] = useState<CustomRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<MaterialInventoryItem[]>([]);
  const [classStudents, setClassStudents] = useState<ClassStudent[]>(loadInitialClassStudents);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(true);
  const [firebaseConnectionError, setFirebaseConnectionError] = useState<string | null>(null);

  // Model Publishing Access: Whitelisted admins, teachers, and enrolled class students
  const canPublishModel = Boolean(
    currentUser && (
      isAdminWhitelisted ||
      userProfile?.role === 'teacher' ||
      userProfile?.role === 'admin' ||
      classStudents.some(
        (s) => s.email?.toLowerCase() === currentUser.email?.toLowerCase() && s.canPublish !== false
      )
    )
  );

  const clearAuthError = () => setAuthError(null);

  // 1. Auth State Listener
  useEffect(() => {
    if (!isFirebaseConfigured) {
      setIsAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthLoading(true);

      if (user) {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          const isWhitelisted = isWhitelistedAdminEmail(user.email);

          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            if (isWhitelisted && data.role !== 'admin') {
              data.role = 'admin';
            }
            setUserProfile(data);
          } else {
            // New user signed in (e.g. via Google), initialize profile
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'Maker',
              role: isWhitelisted ? 'admin' : 'student',
              gradeClass: isWhitelisted ? 'Robotics Lab Instructor / Admin' : 'Robotics Lab Student',
              createdAt: serverTimestamp(),
            };
            await setDoc(userDocRef, newProfile);
            setUserProfile(newProfile);
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

    // Fetch / Listen to Listings
    const listingsQuery = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
    const unsubListings = onSnapshot(
      listingsQuery,
      (snapshot) => {
        const items: Listing[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as Listing);
        });
        setListings(items);
        setIsLoadingData(false);
      },
      (error) => {
        console.error('Firestore Listings snapshot error:', error);
        setFirebaseConnectionError(error.message);
        setIsLoadingData(false);
      }
    );

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

    // Fetch / Listen to Class Students (Publishing Whitelist)
    const unsubClassStudents = onSnapshot(
      collection(db, 'class_students'),
      (snapshot) => {
        const students: ClassStudent[] = [];
        snapshot.forEach((docSnap) => {
          students.push({ id: docSnap.id, ...docSnap.data() } as ClassStudent);
        });
        setClassStudents(students);
        try {
          localStorage.setItem('lab_class_students', JSON.stringify(students));
        } catch {}
      },
      (err) => {
        console.warn('Class students collection query notice:', err);
      }
    );

    // Fetch / Listen to Admin Whitelist
    const unsubAdminWhitelist = onSnapshot(
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
    );

    return () => {
      unsubListings();
      unsubCategories();
      unsubInventory();
      unsubClassStudents();
      unsubAdminWhitelist();
    };
  }, []);

  // 3. User-Specific / Role-Specific Listeners (Requests and Orders)
  useEffect(() => {
    if (!currentUser) {
      setRequests([]);
      setOrders([]);
      return;
    }

    const isTeacher = userProfile?.role === 'teacher' || userProfile?.role === 'admin';

    // Requests query - avoid composite index requirement by filtering only and sorting client-side
    const reqQuery = isTeacher
      ? collection(db, 'requests')
      : query(collection(db, 'requests'), where('requesterId', '==', currentUser.uid));

    const unsubRequests = onSnapshot(
      reqQuery,
      (snapshot) => {
        const reqs: CustomRequest[] = [];
        snapshot.forEach((docSnap) => {
          reqs.push({ id: docSnap.id, ...docSnap.data() } as CustomRequest);
        });
        // Safe client-side sort by createdAt descending
        reqs.sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
        setRequests(reqs);
      },
      (err) => {
        console.error('Requests subscription error:', err);
      }
    );

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
      unsubOrders();
    };
  }, [currentUser, userProfile?.role]);

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
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (res.user) {
        await updateProfile(res.user, { displayName: name });
        const userDocRef = doc(db, 'users', res.user.uid);
        const profile: UserProfile = {
          uid: res.user.uid,
          email: res.user.email,
          displayName: name,
          role: 'student', // Strict enforcement: default to student
          gradeClass: 'Robotics Lab Student',
          createdAt: serverTimestamp(),
        };
        await setDoc(userDocRef, profile);
        setUserProfile(profile);
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
    if (userProfile?.role !== 'teacher' && userProfile?.role !== 'admin') {
      delete sanitized.role;
    }
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
    
    // Status defaults to pendingApproval for students, published for teachers
    const isTeacher = userProfile?.role === 'teacher' || userProfile?.role === 'admin';
    const statusToSet: ListingStatus = isTeacher ? 'published' : 'pendingApproval';

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
    if (!currentUser) throw new Error('Authentication required.');
    const docRef = doc(db, 'listings', listingId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  };

  const deleteListing = async (listingId: string) => {
    if (!currentUser) throw new Error('Authentication required.');
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
    const timestampStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newRequest: any = {
      ...requestData,
      ticketNumber,
      requesterId: currentUser.uid,
      requesterDisplayName: userProfile?.displayName || currentUser.displayName || 'Requester',
      status: 'submitted' as RequestStatus,
      statusLog: [
        {
          status: 'submitted' as RequestStatus,
          timestamp: timestampStr,
          note: 'Request received in lab queue. Awaiting safety & CAD review.',
        },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'requests'), newRequest);
    return docRef.id;
  };

  const updateRequestStatus = async (
    requestId: string,
    status: RequestStatus,
    note?: string
  ) => {
    if (!currentUser) throw new Error('Authentication required.');
    const docRef = doc(db, 'requests', requestId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Request not found.');

    const currentData = snap.data() as CustomRequest;
    const timestampStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newLog = [
      ...(currentData.statusLog || []),
      {
        status,
        timestamp: timestampStr,
        note: note || `Status updated to ${status}`,
      },
    ];

    await updateDoc(docRef, {
      status,
      statusLog: newLog,
      updatedAt: serverTimestamp(),
    });
  };

  const assignMakerToRequest = async (
    requestId: string,
    makerId: string,
    makerName: string
  ) => {
    if (!currentUser) throw new Error('Authentication required.');
    const docRef = doc(db, 'requests', requestId);
    await updateDoc(docRef, {
      assignedMakerId: makerId,
      assignedMakerName: makerName,
      status: 'underReview',
      updatedAt: serverTimestamp(),
    });
  };

  // Firestore Write Operations (Orders)
  const createOrder = async (
    orderData: Omit<Order, 'id' | 'createdAt' | 'status'>
  ): Promise<string> => {
    if (!currentUser) throw new Error('Authentication required to place an order.');

    const timestampStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newOrder: any = {
      ...orderData,
      buyerId: currentUser.uid,
      buyerDisplayName: userProfile?.displayName || currentUser.displayName || 'Buyer',
      status: 'requested' as OrderStatus,
      statusLog: [
        {
          status: 'requested' as OrderStatus,
          timestamp: timestampStr,
          note: 'Print order placed from marketplace. Queued for lab fabrication.',
        },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const docRef = await addDoc(collection(db, 'orders'), newOrder);
    return docRef.id;
  };

  const updateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    note?: string
  ) => {
    if (!currentUser) throw new Error('Authentication required.');
    const docRef = doc(db, 'orders', orderId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Order not found.');

    const currentData = snap.data() as Order;

    // Security Check: Only whitelisted admins, print handlers, or the assigned seller/maker can update status
    if (!canModifyPrintStatus(currentData.sellerId)) {
      throw new Error('Authorization required: Only designated print handlers or the assigned student maker can toggle print status.');
    }

    const timestampStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const newLog = [
      ...(currentData.statusLog || []),
      {
        status,
        timestamp: timestampStr,
        note: note || `Order status updated to ${status}`,
      },
    ];

    await updateDoc(docRef, {
      status,
      statusLog: newLog,
      updatedAt: serverTimestamp(),
    });
  };

  const confirmCashDeposit = async (orderId: string, amount: number) => {
    if (!currentUser) throw new Error('Authentication required.');
    if (userProfile?.role !== 'teacher' && userProfile?.role !== 'admin' && !isAdminWhitelisted) {
      throw new Error('Only a teacher or administrator can confirm a cash deposit.');
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Deposit amount must be greater than zero.');
    }

    const docRef = doc(db, 'orders', orderId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) throw new Error('Order not found.');

    const currentData = snap.data() as Order;
    const timestampStr = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    const receiptId = `CASH-${Date.now().toString().slice(-8)}`;
    const newLog = [
      ...(currentData.statusLog || []),
      {
        status: currentData.status,
        timestamp: timestampStr,
        note: `Cash deposit of $${amount.toFixed(2)} confirmed by teacher (${receiptId}).`,
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
    if (!currentUser) throw new Error('Teacher authentication required.');
    await addDoc(collection(db, 'categories'), {
      name,
      description: description || '',
      createdAt: serverTimestamp(),
    });
  };

  const deleteCategory = async (categoryId: string) => {
    if (!currentUser || (userProfile?.role !== 'teacher' && userProfile?.role !== 'admin')) {
      throw new Error('Administrator authentication required.');
    }
    await deleteDoc(doc(db, 'categories', categoryId));
  };

  const updateInventoryItem = async (id: string, spools: number) => {
    if (!currentUser) throw new Error('Teacher authentication required.');
    const docRef = doc(db, 'inventory', id);
    const status = spools > 2 ? 'In Stock' : spools > 0 ? 'Low' : 'Out of Stock';
    await updateDoc(docRef, {
      spoolsAvailable: spools,
      status,
      updatedAt: serverTimestamp(),
    });
  };

  // Class Students (Publishing Whitelist) Management
  const addClassStudent = async (email: string, name?: string, period?: string, notes?: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) throw new Error('Student email is required.');
    
    // Check if student is already in list
    if (classStudents.some((s) => s.email?.toLowerCase() === cleanEmail)) {
      throw new Error(`Student with email "${cleanEmail}" is already enrolled in the class roster.`);
    }

    const newStudentData: Omit<ClassStudent, 'id'> = {
      email: cleanEmail,
      name: name?.trim() || cleanEmail.split('@')[0],
      period: period?.trim() || 'Period 3 Robotics',
      canPublish: true,
      notes: notes?.trim() || '',
      addedAt: new Date().toISOString(),
      addedBy: currentUser?.email || 'Teacher/Admin',
    };

    try {
      const docRef = await addDoc(collection(db, 'class_students'), {
        ...newStudentData,
        createdAt: serverTimestamp(),
      });
      const created: ClassStudent = { id: docRef.id, ...newStudentData };
      setClassStudents((prev) => {
        const updated = [created, ...prev.filter((s) => s.id !== docRef.id)];
        try {
          localStorage.setItem('lab_class_students', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    } catch (err) {
      console.warn('Firestore addDoc for class_students failed, falling back to local state:', err);
      const fallbackId = 'student-' + Date.now();
      const created: ClassStudent = { id: fallbackId, ...newStudentData };
      setClassStudents((prev) => {
        const updated = [created, ...prev];
        try {
          localStorage.setItem('lab_class_students', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  };

  const removeClassStudent = async (studentId: string) => {
    try {
      await deleteDoc(doc(db, 'class_students', studentId));
    } catch (err) {
      console.warn('Firestore deleteDoc for class_students notice:', err);
    }
    setClassStudents((prev) => {
      const updated = prev.filter((s) => s.id !== studentId);
      try {
        localStorage.setItem('lab_class_students', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const updateClassStudent = async (studentId: string, updates: Partial<ClassStudent>) => {
    try {
      await updateDoc(doc(db, 'class_students', studentId), {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore updateDoc for class_students notice:', err);
    }
    setClassStudents((prev) => {
      const updated = prev.map((s) => (s.id === studentId ? { ...s, ...updates } : s));
      try {
        localStorage.setItem('lab_class_students', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const addAdminEmail = async (email: string) => {
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
        assignMakerToRequest,
        createOrder,
        updateOrderStatus,
        confirmCashDeposit,
        addCategory,
        deleteCategory,
        updateInventoryItem,
        classStudents,
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
