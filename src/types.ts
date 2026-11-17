export type Category = 
  | 'Desk Accessories'
  | 'Robotics'
  | 'Decorations'
  | 'Games'
  | 'Toys'
  | 'Woodwork'
  | 'T-Shirts'
  | 'Hats'
  | 'Hoodies'
  | 'Other Merch'
  | 'Other';

export type MaterialType = 'PLA' | 'PLA+' | 'PETG' | 'TPU' | 'ABS' | 'Resin';

export type RequestStatus = 
  | 'submitted'
  | 'received'
  | 'slicing'
  | 'printing'
  | 'underReview'
  | 'accepted'
  | 'inProduction'
  | 'ready'
  | 'completed'
  | 'declined';

export type ListingStatus = 
  | 'draft'
  | 'pendingApproval'
  | 'published'
  | 'rejected';

export type OrderStatus = 
  | 'received'
  | 'slicing'
  | 'printing'
  | 'requested'
  | 'underReview'
  | 'accepted'
  | 'inProduction'
  | 'ready'
  | 'completed'
  | 'declined';

export type PriceType = 'fixed' | 'quote';

export type UserRole = 'student' | 'teacher' | 'teacher_admin' | 'admin';

export type PreferredUpdateMethod = 'email' | 'phone';

export const BASELINE_ADMIN_WHITELIST: string[] = [
  'jonathan.soto@oxnardunion.org',
  'thundervikes10166@gmail.com',
];

export interface ClassStudent {
  id: string;
  email: string;
  name?: string;
  studentId?: string;
  period?: string;
  canPublish: boolean;
  approved?: boolean;
  uid?: string;
  approvedAt?: string;
  approvedBy?: string;
  notes?: string;
  addedAt: any;
  addedBy?: string;
}

export interface ClassStudentApplication {
  id: string;
  uid: string;
  email: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: any;
  reviewedAt?: any;
  reviewedBy?: string;
}

export interface DetailEditEvent {
  timestamp: string;
  changedByUid: string;
  changedByName: string;
  fields: string[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  isWhitelistedAdmin?: boolean;
  isPrintHandler?: boolean;
  gradeClass?: string;
  bio?: string;
  specialty?: string;
  printerHardware?: string[];
  createdAt?: any;
}

export interface ListingSizeOption {
  label: string; // Visible choice, e.g. "Small" or "6 inch"
  dimensions: string; // Physical size, e.g. "6 x 6 x 3 in"
  price?: number; // Optional material fee for this specific size
}

export interface ListingSpecs {
  dimensions: string; // e.g. "85 x 45 x 20 mm"
  layerHeight: string; // e.g. "0.20 mm standard"
  infill: string; // e.g. "15% Gyroid"
  printTimeHours: number; // e.g. 2.5
  filamentGrams: number; // e.g. 45
  supportedMaterials: MaterialType[];
  availableColors: string[];
}

export interface Listing {
  id: string;
  title: string;
  name?: string; // fallback alias for UI compatibility
  description: string;
  creatorId: string;
  creatorDisplayName: string;
  makerId?: string;
  makerName?: string;
  category: string;
  price: number;
  priceAmount?: number;
  priceType?: PriceType;
  material: string;
  availableOptions?: string[];
  merchSizes?: string[]; // Apparel sizes available in the Merch tab
  sizeOptions?: ListingSizeOption[]; // Optional print/woodwork sizes, dimensions and price variants
  stockQuantity?: number | null; // null/absent = made to order; 0 = out of stock
  orderInstructions?: string; // Optional information shown to customer before inquiry
  estimatedProductionTime: string; // e.g. "2-3 days"
  imageUrl: string;
  secondaryImageUrl?: string;
  specs?: ListingSpecs;
  usageNotes?: string;
  status: ListingStatus;
  /** Position chosen by staff in Manage > Shop Catalog (lower shows first). */
  sortOrder?: number;
  createdAt: any;
  updatedAt?: any;
}

export interface CustomRequest {
  id: string;
  ticketNumber: string;
  requesterId: string;
  requesterDisplayName: string;
  requesterRole?: string;
  customerFirstName?: string;
  customerLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  preferredUpdateMethod?: PreferredUpdateMethod;
  updatesActivated?: boolean;
  description: string;
  itemTitle: string;
  category?: string; // Historical requests may have a category; new requests do not.
  referenceImageUrl?: string; // Legacy URL or uploaded Firebase Storage photo URL
  referenceImageStoragePath?: string; // Firebase Storage path or netlify-blobs:<private-key>
  referenceImageContentType?: string; // MIME type for secured Netlify-hosted photo
  referenceFileUrl?: string; // Link to STL file or reference photo
  desiredSize?: string;
  desiredDimensions?: string;
  material: MaterialType | string;
  preferredMaterial?: MaterialType | string;
  color: string;
  colorMode?: 'solid' | 'multicolor';
  preferredColor?: string;
  quantity: number;
  neededByDate: string;
  additionalNotes?: string;
  pickupLocation?: string;
  status: RequestStatus;
  assignedMakerId?: string;
  assignedMakerName?: string;
  estimatedCost?: string;
  isQuoteRequest?: boolean;
  guestCheckout?: boolean;
  depositPaid?: boolean;
  depositAmount?: number;
  depositTransactionId?: string;
  // Append-only-by-UI stage events; old records may lack author metadata.
  editLog?: DetailEditEvent[];
  statusLog?: {
    status: RequestStatus;
    timestamp: string; // ISO 8601 for new events; old records may use display strings
    note: string;
    changedByUid?: string;
    changedByName?: string;
    changedByEmail?: string;
  }[];
  createdAt: any;
  updatedAt?: any;
}

export interface RequestStaffNote {
  id: string;
  text: string;
  timestamp: string;
  createdAt?: any;
  authorUid: string;
  authorName: string;
  authorEmail?: string;
}

export interface Order {
  id: string;
  buyerId: string;
  buyerDisplayName: string;
  customerFirstName?: string;
  customerLastName?: string;
  contactEmail?: string;
  contactPhone?: string;
  preferredUpdateMethod?: PreferredUpdateMethod;
  updatesActivated?: boolean;
  sellerId: string;
  sellerDisplayName: string;
  listingId: string;
  listingTitle: string;
  listingImageUrl?: string;
  quantity: number;
  priceAtTimeOfOrder: number;
  selectedColor?: string;
  selectedSize?: string;
  selectedOption?: string;
  selectedMaterial?: string;
  notes?: string;
  pickupLocation?: string;
  isQuoteRequest?: boolean;
  guestCheckout?: boolean;
  depositPaid?: boolean;
  depositAmount?: number;
  depositTransactionId?: string;
  depositPaidAt?: any;
  status: OrderStatus;
  editLog?: DetailEditEvent[];
  statusLog?: {
    status: OrderStatus;
    timestamp: string;
    note: string;
    changedByUid?: string;
    changedByName?: string;
    changedByEmail?: string;
  }[];
  createdAt: any;
  updatedAt?: any;
}

export interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  slug?: string;
}

export interface MaterialInventoryItem {
  id: string;
  materialType: MaterialType;
  colorName: string;
  hexCode: string;
  spoolsAvailable: number;
  status: 'In Stock' | 'Low' | 'Out of Stock';
}

export type ActiveView = 
  | 'marketplace'
  | 'merch'
  | 'product_detail'
  | 'custom_request'
  | 'maker_profile'
  | 'student_dashboard'
  | 'teacher_dashboard'
  | 'my_requests'
  | 'create_listing'
  | 'edit_listing';
