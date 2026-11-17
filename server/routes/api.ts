import { Router } from 'express';
import crypto from 'node:crypto';
import { GoogleGenAI, Type, type FunctionDeclaration } from '@google/genai';
import {
  ADMIN_BOOTSTRAP_EMAIL,
  checkIsAdminUser,
  firebaseConfig,
  firestoreRestAtomicCommit,
  firestoreRestGetDoc,
  firestoreRestListCollection,
  getAdminFirestore,
  verifyFirebaseIdToken,
  type VerifiedIdToken,
} from '../firebaseServer';
import { createRateLimitMiddleware } from '../middleware/rateLimit';
import {
  isSmtpConfigured,
  isWhatsAppCloudConfigured,
  sendEmailNotification,
  sendWhatsAppCloudNotification,
} from '../services/notifications';
import {
  DEFAULT_SETTINGS,
  DEMO_CATEGORIES,
  DEMO_MENU_ITEMS,
  DEMO_OFFERS,
  DEMO_TABLES,
} from '../../src/data/demoSeed';
import type {
  MenuCategory,
  MenuItem,
  Offer,
  OrderType,
  Reservation,
  ReservationStatus,
  ReservationStatusView,
  RestaurantSettings,
  RestaurantTable,
  SlotLock,
} from '../../src/types/restaurant';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  calculateOrderTotals,
  getActiveOffers,
} from '../../src/utils/pricing';
import {
  canTransitionReservationStatus,
  computeEndTime,
  formatSlotLockId,
  generateReferenceCode,
  isWithinOpeningHours,
  selectAvailableTable,
} from '../../src/utils/reservations';
import {
  clampString,
  isValidEmail,
  isValidId,
  validateContactEnquiryInput,
  validateReservationInput,
} from '../../src/utils/validation';

const apiRouter = Router();

const publicWriteLimiter = createRateLimitMiddleware(20, 60_000);
const chatLimiter = createRateLimitMiddleware(15, 60_000);

// In-memory idempotency cache to protect against rapid duplicate form submissions
const recentIdempotency = new Map<string, { createdAt: number; payload: unknown }>();

function getBearerToken(req: { headers: { authorization?: string } }): string | null {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

async function authenticateAdmin(
  req: { headers: { authorization?: string } }
): Promise<{ token: string; user: VerifiedIdToken } | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  try {
    const user = await verifyFirebaseIdToken(token);
    if (!user.emailVerified) return null;
    const isAdmin = await checkIsAdminUser(user.uid, token);
    if (!isAdmin) return null;
    return { token, user };
  } catch {
    return null;
  }
}

async function loadCatalogFromFirestore() {
  const adminDb = getAdminFirestore();
  let categories: MenuCategory[] = [];
  let items: MenuItem[] = [];
  let offers: Offer[] = [];
  let settings: RestaurantSettings | null = null;
  let tables: RestaurantTable[] = [];

  if (adminDb) {
    const [catSnap, itemSnap, offerSnap, settingsSnap, tableSnap] = await Promise.all([
      adminDb.collection('menuCategories').get(),
      adminDb.collection('menuItems').get(),
      adminDb.collection('offers').get(),
      adminDb.collection('restaurantSettings').doc('public').get(),
      adminDb.collection('restaurantTables').get(),
    ]);
    categories = catSnap.docs.map((d) => d.data() as MenuCategory);
    items = itemSnap.docs.map((d) => d.data() as MenuItem);
    offers = offerSnap.docs.map((d) => d.data() as Offer);
    settings = settingsSnap.exists ? (settingsSnap.data() as RestaurantSettings) : null;
    tables = tableSnap.docs.map((d) => d.data() as RestaurantTable);
  } else {
    const [catRes, itemRes, offerRes, settingsRes, tableRes] = await Promise.allSettled([
      firestoreRestListCollection<MenuCategory>('menuCategories'),
      firestoreRestListCollection<MenuItem>('menuItems'),
      firestoreRestListCollection<Offer>('offers'),
      firestoreRestGetDoc<RestaurantSettings>('restaurantSettings', 'public'),
      firestoreRestListCollection<RestaurantTable>('restaurantTables'),
    ]);

    if (catRes.status === 'fulfilled') categories = catRes.value;
    if (itemRes.status === 'fulfilled') items = itemRes.value;
    if (offerRes.status === 'fulfilled') offers = offerRes.value;
    if (settingsRes.status === 'fulfilled') settings = settingsRes.value;
    if (tableRes.status === 'fulfilled') tables = tableRes.value;
  }

  const seeded = categories.length > 0 && items.length > 0;
  const tablesSeeded = tables.length > 0;

  return {
    seeded,
    tablesSeeded,
    categories: (seeded ? categories : DEMO_CATEGORIES)
      .filter((c) => c.active)
      .sort((a, b) => a.displayOrder - b.displayOrder),
    items: seeded ? items : DEMO_MENU_ITEMS,
    offers: getActiveOffers(seeded ? offers : DEMO_OFFERS),
    settings: settings || DEFAULT_SETTINGS,
    tables: tablesSeeded ? tables : DEMO_TABLES,
  };
}

