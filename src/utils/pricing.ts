import type { MenuItem, Offer, OrderLineSummary, OrderType } from '../types/restaurant';

export interface EffectivePricing {
  originalPrice: number;
  finalPrice: number;
  discountAmount: number;
  discountPercent: number;
  appliedOfferTitle: string | null;
  appliedOfferId: string | null;
}

export function isOfferActive(offer: Offer, now: Date = new Date()): boolean {
  if (!offer.active) return false;
  const start = new Date(offer.startAt).getTime();
  const end = new Date(offer.expiresAt).getTime();
  const current = now.getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return current >= start && current < end;
}

export function getActiveOffers(offers: Offer[], now: Date = new Date()): Offer[] {
  return offers.filter((offer) => isOfferActive(offer, now));
}

export function getEffectiveItemPricing(
  item: MenuItem,
  offers: Offer[],
  now: Date = new Date()
): EffectivePricing {
  const basePrice = Math.max(0, Number(item.originalPrice) || 0);
  let bestPrice =
    item.discountedPrice !== null &&
    item.discountedPrice !== undefined &&
    item.discountedPrice >= 0 &&
    item.discountedPrice < basePrice
      ? Number(item.discountedPrice)
      : basePrice;

  let appliedOfferTitle: string | null = null;
  let appliedOfferId: string | null = null;

  for (const offer of getActiveOffers(offers, now)) {
    const applies =
      offer.applicableItems.length === 0 || offer.applicableItems.includes(item.itemId);
    if (!applies) continue;

    let candidatePrice = basePrice;
    if (offer.discountType === 'PERCENTAGE') {
      const pct = Math.min(100, Math.max(0, offer.discountValue));
      candidatePrice = Math.round((basePrice * (1 - pct / 100)) * 100) / 100;
    } else if (offer.discountType === 'FIXED_AMOUNT') {
      candidatePrice = Math.max(0, Math.round((basePrice - offer.discountValue) * 100) / 100);
    }

    if (candidatePrice < bestPrice) {
      bestPrice = candidatePrice;
      appliedOfferTitle = offer.title;
      appliedOfferId = offer.offerId;
    }
  }

  const discountAmount = Math.max(0, Math.round((basePrice - bestPrice) * 100) / 100);
  const discountPercent =
    basePrice > 0 && discountAmount > 0 ? Math.round((discountAmount / basePrice) * 100) : 0;

  return {
    originalPrice: basePrice,
    finalPrice: bestPrice,
    discountAmount,
    discountPercent,
    appliedOfferTitle,
    appliedOfferId,
  };
}

export function calculateOrderTotals(
  entries: Array<{ item: MenuItem; quantity: number }>,
  offers: Offer[],
  now: Date = new Date()
): {
  subtotal: number;
  discount: number;
  total: number;
  lineItems: OrderLineSummary[];
} {
  let subtotal = 0;
  let discount = 0;
  const lineItems: OrderLineSummary[] = [];

  for (const entry of entries) {
    const qty = Math.max(1, Math.floor(entry.quantity));
    const pricing = getEffectiveItemPricing(entry.item, offers, now);
    const lineOriginal = Math.round(pricing.originalPrice * qty * 100) / 100;
    const lineDiscount = Math.round(pricing.discountAmount * qty * 100) / 100;
    const lineTotal = Math.round(pricing.finalPrice * qty * 100) / 100;

    subtotal += lineOriginal;
    discount += lineDiscount;
    lineItems.push({
      itemId: entry.item.itemId,
      name: entry.item.name,
      quantity: qty,
      unitPrice: pricing.originalPrice,
      discountApplied: lineDiscount,
      lineTotal,
    });
  }

  subtotal = Math.round(subtotal * 100) / 100;
  discount = Math.round(discount * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

  return { subtotal, discount, total, lineItems };
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '₹';
  const formatted = Number.isInteger(amount) ? amount.toLocaleString('en-IN') : amount.toFixed(2);
  return `${symbol}${formatted}`;
}

export interface WhatsAppOrderMessageInput {
  customerName: string;
  phone: string;
  orderType: OrderType;
  specialInstructions?: string;
  lineItems: OrderLineSummary[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  appliedOfferNames?: string[];
}

export function buildWhatsAppOrderMessage(input: WhatsAppOrderMessageInput): string {
  const lines: string[] = [
    'Hello ZEXUNA Restaurant!',
    '',
    'I want to order:',
  ];

  for (const item of input.lineItems) {
    lines.push(`${item.name}`);
    lines.push(`Quantity: ${item.quantity}`);
    lines.push(`Price: ${formatCurrency(item.unitPrice, input.currency)}`);
    if (item.discountApplied > 0) {
      lines.push(`Offer Savings: -${formatCurrency(item.discountApplied, input.currency)}`);
    }
    lines.push(`Line Total: ${formatCurrency(item.lineTotal, input.currency)}`);
    lines.push('');
  }

  lines.push(`Subtotal: ${formatCurrency(input.subtotal, input.currency)}`);
  if (input.discount > 0) {
    const offerNote =
      input.appliedOfferNames && input.appliedOfferNames.length > 0
        ? ` (${input.appliedOfferNames.join(', ')})`
        : '';
    lines.push(`Offer Discount${offerNote}: -${formatCurrency(input.discount, input.currency)}`);
  }
  lines.push(`Total: ${formatCurrency(input.total, input.currency)}`);
  lines.push(`Order Type: ${input.orderType === 'PICKUP' ? 'Pickup' : 'Delivery'}`);
  lines.push(`Customer Name: ${input.customerName}`);
  lines.push(`Phone: ${input.phone}`);
  if (input.specialInstructions && input.specialInstructions.trim()) {
    lines.push(`Special Instructions: ${input.specialInstructions.trim()}`);
  }
  lines.push('');
  lines.push('Please confirm my order.');

  return lines.join('\n');
}

export function normalizeWhatsAppDigits(whatsappNumber: string): string {
  const digits = whatsappNumber.replace(/[^\d]/g, '');
  return digits || '919999988787';
}

export function buildWhatsAppUrl(whatsappNumber: string, message: string): string {
  const digits = normalizeWhatsAppDigits(whatsappNumber);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
