import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import type {
  AuditLog,
  ContactEnquiry,
  CustomerRecord,
  MenuCategory,
  MenuItem,
  NewsletterSubscriber,
  NotificationRecord,
  Offer,
  OrderRecord,
  Reservation,
  ReservationStatusView,
  RestaurantSettings,
  RestaurantTable,
} from '../types/restaurant';

function normalizeTimestampFields<T extends object>(raw: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...raw };
  for (const key of ['createdAt', 'updatedAt', 'timestamp', 'startAt', 'expiresAt']) {
    const val = out[key] as { toDate?: () => Date } | string | undefined;
    if (val && typeof val === 'object' && typeof val.toDate === 'function') {
      out[key] = val.toDate().toISOString();
    }
  }
  return out as unknown as T;
}

export async function getReservationStatusByRef(refCode: string): Promise<ReservationStatusView | null> {
  const clean = refCode.trim().toUpperCase();
  const path = `reservationStatuses/${clean}`;
  try {
    const snap = await getDoc(doc(db, 'reservationStatuses', clean));
    if (!snap.exists()) return null;
    return normalizeTimestampFields<ReservationStatusView>(snap.data());
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function adminSeedDemoCatalog(): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Authentication required.');
  const token = await user.getIdToken();
  const resp = await fetch('/api/admin/seed-demo', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const data = (await resp.json()) as { error?: string };
  if (!resp.ok) {
    throw new Error(data.error || 'Failed to seed database');
  }
}

export async function adminUpsertMenuCategory(category: MenuCategory): Promise<void> {
  const path = `menuCategories/${category.categoryId}`;
  try {
    await setDoc(doc(db, 'menuCategories', category.categoryId), category);
    await writeAuditLog('UPSERT_MENU_CATEGORY', 'menuCategory', category.categoryId, category.name);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminUpsertMenuItem(
  item: Omit<MenuItem, 'createdAt' | 'updatedAt'> & { isNew?: boolean }
): Promise<void> {
  const path = `menuItems/${item.itemId}`;
  try {
    const ref = doc(db, 'menuItems', item.itemId);
    const existing = await getDoc(ref);
    const payload: Record<string, unknown> = {
      itemId: item.itemId,
      name: item.name,
      description: item.description,
      categoryId: item.categoryId,
      imageUrl: item.imageUrl,
      originalPrice: Number(item.originalPrice),
      discountedPrice:
        item.discountedPrice === null || item.discountedPrice === undefined || item.discountedPrice === 0
          ? null
          : Number(item.discountedPrice),
      vegetarian: Boolean(item.vegetarian),
      allergens: item.allergens || [],
      available: Boolean(item.available),
      featured: Boolean(item.featured),
      isDemo: Boolean(item.isDemo),
      createdAt: existing.exists() ? existing.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, payload);
    await writeAuditLog(existing.exists() ? 'UPDATE_MENU_ITEM' : 'CREATE_MENU_ITEM', 'menuItem', item.itemId, item.name);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminDeleteMenuItem(itemId: string): Promise<void> {
  const path = `menuItems/${itemId}`;
  try {
    await deleteDoc(doc(db, 'menuItems', itemId));
    await writeAuditLog('DELETE_MENU_ITEM', 'menuItem', itemId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminClearDemoMenuItems(): Promise<number> {
  const path = 'menuItems';
  try {
    const q = query(collection(db, 'menuItems'), where('isDemo', '==', true));
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    await writeAuditLog('CLEAR_DEMO_MENU_ITEMS', 'menuItem', 'batch', `Removed ${snap.size} demo dishes`);
    return snap.size;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminUpsertOffer(offer: Offer): Promise<void> {
  const path = `offers/${offer.offerId}`;
  try {
    await setDoc(doc(db, 'offers', offer.offerId), {
      ...offer,
      startAt: new Date(offer.startAt),
      expiresAt: new Date(offer.expiresAt),
    });
    await writeAuditLog('UPSERT_OFFER', 'offer', offer.offerId, offer.title);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminDeleteOffer(offerId: string): Promise<void> {
  const path = `offers/${offerId}`;
  try {
    await deleteDoc(doc(db, 'offers', offerId));
    await writeAuditLog('DELETE_OFFER', 'offer', offerId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminUpdateSettings(settings: RestaurantSettings): Promise<void> {
  const path = 'restaurantSettings/public';
  try {
    await setDoc(doc(db, 'restaurantSettings', 'public'), {
      ...settings,
      updatedAt: serverTimestamp(),
    });
    await writeAuditLog('UPDATE_RESTAURANT_SETTINGS', 'restaurantSettings', 'public', settings.restaurantName);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adminUpdateEnquiryStatus(
  enquiryId: string,
  status: ContactEnquiry['status']
): Promise<void> {
  const path = `contactEnquiries/${enquiryId}`;
  try {
    const ref = doc(db, 'contactEnquiries', enquiryId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    await setDoc(ref, { ...snap.data(), status });
    await writeAuditLog('UPDATE_ENQUIRY_STATUS', 'contactEnquiry', enquiryId, status);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function adminUpsertTable(table: RestaurantTable): Promise<void> {
  const path = `restaurantTables/${table.tableId}`;
  try {
    await setDoc(doc(db, 'restaurantTables', table.tableId), table);
    await writeAuditLog('UPSERT_TABLE', 'restaurantTable', table.tableId, table.tableNumber);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

async function writeAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  details?: string
): Promise<void> {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  const logId = `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const path = `auditLogs/${logId}`;
  try {
    await setDoc(doc(db, 'auditLogs', logId), {
      logId,
      adminUid: uid,
      action,
      entityType,
      entityId,
      details: details || '',
      timestamp: serverTimestamp(),
    });
  } catch {
    // Do not block primary admin mutation if log fails silently, but record diagnostic
    console.warn(`Audit log skipped for ${path}`);
  }
}

export interface AdminRealtimeCollections {
  reservations: Reservation[];
  customers: CustomerRecord[];
  enquiries: ContactEnquiry[];
  orders: OrderRecord[];
  offers: Offer[];
  tables: RestaurantTable[];
  auditLogs: AuditLog[];
  notifications: NotificationRecord[];
  subscribers: NewsletterSubscriber[];
}

export function subscribeAdminCollections(
  onUpdate: (partial: Partial<AdminRealtimeCollections>) => void
): () => void {
  const unsubs: Unsubscribe[] = [];

  unsubs.push(
    onSnapshot(
      query(collection(db, 'reservations'), orderBy('createdAt', 'desc')),
      (snap) => {
        onUpdate({
          reservations: snap.docs.map((d) => normalizeTimestampFields<Reservation>(d.data())),
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'reservations')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'customers'),
      (snap) => {
        onUpdate({
          customers: snap.docs.map((d) => normalizeTimestampFields<CustomerRecord>(d.data())),
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'customers')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'contactEnquiries'), orderBy('createdAt', 'desc')),
      (snap) => {
        onUpdate({
          enquiries: snap.docs.map((d) => normalizeTimestampFields<ContactEnquiry>(d.data())),
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'contactEnquiries')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => {
        onUpdate({
          orders: snap.docs.map((d) => normalizeTimestampFields<OrderRecord>(d.data())),
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'offers'),
      (snap) => {
        onUpdate({
          offers: snap.docs.map((d) => normalizeTimestampFields<Offer>(d.data())),
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'offers')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'restaurantTables'),
      (snap) => {
        onUpdate({
          tables: snap.docs.map((d) => d.data() as RestaurantTable),
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'restaurantTables')
    )
  );

  unsubs.push(
    onSnapshot(
      query(collection(db, 'auditLogs'), orderBy('timestamp', 'desc')),
      (snap) => {
        onUpdate({
          auditLogs: snap.docs.map((d) => normalizeTimestampFields<AuditLog>(d.data())),
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'auditLogs')
    )
  );

  unsubs.push(
    onSnapshot(
      collection(db, 'newsletterSubscribers'),
      (snap) => {
        onUpdate({
          subscribers: snap.docs.map((d) => normalizeTimestampFields<NewsletterSubscriber>(d.data())),
        });
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'newsletterSubscribers')
    )
  );

  return () => {
    unsubs.forEach((u) => u());
  };
}