async function loadActiveSlotLocks(date: string): Promise<SlotLock[]> {
  const adminDb = getAdminFirestore();
  if (adminDb) {
    const snap = await adminDb
      .collection('slotLocks')
      .where('date', '==', date)
      .where('active', '==', true)
      .get();
    return snap.docs.map((d) => d.data() as SlotLock);
  }
  try {
    const all = await firestoreRestListCollection<SlotLock>('slotLocks', undefined, 200);
    return all.filter((l) => l.date === date && l.active);
  } catch {
    return [];
  }
}

async function computeDateAvailability(date: string, guestCount: number) {
  const catalog = await loadCatalogFromFirestore();
  const locks = await loadActiveSlotLocks(date);
  const slots = catalog.settings.reservationSettings.timeSlots || DEFAULT_SETTINGS.reservationSettings.timeSlots;

  const slotResults = slots.map((startTime) => {
    const hoursCheck = isWithinOpeningHours(date, startTime, catalog.settings.openingHours);
    if (!hoursCheck.valid) {
      return {
        startTime,
        endTime: computeEndTime(startTime, catalog.settings.reservationSettings.slotDurationMinutes),
        available: false,
        availableTables: 0,
        reason: hoursCheck.reason,
      };
    }

    const lockedForSlot = new Set(
      locks.filter((l) => l.startTime === startTime && l.active).map((l) => l.tableId)
    );
    const matchingTables = catalog.tables.filter(
      (t) => t.active && t.capacity >= guestCount && !lockedForSlot.has(t.tableId)
    );
    return {
      startTime,
      endTime: computeEndTime(startTime, catalog.settings.reservationSettings.slotDurationMinutes),
      available: matchingTables.length > 0,
      availableTables: matchingTables.length,
    };
  });

  return {
    date,
    guestCount,
    tablesSeeded: catalog.tablesSeeded,
    slots: slotResults,
  };
}

