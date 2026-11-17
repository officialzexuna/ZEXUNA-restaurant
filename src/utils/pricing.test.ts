import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsAppOrderMessage,
  buildWhatsAppUrl,
  calculateOrderTotals,
  getActiveOffers,
  getEffectiveItemPricing,
  isOfferActive,
} from './pricing';
import type { MenuItem, Offer } from '../types/restaurant';

const sampleItem: MenuItem = {
  itemId: 'chicken-dum-biryani',
  name: 'Royal Hyderabadi Chicken Biryani',
  description: 'Slow-cooked saffron basmati rice and spiced chicken.',
  categoryId: 'chicken-biryani',
  imageUrl: '/src/assets/images/dish_chicken_biryani.jpg',
  originalPrice: 480,
  discountedPrice: 390,
  vegetarian: false,
  allergens: ['Dairy'],
  available: true,
  featured: true,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
};

const activeOffer: Offer = {
  offerId: 'biryani-price-drop',
  title: 'The Great Biryani Price Drop',
  description: '25% off signature biryanis.',
  applicableItems: ['chicken-dum-biryani'],
  originalPrice: 480,
  discountedPrice: 360,
  discountType: 'PERCENTAGE',
  discountValue: 25,
  startAt: '2026-11-01T00:00:00.000Z',
  expiresAt: '2026-12-31T23:59:59.000Z',
  active: true,
  terms: 'Valid on dine-in and pickup.',
};

const expiredOffer: Offer = {
  ...activeOffer,
  offerId: 'expired-offer',
  title: 'Expired Flash Deal',
  expiresAt: '2026-11-10T00:00:00.000Z',
};

test('isOfferActive excludes expired offers automatically', () => {
  const now = new Date('2026-11-17T10:00:00.000Z');
  assert.equal(isOfferActive(activeOffer, now), true);
  assert.equal(isOfferActive(expiredOffer, now), false);
  assert.equal(getActiveOffers([activeOffer, expiredOffer], now).length, 1);
});

test('getEffectiveItemPricing picks lowest valid price between item discount and active offers', () => {
  const now = new Date('2026-11-17T10:00:00.000Z');
  const pricing = getEffectiveItemPricing(sampleItem, [activeOffer, expiredOffer], now);
  assert.equal(pricing.originalPrice, 480);
  assert.equal(pricing.finalPrice, 360);
  assert.equal(pricing.discountAmount, 120);
  assert.equal(pricing.discountPercent, 25);
  assert.equal(pricing.appliedOfferId, 'biryani-price-drop');
});

test('calculateOrderTotals computes subtotal, discount, and total accurately', () => {
  const now = new Date('2026-11-17T10:00:00.000Z');
  const totals = calculateOrderTotals([{ item: sampleItem, quantity: 2 }], [activeOffer], now);
  assert.equal(totals.subtotal, 960);
  assert.equal(totals.discount, 240);
  assert.equal(totals.total, 720);
  assert.equal(totals.lineItems[0].lineTotal, 720);
});

test('buildWhatsAppUrl constructs proper wa.me link with URL-encoded message', () => {
  const message = buildWhatsAppOrderMessage({
    customerName: 'Aarav Sharma',
    phone: '+91 9876543210',
    orderType: 'DELIVERY',
    lineItems: [
      {
        itemId: 'chicken-dum-biryani',
        name: 'Royal Hyderabadi Chicken Biryani',
        quantity: 2,
        unitPrice: 480,
        discountApplied: 240,
        lineTotal: 720,
      },
    ],
    subtotal: 960,
    discount: 240,
    total: 720,
    currency: 'INR',
    appliedOfferNames: ['The Great Biryani Price Drop'],
  });
  const url = buildWhatsAppUrl('+91 9999988787', message);
  assert.ok(url.startsWith('https://wa.me/919999988787?text='));
  assert.ok(decodeURIComponent(url).includes('Royal Hyderabadi Chicken Biryani'));
  assert.ok(decodeURIComponent(url).includes('Quantity: 2'));
  assert.ok(decodeURIComponent(url).includes('Total: ₹720'));
});
