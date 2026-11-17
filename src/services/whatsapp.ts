import type { OrderType } from '../types/restaurant';
import { buildWhatsAppUrl } from '../utils/pricing';

export interface PrepareOrderResponse {
  orderId: string;
  subtotal: number;
  discount: number;
  total: number;
  whatsappMessage: string;
  whatsappUrl: string;
}

export async function prepareWhatsAppOrder(params: {
  customerName: string;
  phone: string;
  orderType: OrderType;
  specialInstructions?: string;
  items: Array<{ itemId: string; quantity: number }>;
}): Promise<PrepareOrderResponse> {
  const resp = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Failed to prepare WhatsApp order');
  return data as PrepareOrderResponse;
}

export function buildGeneralWhatsAppEnquiryUrl(whatsappNumber: string, contextText: string): string {
  return buildWhatsAppUrl(whatsappNumber, `Hello ZEXUNA Restaurant!\n\n${contextText}`);
}