async function executeAtomicReservation(params: {
  customerName: string;
  phone: string;
  email: string;
  date: string;
  startTime: string;
  guestCount: number;
  specialRequests?: string;
  idempotencyKey?: string;
}) {
  if (params.idempotencyKey && recentIdempotency.has(params.idempotencyKey)) {
    const cached = recentIdempotency.get(params.idempotencyKey)!;
    if (Date.now() - cached.createdAt < 5 * 60_000) {
      return cached.payload as Record<string, unknown>;
    }
  }

  const validation = validateReservationInput(params);
  if (!validation.valid) {
    throw Object.assign(new Error(validation.errors.join(' ')), { statusCode: 400 });
  }

  const catalog = await loadCatalogFromFirestore();
  if (!catalog.tablesSeeded) {
    throw Object.assign(
      new Error(
        'Restaurant tables have not been initialized in Firestore yet. Please complete Admin initial setup or reserve directly via WhatsApp.'
      ),
      { statusCode: 503 }
    );
  }

  const hoursCheck = isWithinOpeningHours(params.date, params.startTime, catalog.settings.openingHours);
  if (!hoursCheck.valid) {
    throw Object.assign(new Error(hoursCheck.reason || 'Outside opening hours.'), { statusCode: 400 });
  }

  if (params.guestCount > catalog.settings.reservationSettings.maxPartySize) {
    throw Object.assign(
      new Error(
        `Maximum online party size is ${catalog.settings.reservationSettings.maxPartySize} guests. For larger groups, please contact us on WhatsApp.`
      ),
      { statusCode: 400 }
    );
  }

  const locks = await loadActiveSlotLocks(params.date);
  const lockedForSlot = new Set(
    locks.filter((l) => l.startTime === params.startTime && l.active).map((l) => l.tableId)
  );
  const chosenTable = selectAvailableTable(catalog.tables, lockedForSlot, params.guestCount);
  if (!chosenTable) {
    throw Object.assign(
      new Error('No tables with sufficient capacity remain available for the selected date and time.'),
      { statusCode: 409 }
    );
  }

  const reservationId = `res_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const customerId = `cust_${crypto.createHash('sha256').update(params.email.toLowerCase()).digest('hex').slice(0, 16)}`;
  const referenceCode = generateReferenceCode();
  const lockId = formatSlotLockId(params.date, params.startTime, chosenTable.tableId);
  const endTime = computeEndTime(
    params.startTime,
    catalog.settings.reservationSettings.slotDurationMinutes
  );
  const nowIso = new Date().toISOString();

  const reservationData: Reservation = {
    reservationId,
    referenceCode,
    customerId,
    customerName: clampString(params.customerName, 120),
    phone: clampString(params.phone, 30),
    email: clampString(params.email.toLowerCase(), 200),
    date: params.date,
    startTime: params.startTime,
    endTime,
    guestCount: Number(params.guestCount),
    tableId: chosenTable.tableId,
    specialRequests: clampString(params.specialRequests || '', 500),
    status: 'PENDING',
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const statusViewData: ReservationStatusView = {
    referenceCode,
    reservationId,
    date: params.date,
    startTime: params.startTime,
    endTime,
    guestCount: Number(params.guestCount),
    tableNumber: chosenTable.tableNumber,
    status: 'PENDING',
    cancellationRequested: false,
    updatedAt: nowIso,
  };

  const lockData: SlotLock = {
    lockId,
    tableId: chosenTable.tableId,
    date: params.date,
    startTime: params.startTime,
    reservationId,
    active: true,
    createdAt: nowIso,
  };

  const customerData = {
    customerId,
    name: reservationData.customerName,
    phone: reservationData.phone,
    email: reservationData.email,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const adminDb = getAdminFirestore();
  if (adminDb) {
    await adminDb.runTransaction(async (tx) => {
      const lockRef = adminDb.collection('slotLocks').doc(lockId);
      const lockSnap = await tx.get(lockRef);
      if (lockSnap.exists && lockSnap.data()?.active === true) {
        throw Object.assign(
          new Error('Selected table was just booked by another guest. Please choose another slot.'),
          { statusCode: 409 }
        );
      }
      const { FieldValue } = await import('firebase-admin/firestore');
      const ts = FieldValue.serverTimestamp();
      tx.set(adminDb.collection('customers').doc(customerId), { ...customerData, createdAt: ts, updatedAt: ts });
      tx.set(lockRef, { ...lockData, createdAt: ts });
      tx.set(adminDb.collection('reservations').doc(reservationId), {
        ...reservationData,
        createdAt: ts,
        updatedAt: ts,
      });
      tx.set(adminDb.collection('reservationStatuses').doc(referenceCode), {
        ...statusViewData,
        updatedAt: ts,
      });
    });
  } else {
    try {
      await firestoreRestAtomicCommit([
        {
          collection: 'customers',
          docId: customerId,
          data: customerData as unknown as Record<string, unknown>,
          serverTimestampFields: ['createdAt', 'updatedAt'],
        },
        {
          collection: 'slotLocks',
          docId: lockId,
          data: lockData as unknown as Record<string, unknown>,
          serverTimestampFields: ['createdAt'],
          mustNotExist: true,
        },
        {
          collection: 'reservations',
          docId: reservationId,
          data: reservationData as unknown as Record<string, unknown>,
          serverTimestampFields: ['createdAt', 'updatedAt'],
          mustNotExist: true,
        },
        {
          collection: 'reservationStatuses',
          docId: referenceCode,
          data: statusViewData as unknown as Record<string, unknown>,
          serverTimestampFields: ['updatedAt'],
          mustNotExist: true,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('ALREADY_EXISTS') || msg.includes('FAILED_PRECONDITION')) {
        throw Object.assign(
          new Error('That table slot was just reserved. Please select another time slot.'),
          { statusCode: 409 }
        );
      }
      throw err;
    }
  }

  // Real notifications (only report confirmed delivery if provider confirms)
  const emailResult = await sendEmailNotification({
    to: reservationData.email,
    subject: `ZEXUNA Restaurant — Reservation Request Received (${referenceCode})`,
    text: `Dear ${reservationData.customerName},\n\nWe have received your table reservation request (${referenceCode}) for ${reservationData.guestCount} guests on ${reservationData.date} at ${reservationData.startTime}.\nCurrent Status: PENDING confirmation.\n\nZEXUNA Restaurant`,
    html: `<p>Dear ${reservationData.customerName},</p><p>We have received your table reservation request (<strong>${referenceCode}</strong>) for <strong>${reservationData.guestCount} guests</strong> on <strong>${reservationData.date}</strong> at <strong>${reservationData.startTime}</strong>.</p><p>Current Status: <strong>PENDING</strong> confirmation.</p><p>ZEXUNA Restaurant — Technology Without Limits.</p>`,
  });

  const waResult = await sendWhatsAppCloudNotification({
    toPhone: reservationData.phone,
    message: `Hello ${reservationData.customerName}, your ZEXUNA Restaurant reservation request ${referenceCode} for ${reservationData.date} at ${reservationData.startTime} (${reservationData.guestCount} guests) is PENDING confirmation.`,
  });

  const payload = {
    referenceCode,
    reservationId,
    status: 'PENDING' as ReservationStatus,
    date: params.date,
    startTime: params.startTime,
    endTime,
    guestCount: params.guestCount,
    tableNumber: chosenTable.tableNumber,
    notifications: {
      email: emailResult,
      whatsapp: waResult,
    },
  };

  if (params.idempotencyKey) {
    recentIdempotency.set(params.idempotencyKey, { createdAt: Date.now(), payload });
  }

  return payload;
}

// -----------------------------------------------------------------------------
// Public API Routes
// -----------------------------------------------------------------------------
apiRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    projectId: firebaseConfig.projectId,
    databaseId: firebaseConfig.firestoreDatabaseId,
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    smtpConfigured: isSmtpConfigured(),
    whatsappCloudConfigured: isWhatsAppCloudConfigured(),
  });
});

apiRouter.get('/bootstrap-status', (_req, res) => {
  res.json({
    authorizedBootstrapEmail: ADMIN_BOOTSTRAP_EMAIL,
    adminSdkConfigured: Boolean(getAdminFirestore()),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    smtpConfigured: isSmtpConfigured(),
    whatsappCloudConfigured: isWhatsAppCloudConfigured(),
  });
});

apiRouter.get('/catalog', async (_req, res) => {
  try {
    const catalog = await loadCatalogFromFirestore();
    res.json(catalog);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to load restaurant catalog',
    });
  }
});

apiRouter.get('/reservations/availability', async (req, res) => {
  try {
    const date = String(req.query.date || '');
    const guests = Math.max(1, Number(req.query.guests || '2'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: 'Valid date (YYYY-MM-DD) is required.' });
      return;
    }
    const result = await computeDateAvailability(date, guests);
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to check table availability',
    });
  }
});

apiRouter.post('/reservations', publicWriteLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const result = await executeAtomicReservation({
      customerName: String(body.customerName || ''),
      phone: String(body.phone || ''),
      email: String(body.email || ''),
      date: String(body.date || ''),
      startTime: String(body.startTime || ''),
      guestCount: Number(body.guestCount || 0),
      specialRequests: body.specialRequests ? String(body.specialRequests) : '',
      idempotencyKey: body.idempotencyKey ? String(body.idempotencyKey) : undefined,
    });
    res.status(201).json(result);
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode || 500;
    res.status(status).json({
      error: err instanceof Error ? err.message : 'Unable to create reservation',
    });
  }
});

apiRouter.get('/reservations/status', async (req, res) => {
  try {
    const ref = String(req.query.ref || '').trim().toUpperCase();
    if (!ref || !/^[A-Z0-9-]+$/.test(ref)) {
      res.status(400).json({ error: 'Valid reservation reference code is required.' });
      return;
    }

    const adminDb = getAdminFirestore();
    const record = adminDb
      ? ((await adminDb.collection('reservationStatuses').doc(ref).get()).data() as
          | ReservationStatusView
          | undefined) || null
      : await firestoreRestGetDoc<ReservationStatusView>('reservationStatuses', ref);

    if (!record) {
      res.status(404).json({ error: `No reservation found with reference ${ref}.` });
      return;
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to look up reservation status',
    });
  }
});

apiRouter.post('/reservations/cancel', publicWriteLimiter, async (req, res) => {
  try {
    const ref = String(req.body?.referenceCode || '').trim().toUpperCase();
    if (!ref || !/^[A-Z0-9-]+$/.test(ref)) {
      res.status(400).json({ error: 'Valid reservation reference code is required.' });
      return;
    }

    const adminDb = getAdminFirestore();
    if (adminDb) {
      const statusRef = adminDb.collection('reservationStatuses').doc(ref);
      const statusSnap = await statusRef.get();
      if (!statusSnap.exists) {
        res.status(404).json({ error: `Reservation ${ref} not found.` });
        return;
      }
      const statusData = statusSnap.data() as ReservationStatusView;
      if (!['PENDING', 'CONFIRMED'].includes(statusData.status)) {
        res.status(400).json({ error: `Reservation is already ${statusData.status}.` });
        return;
      }
      const { FieldValue } = await import('firebase-admin/firestore');
      await statusRef.update({
        cancellationRequested: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
      res.json({ ok: true, referenceCode: ref, cancellationRequested: true });
      return;
    }

    const existing = await firestoreRestGetDoc<ReservationStatusView>('reservationStatuses', ref);
    if (!existing) {
      res.status(404).json({ error: `Reservation ${ref} not found.` });
      return;
    }
    if (!['PENDING', 'CONFIRMED'].includes(existing.status)) {
      res.status(400).json({ error: `Reservation is already ${existing.status}.` });
      return;
    }

    await firestoreRestAtomicCommit([
      {
        collection: 'reservationStatuses',
        docId: ref,
        data: {
          ...existing,
          cancellationRequested: true,
        },
        serverTimestampFields: ['updatedAt'],
        mustExist: true,
      },
    ]);

    res.json({ ok: true, referenceCode: ref, cancellationRequested: true });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to submit cancellation request',
    });
  }
});

apiRouter.post('/orders', publicWriteLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const customerName = clampString(body.customerName, 120);
    const phone = clampString(body.phone, 30);
    const orderType: OrderType = body.orderType === 'PICKUP' ? 'PICKUP' : 'DELIVERY';
    const specialInstructions = clampString(body.specialInstructions, 500);
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (customerName.length < 2 || phone.length < 6 || rawItems.length === 0) {
      res.status(400).json({ error: 'Customer name, phone number, and at least one dish are required.' });
      return;
    }

    const catalog = await loadCatalogFromFirestore();
    const itemMap = new Map(catalog.items.map((item) => [item.itemId, item]));
    const resolvedEntries: Array<{ item: MenuItem; quantity: number }> = [];

    for (const row of rawItems) {
      const itemId = String(row?.itemId || '');
      const quantity = Math.max(1, Math.min(50, Math.floor(Number(row?.quantity || 1))));
      const dbItem = itemMap.get(itemId);
      if (!dbItem) {
        res.status(400).json({ error: `Dish '${itemId}' was not found in menu.` });
        return;
      }
      if (!dbItem.available) {
        res.status(400).json({ error: `'${dbItem.name}' is currently unavailable.` });
        return;
      }
      resolvedEntries.push({ item: dbItem, quantity });
    }

    const totals = calculateOrderTotals(resolvedEntries, catalog.offers);
    const appliedOfferNames = Array.from(
      new Set(
        resolvedEntries
          .map((e) => {
            const matchedOffer = catalog.offers.find(
              (o) => o.applicableItems.length === 0 || o.applicableItems.includes(e.item.itemId)
            );
            return matchedOffer?.title;
          })
          .filter(Boolean) as string[]
      )
    );

    const whatsappMessage = buildWhatsAppOrderMessage({
      customerName,
      phone,
      orderType,
      specialInstructions,
      lineItems: totals.lineItems,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      currency: catalog.settings.currency,
      appliedOfferNames,
    });
    const whatsappUrl = buildWhatsAppUrl(catalog.settings.whatsappNumber, whatsappMessage);

    const orderId = `ord_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const customerId = `cust_${crypto.createHash('sha256').update(phone).digest('hex').slice(0, 16)}`;
    const nowIso = new Date().toISOString();

    const orderDoc = {
      orderId,
      customerId,
      customerName,
      phone,
      items: totals.lineItems,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      orderType,
      orderStatus: 'WHATSAPP_INITIATED',
      paymentStatus: 'UNPAID',
      specialInstructions,
      createdAt: nowIso,
    };

    const orderItemWrites = totals.lineItems.map((line, idx) => ({
      collection: 'orderItems',
      docId: `${orderId}_item_${idx + 1}`,
      data: {
        orderItemId: `${orderId}_item_${idx + 1}`,
        orderId,
        ...line,
      },
      mustNotExist: true,
    }));

    const adminDb = getAdminFirestore();
    if (adminDb) {
      const { FieldValue } = await import('firebase-admin/firestore');
      const batch = adminDb.batch();
      batch.set(adminDb.collection('orders').doc(orderId), {
        ...orderDoc,
        createdAt: FieldValue.serverTimestamp(),
      });
      for (const itemWrite of orderItemWrites) {
        batch.set(adminDb.collection('orderItems').doc(itemWrite.docId), itemWrite.data);
      }
      await batch.commit();
    } else {
      await firestoreRestAtomicCommit([
        {
          collection: 'orders',
          docId: orderId,
          data: orderDoc,
          serverTimestampFields: ['createdAt'],
          mustNotExist: true,
        },
        ...orderItemWrites,
      ]);
    }

    res.status(201).json({
      orderId,
      subtotal: totals.subtotal,
      discount: totals.discount,
      total: totals.total,
      whatsappMessage,
      whatsappUrl,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to prepare WhatsApp order',
    });
  }
});

