import React, { useMemo, useState } from 'react';
import { Minus, Plus, Trash2, X } from 'lucide-react';
import { useRestaurant } from '../context/RestaurantContext';
import { prepareWhatsAppOrder } from '../services/whatsapp';
import type { OrderType } from '../types/restaurant';
import { calculateOrderTotals, formatCurrency } from '../utils/pricing';

export function OrderDrawer() {
  const {
    cart,
    cartOpen,
    setCartOpen,
    updateCartQty,
    removeFromCart,
    clearCart,
    offers,
    settings,
  } = useRestaurant();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('DELIVERY');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preparedOrder, setPreparedOrder] = useState<{
    orderId: string;
    whatsappMessage: string;
    whatsappUrl: string;
    total: number;
  } | null>(null);

  const totals = useMemo(() => calculateOrderTotals(cart, offers), [cart, offers]);

  if (!cartOpen) return null;

  async function handlePrepareOrder(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await prepareWhatsAppOrder({
        customerName,
        phone,
        orderType,
        specialInstructions,
        items: cart.map((c) => ({ itemId: c.item.itemId, quantity: c.quantity })),
      });
      setPreparedOrder({
        orderId: result.orderId,
        whatsappMessage: result.whatsappMessage,
        whatsappUrl: result.whatsappUrl,
        total: result.total,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to prepare order');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Order Summary"
    >
      <div className="w-full max-w-md bg-[#121212] border-l border-[#C9A45C]/30 h-full flex flex-col">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl text-white">Order Summary</h2>
            <p className="text-xs text-[#B8B8B8]">Review items and send directly on WhatsApp</p>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close Order Summary"
            className="p-2 text-[#B8B8B8] hover:text-white border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {cart.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-lg text-white mb-2">Your order summary is empty</p>
              <p className="text-sm text-[#B8B8B8]">
                Select dishes from our digital menu to prepare your WhatsApp order.
              </p>
            </div>
          ) : (
            <>
              {/* Item List */}
              <div className="space-y-4">
                {cart.map(({ item, quantity }) => {
                  const line = totals.lineItems.find((l) => l.itemId === item.itemId);
                  return (
                    <div
                      key={item.itemId}
                      className="bg-[#090909] border border-white/10 p-4 flex items-start justify-between gap-4"
                    >
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-white truncate">{item.name}</h3>
                        <p className="font-mono text-xs text-[#E6CC91] mt-1 tabular-nums">
                          {formatCurrency(line?.lineTotal ?? 0, settings.currency)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setPreparedOrder(null);
                            updateCartQty(item.itemId, quantity - 1);
                          }}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="w-7 h-7 flex items-center justify-center border border-white/15 text-white hover:border-[#C9A45C]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-mono text-xs tabular-nums text-white">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPreparedOrder(null);
                            updateCartQty(item.itemId, quantity + 1);
                          }}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="w-7 h-7 flex items-center justify-center border border-white/15 text-white hover:border-[#C9A45C]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPreparedOrder(null);
                            removeFromCart(item.itemId);
                          }}
                          aria-label={`Remove ${item.name}`}
                          className="p-1.5 text-[#B8B8B8] hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals */}
              <div className="bg-[#090909] border border-[#C9A45C]/25 p-4 space-y-2 text-sm tabular-nums">
                <div className="flex justify-between text-[#B8B8B8]">
                  <span>Subtotal</span>
                  <span className="font-mono">{formatCurrency(totals.subtotal, settings.currency)}</span>
                </div>
                {totals.discount > 0 && (
                  <div className="flex justify-between text-[#C9A45C]">
                    <span>Offer Savings</span>
                    <span className="font-mono">-{formatCurrency(totals.discount, settings.currency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-semibold pt-2 border-t border-white/10">
                  <span>Calculated Total</span>
                  <span className="font-mono text-[#E6CC91]">
                    {formatCurrency(totals.total, settings.currency)}
                  </span>
                </div>
              </div>

              {/* Customer Details Form */}
              <form onSubmit={handlePrepareOrder} className="space-y-4">
                <div>
                  <label htmlFor="order-name" className="block text-xs text-[#B8B8B8] mb-1">
                    Full Name
                  </label>
                  <input
                    id="order-name"
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>

                <div>
                  <label htmlFor="order-phone" className="block text-xs text-[#B8B8B8] mb-1">
                    Phone Number
                  </label>
                  <input
                    id="order-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>

                <div>
                  <span className="block text-xs text-[#B8B8B8] mb-1.5">Order Preference</span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['DELIVERY', 'PICKUP'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setOrderType(mode)}
                        className={`py-2 text-xs font-medium border transition-colors ${
                          orderType === mode
                            ? 'bg-[#C9A45C] text-[#090909] border-[#C9A45C]'
                            : 'bg-[#090909] text-[#B8B8B8] border-white/15'
                        }`}
                      >
                        {mode === 'DELIVERY' ? 'Delivery' : 'Pickup'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="order-notes" className="block text-xs text-[#B8B8B8] mb-1">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    id="order-notes"
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="Spice level, cutlery, delivery landmark..."
                    className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Preparing WhatsApp Message...' : 'Review WhatsApp Order Message'}
                </button>
              </form>

              {/* Message Review Before Opening WhatsApp */}
              {preparedOrder && (
                <div className="bg-[#090909] border border-[#C9A45C]/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[#E6CC91] uppercase tracking-wider">
                      Ready to Send · Order Draft {preparedOrder.orderId}
                    </p>
                  </div>
                  <pre className="text-xs text-[#B8B8B8] whitespace-pre-wrap font-sans bg-[#121212] p-3 border border-white/10 max-h-48 overflow-y-auto">
                    {preparedOrder.whatsappMessage}
                  </pre>
                  <p className="text-[11px] text-[#B8B8B8]">
                    Opening WhatsApp sends this order enquiry to our kitchen team. Orders are confirmed and paid once acknowledged by ZEXUNA Restaurant.
                  </p>
                  <div className="flex gap-2">
                    <a
                      href={preparedOrder.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-center text-xs font-semibold uppercase tracking-wider transition-colors"
                    >
                      Open WhatsApp Now
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        clearCart();
                        setPreparedOrder(null);
                        setCartOpen(false);
                      }}
                      className="px-4 py-2.5 border border-white/15 text-xs text-[#B8B8B8] hover:text-white"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
