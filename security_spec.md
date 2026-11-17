# ZEXUNA Restaurant Security Specification

## 1. Data Invariants
1. **Admin Authority Invariant**: No user may read or write `admins/{uid}` to elevate their own privileges. Only an existing active admin (`exists(/databases/$(database)/documents/admins/$(request.auth.uid))` with `active == true`) or the verified bootstrap owner email (`official.zexuna@gmail.com` with `email_verified == true` when onboarding their own `uid`) may create the initial `OWNER` admin record.
2. **Menu & Pricing Integrity**: Only verified active administrators may create, modify, or delete `menuCategories`, `menuItems`, `offers`, `restaurantTables`, and `restaurantSettings`. Public visitors can only read active/available catalog records.
3. **Reservation Atomic Anti-Double-Booking**: Every reservation creation must set `status == 'PENDING'`, use `request.time` for `createdAt`/`updatedAt`, reference an existing `restaurantTable`, and atomically lock `slotLocks/{date}_{startTime}_{tableId}` in the same transaction. Guests cannot self-confirm (`status == 'CONFIRMED'`) or read other guests' PII.
4. **PII Isolation**: Collections containing customer emails, phone numbers, or messages (`customers`, `reservations`, `orders`, `orderItems`, `contactEnquiries`, `newsletterSubscribers`, `notifications`, `chatbotConversations`, `chatbotMessages`, `auditLogs`) are strictly non-listable and non-readable by the public. Guest status lookup reads only the PII-free `reservationStatuses/{referenceCode}` projection via single-document `get`.
5. **Audit Immutability**: `auditLogs` can only be appended by verified administrators with `adminUid == request.auth.uid` and `timestamp == request.time`, and may never be updated or deleted.

## 2. Dirty Dozen Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Self-Admin Privilege Escalation**: Unprivileged signed-in user writes `/admins/attackerUid` with `{ role: 'OWNER', active: true }`.
2. **Unverified Email Admin Spoof**: Signed-in user with `email: 'official.zexuna@gmail.com'` and `email_verified: false` writes `/admins/spoofUid`.
3. **Client Price Tampering**: Guest or signed-in non-admin updates `/menuItems/chicken_dum_biryani` with `{ discountedPrice: 1 }`.
4. **Ghost Field Shadow Write on Contact Enquiry**: Guest submits `/contactEnquiries/eq1` with extra field `{ isAdminApproved: true }`.
5. **Self-Confirming Reservation**: Guest submits `/reservations/res1` with `{ status: 'CONFIRMED' }` instead of `'PENDING'`.
6. **Client Timestamp Forgery**: Guest creates `/reservations/res1` with backdated `createdAt` not equal to `request.time`.
7. **PII Scraping via List Query**: Unauthenticated or non-admin user runs `getDocs(collection(db, 'reservations'))` or `getDocs(collection(db, 'customers'))`.
8. **Audit Log Tampering**: Even an admin attempts to `update` or `delete` `/auditLogs/log1`.
9. **Resource Poisoning via Oversized ID**: Attacker attempts to write `/contactEnquiries/<200-char-string-with-slashes>` or inject a 10KB `name` string.
10. **Offer Tampering by Non-Admin**: Signed-in non-admin attempts to create or activate `/offers/free_biryani`.
11. **Reservation Status Direct Hijack**: Non-admin attempts to update `/reservations/res1` from `PENDING` to `CONFIRMED`.
12. **Newsletter Without Consent**: Guest submits `/newsletterSubscribers/sub1` with `{ consent: false }`.
