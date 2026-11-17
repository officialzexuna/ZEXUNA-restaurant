export type AdminRole = 'OWNER' | 'MANAGER' | 'STAFF';

export type ReservationStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW';

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type OrderType = 'DELIVERY' | 'PICKUP';
export type OrderStatus = 'WHATSAPP_INITIATED' | 'CONFIRMED' | 'PREPARING' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'UNPAID' | 'PAID_AT_COUNTER' | 'PAID';

export interface AdminRecord {
  uid: string;
  email: string;
  displayName: string;
  role: AdminRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRecord {
  customerId: string;
  name: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface MenuCategory {
  categoryId: string;
  name: string;
  description: string;
  imageUrl: string;
  displayOrder: number;
  active: boolean;
}

export interface MenuItem {
  itemId: string;
  name: string;
  description: string;
  categoryId: string;
  imageUrl: string;
  originalPrice: number;
  discountedPrice: number | null;
  vegetarian: boolean;
  allergens: string[];
  available: boolean;
  featured: boolean;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Offer {
  offerId: string;
  title: string;
  description: string;
  applicableItems: string[];
  originalPrice: number;
  discountedPrice: number;
  discountType: DiscountType;
  discountValue: number;
  imageUrl?: string;
  startAt: string;
  expiresAt: string;
  active: boolean;
  terms: string;
}

export interface Reservation {
  reservationId: string;
  referenceCode: string;
  customerId: string;
  customerName: string;
  phone: string;
  email: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  tableId: string;
  specialRequests?: string;
  status: ReservationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationStatusView {
  referenceCode: string;
  reservationId: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  tableNumber?: string;
  status: ReservationStatus;
  cancellationRequested?: boolean;
  updatedAt: string;
}

export interface RestaurantTable {
  tableId: string;
  tableNumber: string;
  capacity: number;
  location: string;
  active: boolean;
}

export interface TimeSlot {
  slotId: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: number;
  reservedCount: number;
  active: boolean;
}

export interface SlotLock {
  lockId: string;
  tableId: string;
  date: string;
  startTime: string;
  reservationId: string;
  active: boolean;
  createdAt: string;
}

export interface OrderLineSummary {
  itemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discountApplied: number;
  lineTotal: number;
}

export interface OrderRecord {
  orderId: string;
  customerId: string;
  customerName: string;
  phone: string;
  items: OrderLineSummary[];
  subtotal: number;
  discount: number;
  total: number;
  orderType: OrderType;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  specialInstructions?: string;
  createdAt: string;
}

export interface ChatbotConversation {
  conversationId: string;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatbotMessage {
  messageId: string;
  conversationId: string;
  sender: 'USER' | 'ASSISTANT';
  content: string;
  timestamp: string;
}

export interface DayOpeningHours {
  open: string;
  close: string;
  closed: boolean;
}

export interface RestaurantSettings {
  restaurantName: string;
  tagline: string;
  description: string;
  address: string;
  phone: string;
  whatsappNumber: string;
  email: string;
  openingHours: Record<string, DayOpeningHours>;
  reservationSettings: {
    slotDurationMinutes: number;
    maxPartySize: number;
    advanceDays: number;
    timeSlots: string[];
  };
  socialLinks: {
    instagram?: string;
    facebook?: string;
    x?: string;
  };
  currency: string;
  heroVideoUrl?: string;
  updatedAt?: string;
}

export interface NotificationRecord {
  notificationId: string;
  customerId?: string;
  type: string;
  channel?: 'EMAIL' | 'WHATSAPP';
  recipient?: string;
  message: string;
  status: 'SENT' | 'FAILED' | 'NOT_CONFIGURED';
  createdAt: string;
}

export interface ContactEnquiry {
  enquiryId: string;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  status: 'NEW' | 'IN_REVIEW' | 'RESOLVED';
  createdAt: string;
}

export interface NewsletterSubscriber {
  subscriberId: string;
  email: string;
  consent: boolean;
  createdAt: string;
}

export interface AuditLog {
  logId: string;
  adminUid: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: string;
  timestamp: string;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}