apiRouter.post('/enquiries', publicWriteLimiter, async (req, res) => {
  try {
    const body = req.body || {};
    const validation = validateContactEnquiryInput(body);
    if (!validation.valid) {
      res.status(400).json({ error: validation.errors.join(' ') });
      return;
    }

    const enquiryId = `enq_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const nowIso = new Date().toISOString();
    const docData = {
      enquiryId,
      name: clampString(body.name, 120),
      phone: clampString(body.phone, 30),
      email: clampString(String(body.email).toLowerCase(), 200),
      subject: clampString(body.subject, 160),
      message: clampString(body.message, 2000),
      status: 'NEW',
      createdAt: nowIso,
    };

    const adminDb = getAdminFirestore();
    if (adminDb) {
      const { FieldValue } = await import('firebase-admin/firestore');
      await adminDb.collection('contactEnquiries').doc(enquiryId).set({
        ...docData,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      await firestoreRestAtomicCommit([
        {
          collection: 'contactEnquiries',
          docId: enquiryId,
          data: docData,
          serverTimestampFields: ['createdAt'],
          mustNotExist: true,
        },
      ]);
    }

    const emailResult = await sendEmailNotification({
      to: process.env.SMTP_USER || ADMIN_BOOTSTRAP_EMAIL,
      subject: `ZEXUNA Contact Enquiry: ${docData.subject}`,
      text: `From: ${docData.name} (${docData.email}, ${docData.phone})\n\n${docData.message}`,
      html: `<p><strong>From:</strong> ${docData.name} (${docData.email}, ${docData.phone})</p><p>${docData.message}</p>`,
    });

    res.status(201).json({ enquiryId, status: 'NEW', emailResult });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to submit enquiry',
    });
  }
});

apiRouter.post('/newsletter', publicWriteLimiter, async (req, res) => {
  try {
    const email = clampString(String(req.body?.email || '').toLowerCase(), 200);
    const consent = req.body?.consent === true;
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!consent) {
      res.status(400).json({ error: 'Marketing consent must be explicitly granted.' });
      return;
    }

    const subscriberId = `sub_${crypto.createHash('sha256').update(email).digest('hex').slice(0, 16)}`;
    const nowIso = new Date().toISOString();
    const docData = {
      subscriberId,
      email,
      consent: true,
      createdAt: nowIso,
    };

    const adminDb = getAdminFirestore();
    if (adminDb) {
      const { FieldValue } = await import('firebase-admin/firestore');
      await adminDb.collection('newsletterSubscribers').doc(subscriberId).set({
        ...docData,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      await firestoreRestAtomicCommit([
        {
          collection: 'newsletterSubscribers',
          docId: subscriberId,
          data: docData,
          serverTimestampFields: ['createdAt'],
        },
      ]);
    }

    res.status(201).json({ subscriberId, subscribed: true });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to subscribe to newsletter',
    });
  }
});

// -----------------------------------------------------------------------------
// Gemini AI Restaurant Assistant (/api/chat)
// -----------------------------------------------------------------------------
const checkAvailabilityTool: FunctionDeclaration = {
  name: 'check_table_availability',
  description: 'Check real-time table availability in Cloud Firestore for a specific date and guest count.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: 'Reservation date in YYYY-MM-DD format.' },
      guestCount: { type: Type.NUMBER, description: 'Number of dining guests (1 to 30).' },
    },
    required: ['date', 'guestCount'],
  },
};

const submitReservationTool: FunctionDeclaration = {
  name: 'submit_table_reservation',
  description:
    'Submit a confirmed table reservation request to Cloud Firestore ONLY after the guest has reviewed the proposed booking details and explicitly confirmed.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      customerName: { type: Type.STRING, description: 'Guest full name.' },
      phone: { type: Type.STRING, description: 'Guest phone number.' },
      email: { type: Type.STRING, description: 'Guest email address.' },
      date: { type: Type.STRING, description: 'Reservation date in YYYY-MM-DD format.' },
      startTime: { type: Type.STRING, description: 'Preferred time slot in HH:MM format.' },
      guestCount: { type: Type.NUMBER, description: 'Number of guests.' },
      specialRequests: { type: Type.STRING, description: 'Optional dietary or seating notes.' },
    },
    required: ['customerName', 'phone', 'email', 'date', 'startTime', 'guestCount'],
  },
};

apiRouter.post('/chat', chatLimiter, async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({
        error:
          'ZEXUNA AI Restaurant Assistant requires GEMINI_API_KEY to be configured in Settings > Secrets.',
      });
      return;
    }

    const message = clampString(req.body?.message, 1500);
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10) : [];
    const conversationId =
      req.body?.conversationId && isValidId(String(req.body.conversationId))
        ? String(req.body.conversationId)
        : `conv_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;

    if (!message) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    const catalog = await loadCatalogFromFirestore();
    const menuSummary = catalog.items.map((item) => ({
      itemId: item.itemId,
      name: item.name,
      categoryId: item.categoryId,
      originalPrice: item.originalPrice,
      discountedPrice: item.discountedPrice,
      vegetarian: item.vegetarian,
      available: item.available,
      allergens: item.allergens,
    }));

    const offersSummary = catalog.offers.map((o) => ({
      title: o.title,
      description: o.description,
      discountType: o.discountType,
      discountValue: o.discountValue,
      originalPrice: o.originalPrice,
      discountedPrice: o.discountedPrice,
      expiresAt: o.expiresAt,
      applicableItems: o.applicableItems,
    }));

    const systemInstruction = [
      'You are the ZEXUNA AI RESTAURANT ASSISTANT for ZEXUNA Restaurant ("Technology Without Limits.").',
      'Rules:',
      '1. Ground every price, dish availability, vegetarian indicator, allergen, offer, and opening hour strictly in the live database JSON provided below. NEVER invent food prices, opening hours, discounts, table availability, or reservation confirmations.',
      `2. Currency is ${catalog.settings.currency}. Primary WhatsApp ordering number is ${catalog.settings.whatsappNumber} (https://wa.me/${catalog.settings.whatsappNumber.replace(/[^\d]/g, '')}).`,
      '3. When helping with a reservation: first ask for missing details (full name, phone, email, date YYYY-MM-DD, preferred time HH:MM, party size), call check_table_availability, present the proposed reservation clearly, ask the guest to confirm, and ONLY after explicit confirmation call submit_table_reservation and return the real reference code.',
      '4. Keep responses concise, refined, warm, and scannable.',
      `Restaurant Settings: ${JSON.stringify({
        restaurantName: catalog.settings.restaurantName,
        address: catalog.settings.address,
        openingHours: catalog.settings.openingHours,
        reservationSettings: catalog.settings.reservationSettings,
        whatsappNumber: catalog.settings.whatsappNumber,
      })}`,
      `Live Menu Items: ${JSON.stringify(menuSummary)}`,
      `Active Offers: ${JSON.stringify(offersSummary)}`,
    ].join('\n\n');

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const contents = [
      ...history.map((m: { sender?: string; content?: string }) => ({
        role: m.sender === 'ASSISTANT' ? 'model' : 'user',
        parts: [{ text: String(m.content || '').slice(0, 1500) }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const tools = [{ functionDeclarations: [checkAvailabilityTool, submitReservationTool] }];

    let response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents,
      config: {
        systemInstruction,
        tools,
      },
    });

    // Handle up to 2 function-calling rounds
    for (let round = 0; round < 2; round++) {
      const fnCalls = response.functionCalls;
      if (!fnCalls || fnCalls.length === 0) break;

      const modelContent = response.candidates?.[0]?.content;
      if (!modelContent) break;

      const toolResponseParts: Array<{
        functionResponse: { id?: string; name: string; response: Record<string, unknown> };
      }> = [];

      for (const call of fnCalls) {
        if (call.name === 'check_table_availability') {
          const args = (call.args || {}) as { date?: string; guestCount?: number };
          try {
            const avail = await computeDateAvailability(
              String(args.date || ''),
              Math.max(1, Number(args.guestCount || 2))
            );
            toolResponseParts.push({
              functionResponse: {
                id: call.id,
                name: call.name,
                response: { result: avail },
              },
            });
          } catch (toolErr) {
            toolResponseParts.push({
              functionResponse: {
                id: call.id,
                name: call.name,
                response: { error: toolErr instanceof Error ? toolErr.message : 'Availability check failed' },
              },
            });
          }
        } else if (call.name === 'submit_table_reservation') {
          const args = (call.args || {}) as Record<string, unknown>;
          try {
            const booking = await executeAtomicReservation({
              customerName: String(args.customerName || ''),
              phone: String(args.phone || ''),
              email: String(args.email || ''),
              date: String(args.date || ''),
              startTime: String(args.startTime || ''),
              guestCount: Number(args.guestCount || 2),
              specialRequests: args.specialRequests ? String(args.specialRequests) : '',
            });
            toolResponseParts.push({
              functionResponse: {
                id: call.id,
                name: call.name,
                response: { result: booking },
              },
            });
          } catch (toolErr) {
            toolResponseParts.push({
              functionResponse: {
                id: call.id,
                name: call.name,
                response: { error: toolErr instanceof Error ? toolErr.message : 'Reservation failed' },
              },
            });
          }
        }
      }

      contents.push(modelContent as never);
      contents.push({ role: 'user', parts: toolResponseParts as never });

      response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config: {
          systemInstruction,
          tools,
        },
      });
    }

    const replyText =
      response.text ||
      'I am ready to assist with menu recommendations, pricing, offers, and table reservations.';

    // Persist chat exchange to Firestore best-effort (subject to rules)
    try {
      const nowIso = new Date().toISOString();
      const userMsgId = `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
      const botMsgId = `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`;
      await firestoreRestAtomicCommit([
        {
          collection: 'chatbotConversations',
          docId: conversationId,
          data: { conversationId, createdAt: nowIso, updatedAt: nowIso },
          serverTimestampFields: ['createdAt', 'updatedAt'],
        },
        {
          collection: 'chatbotMessages',
          docId: userMsgId,
          data: {
            messageId: userMsgId,
            conversationId,
            sender: 'USER',
            content: message,
            timestamp: nowIso,
          },
          serverTimestampFields: ['timestamp'],
          mustNotExist: true,
        },
        {
          collection: 'chatbotMessages',
          docId: botMsgId,
          data: {
            messageId: botMsgId,
            conversationId,
            sender: 'ASSISTANT',
            content: replyText.slice(0, 4000),
            timestamp: nowIso,
          },
          serverTimestampFields: ['timestamp'],
          mustNotExist: true,
        },
      ]);
    } catch {
      // Non-blocking conversation audit
    }

    res.json({
      conversationId,
      reply: replyText,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'AI assistant error',
    });
  }
});

// -----------------------------------------------------------------------------
// Protected Admin Routes
// -----------------------------------------------------------------------------
apiRouter.post('/admin/onboard', async (req, res) => {
  try {
    const token = getBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Missing Authorization Bearer token.' });
      return;
    }
    const verified = await verifyFirebaseIdToken(token);
    if (!verified.emailVerified) {
      res.status(403).json({ error: 'Google account email must be verified.' });
      return;
    }

    const existingAdmin = await checkIsAdminUser(verified.uid, token);
    if (existingAdmin) {
      res.json({ ok: true, role: 'OWNER', alreadyOnboarded: true });
      return;
    }

    if (verified.email !== ADMIN_BOOTSTRAP_EMAIL) {
      res.status(403).json({
        error: `Account ${verified.email} is not authorized for initial administrator onboarding. Authorized owner email: ${ADMIN_BOOTSTRAP_EMAIL}.`,
      });
      return;
    }

    const nowIso = new Date().toISOString();
    const adminPayload = {
      uid: verified.uid,
      email: verified.email,
      displayName: clampString(verified.name || verified.email.split('@')[0], 120),
      role: 'OWNER',
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const adminDb = getAdminFirestore();
    if (adminDb) {
      const { FieldValue } = await import('firebase-admin/firestore');
      await adminDb.collection('admins').doc(verified.uid).set({
        ...adminPayload,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      await firestoreRestAtomicCommit(
        [
          {
            collection: 'admins',
            docId: verified.uid,
            data: adminPayload,
            serverTimestampFields: ['createdAt', 'updatedAt'],
            mustNotExist: true,
          },
        ],
        token
      );
    }

    res.status(201).json({ ok: true, admin: adminPayload });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Administrator onboarding failed',
    });
  }
});

apiRouter.get('/admin/integrations', async (req, res) => {
  const auth = await authenticateAdmin(req);
  if (!auth) {
    res.status(403).json({ error: 'Administrator authentication required.' });
    return;
  }
  res.json({
    smtpConfigured: isSmtpConfigured(),
    whatsappCloudConfigured: isWhatsAppCloudConfigured(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    adminSdkConfigured: Boolean(getAdminFirestore()),
  });
});

apiRouter.post('/admin/seed-demo', async (req, res) => {
  const auth = await authenticateAdmin(req);
  if (!auth) {
    res.status(403).json({ error: 'Administrator authentication required.' });
    return;
  }

  try {
    const nowIso = new Date().toISOString();
    const ops = [
      {
        collection: 'restaurantSettings',
        docId: 'public',
        data: { ...DEFAULT_SETTINGS, updatedAt: nowIso },
        serverTimestampFields: ['updatedAt'],
      },
      ...DEMO_CATEGORIES.map((cat) => ({
        collection: 'menuCategories',
        docId: cat.categoryId,
        data: cat as unknown as Record<string, unknown>,
      })),
      ...DEMO_TABLES.map((tbl) => ({
        collection: 'restaurantTables',
        docId: tbl.tableId,
        data: tbl as unknown as Record<string, unknown>,
      })),
      ...DEMO_MENU_ITEMS.map((item) => ({
        collection: 'menuItems',
        docId: item.itemId,
        data: item as unknown as Record<string, unknown>,
        serverTimestampFields: ['createdAt', 'updatedAt'],
      })),
      ...DEMO_OFFERS.map((offer) => ({
        collection: 'offers',
        docId: offer.offerId,
        data: offer as unknown as Record<string, unknown>,
      })),
      {
        collection: 'auditLogs',
        docId: `log_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`,
        data: {
          logId: `log_${Date.now()}`,
          adminUid: auth.user.uid,
          action: 'SEED_DEMONSTRATION_CATALOG',
          entityType: 'system',
          entityId: 'initial_seed',
          details: 'Populated initial categories, tables, demonstration menu items, and default settings.',
          timestamp: nowIso,
        },
        serverTimestampFields: ['timestamp'],
        mustNotExist: true,
      },
    ];

    await firestoreRestAtomicCommit(ops, auth.token);
    res.json({ ok: true, count: ops.length });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to initialize Firestore catalog',
    });
  }
});

apiRouter.post('/admin/reservations/:id/status', async (req, res) => {
  const auth = await authenticateAdmin(req);
  if (!auth) {
    res.status(403).json({ error: 'Administrator authentication required.' });
    return;
  }

  try {
    const reservationId = req.params.id;
    const nextStatus = String(req.body?.status || '') as ReservationStatus;
    if (!isValidId(reservationId)) {
      res.status(400).json({ error: 'Invalid reservation ID.' });
      return;
    }

    const reservation = await firestoreRestGetDoc<Reservation>(
      'reservations',
      reservationId,
      auth.token
    );
    if (!reservation) {
      res.status(404).json({ error: 'Reservation not found.' });
      return;
    }

    if (!canTransitionReservationStatus(reservation.status, nextStatus)) {
      res.status(400).json({
        error: `Cannot transition reservation from ${reservation.status} to ${nextStatus}.`,
      });
      return;
    }

    const statusView = await firestoreRestGetDoc<ReservationStatusView>(
      'reservationStatuses',
      reservation.referenceCode,
      auth.token
    );

    const lockId = formatSlotLockId(reservation.date, reservation.startTime, reservation.tableId);
    const shouldReleaseLock = nextStatus === 'REJECTED' || nextStatus === 'CANCELLED';
    const existingLock = shouldReleaseLock
      ? await firestoreRestGetDoc<SlotLock>('slotLocks', lockId, auth.token)
      : null;

    const nowIso = new Date().toISOString();
    const ops = [
      {
        collection: 'reservations',
        docId: reservationId,
        data: {
          ...reservation,
          status: nextStatus,
          updatedAt: nowIso,
        },
        serverTimestampFields: ['updatedAt'],
        mustExist: true,
      },
      ...(statusView
        ? [
            {
              collection: 'reservationStatuses',
              docId: reservation.referenceCode,
              data: {
                ...statusView,
                status: nextStatus,
                cancellationRequested:
                  nextStatus === 'CANCELLED' ? false : statusView.cancellationRequested || false,
                updatedAt: nowIso,
              },
              serverTimestampFields: ['updatedAt'],
              mustExist: true,
            },
          ]
        : []),
      ...(existingLock
        ? [
            {
              collection: 'slotLocks',
              docId: lockId,
              data: {
                ...existingLock,
                active: false,
              },
              mustExist: true,
            },
          ]
        : []),
      {
        collection: 'auditLogs',
        docId: `log_${crypto.randomUUID().replace(/-/g, '').slice(0, 14)}`,
        data: {
          logId: `log_${Date.now()}`,
          adminUid: auth.user.uid,
          action: `RESERVATION_${nextStatus}`,
          entityType: 'reservation',
          entityId: reservationId,
          details: `Changed reservation ${reservation.referenceCode} from ${reservation.status} to ${nextStatus}`,
          timestamp: nowIso,
        },
        serverTimestampFields: ['timestamp'],
        mustNotExist: true,
      },
    ];

    await firestoreRestAtomicCommit(ops, auth.token);

    // Send real notification on CONFIRMED / REJECTED / CANCELLED
    let notificationResult = null;
    if (['CONFIRMED', 'REJECTED', 'CANCELLED'].includes(nextStatus)) {
      notificationResult = await sendEmailNotification({
        to: reservation.email,
        subject: `ZEXUNA Restaurant — Reservation ${reservation.referenceCode} ${nextStatus}`,
        text: `Dear ${reservation.customerName},\n\nYour reservation (${reservation.referenceCode}) for ${reservation.date} at ${reservation.startTime} is now ${nextStatus}.\n\nZEXUNA Restaurant`,
        html: `<p>Dear ${reservation.customerName},</p><p>Your reservation (<strong>${reservation.referenceCode}</strong>) for ${reservation.date} at ${reservation.startTime} is now <strong>${nextStatus}</strong>.</p><p>ZEXUNA Restaurant</p>`,
      });
    }

    res.json({ ok: true, reservationId, status: nextStatus, notificationResult });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to update reservation status',
    });
  }
});

export default apiRouter;
