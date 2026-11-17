import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ASSETS } from '../../data/demoSeed';
import { useRestaurant } from '../../context/RestaurantContext';
import { adminDeleteOffer, adminUpsertOffer } from '../../services/database';
import type { DiscountType, Offer } from '../../types/restaurant';
import { formatCurrency, isOfferActive } from '../../utils/pricing';
import type { AdminOutletContext } from './AdminLayout';

export function OfferManagement() {
  const data = useOutletContext<AdminOutletContext>();
  const { items, settings, refreshCatalog } = useRestaurant();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [startAt, setStartAt] = useState(new Date().toISOString().slice(0, 10));
  const [expiresAt, setExpiresAt] = useState('2027-12-31');
  const [active, setActive] = useState(true);
  const [terms, setTerms] = useState('');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function loadOffer(offer: Offer) {
    setEditingId(offer.offerId);
    setTitle(offer.title);
    setDescription(offer.description);
    setOriginalPrice(String(offer.originalPrice));
    setDiscountedPrice(String(offer.discountedPrice));
    setDiscountType(offer.discountType);
    setDiscountValue(String(offer.discountValue));
    setStartAt(offer.startAt.slice(0, 10));
    setExpiresAt(offer.expiresAt.slice(0, 10));
    setActive(offer.active);
    setTerms(offer.terms);
    setSelectedItemIds(offer.applicableItems || []);
  }

  function resetForm() {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setOriginalPrice('');
    setDiscountedPrice('');
    setDiscountType('PERCENTAGE');
    setDiscountValue('');
    setStartAt(new Date().toISOString().slice(0, 10));
    setExpiresAt('2027-12-31');
    setActive(true);
    setTerms('');
    setSelectedItemIds([]);
  }

  function toggleItemSelection(itemId: string) {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  }

  async function handleSaveOffer(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const offerId =
        editingId ||
        `offer-${title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 40)}-${Date.now().toString(36)}`;

      await adminUpsertOffer({
        offerId,
        title: title.trim(),
        description: description.trim(),
        applicableItems: selectedItemIds,
        originalPrice: Number(originalPrice),
        discountedPrice: Number(discountedPrice),
        discountType,
        discountValue: Number(discountValue),
        imageUrl: ASSETS.heroFallback,
        startAt: new Date(`${startAt}T00:00:00.000Z`).toISOString(),
        expiresAt: new Date(`${expiresAt}T23:59:59.000Z`).toISOString(),
        active,
        terms: terms.trim() || 'Valid for online WhatsApp orders and dine-in.',
      });

      await refreshCatalog();
      setNotice(`Saved promotional offer "${title.trim()}".`);
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save offer');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#C9A45C] mb-1">
          Promotional Campaigns
        </p>
        <h1 className="font-display text-3xl text-white">Offer Management</h1>
      </div>

      {notice && (
        <div className="p-4 bg-[#121212] border border-[#C9A45C]/50 text-xs text-[#E6CC91]">
          {notice}
        </div>
      )}
      {error && (
        <div role="alert" className="p-4 bg-red-950/40 border border-red-500/40 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={handleSaveOffer}
          className="xl:col-span-5 bg-[#121212] border border-white/10 p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-white">
              {editingId ? 'Edit Offer' : 'Create Offer'}
            </h2>
            {editingId && (
              <button type="button" onClick={resetForm} className="text-xs text-[#C9A45C]">
                Cancel
              </button>
            )}
          </div>

          <div>
            <label htmlFor="offer-title" className="block text-xs text-[#B8B8B8] mb-1">
              Offer Title
            </label>
            <input
              id="offer-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The Great Biryani Price Drop!"
              className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 text-sm text-white"
            />
          </div>

          <div>
            <label htmlFor="offer-desc" className="block text-xs text-[#B8B8B8] mb-1">
              Description
            </label>
            <textarea
              id="offer-desc"
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="offer-orig" className="block text-xs text-[#B8B8B8] mb-1">
                Original Price
              </label>
              <input
                id="offer-orig"
                type="number"
                required
                min="0"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 font-mono text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="offer-disc" className="block text-xs text-[#B8B8B8] mb-1">
                Discounted Price
              </label>
              <input
                id="offer-disc"
                type="number"
                required
                min="0"
                value={discountedPrice}
                onChange={(e) => setDiscountedPrice(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 font-mono text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="offer-type" className="block text-xs text-[#B8B8B8] mb-1">
                Discount Type
              </label>
              <select
                id="offer-type"
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as DiscountType)}
                className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 text-sm text-white"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED_AMOUNT">Fixed Amount</option>
              </select>
            </div>
            <div>
              <label htmlFor="offer-val" className="block text-xs text-[#B8B8B8] mb-1">
                Discount Value
              </label>
              <input
                id="offer-val"
                type="number"
                required
                min="0"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 font-mono text-sm text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="offer-start" className="block text-xs text-[#B8B8B8] mb-1">
                Start Date
              </label>
              <input
                id="offer-start"
                type="date"
                required
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 text-sm text-white"
              />
            </div>
            <div>
              <label htmlFor="offer-end" className="block text-xs text-[#B8B8B8] mb-1">
                Expiry Date
              </label>
              <input
                id="offer-end"
                type="date"
                required
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 text-sm text-white"
              />
            </div>
          </div>

          <div>
            <span className="block text-xs text-[#B8B8B8] mb-1.5">
              Eligible Dishes (leave unchecked for all dishes)
            </span>
            <div className="max-h-36 overflow-y-auto bg-[#090909] border border-white/15 p-3 space-y-1.5 text-xs">
              {items.map((item) => (
                <label key={item.itemId} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedItemIds.includes(item.itemId)}
                    onChange={() => toggleItemSelection(item.itemId)}
                    className="accent-[#C9A45C]"
                  />
                  <span className="text-white">{item.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="offer-terms" className="block text-xs text-[#B8B8B8] mb-1">
              Terms
            </label>
            <input
              id="offer-terms"
              type="text"
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 text-xs text-white"
            />
          </div>

          <label className="inline-flex items-center gap-2 text-xs text-[#B8B8B8] cursor-pointer">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="accent-[#C9A45C]"
            />
            <span>Active Campaign</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] disabled:opacity-50"
          >
            {saving ? 'Saving Campaign...' : editingId ? 'Update Offer' : 'Create Offer'}
          </button>
        </form>

        <div className="xl:col-span-7 bg-[#121212] border border-white/10 p-6 space-y-4">
          <h2 className="font-display text-xl text-white">
            Configured Offers ({data.offers.length})
          </h2>
          {data.offers.length === 0 ? (
            <p className="text-sm text-[#B8B8B8]">No offers stored in Firestore yet.</p>
          ) : (
            <div className="space-y-3">
              {data.offers.map((offer) => {
                const live = isOfferActive(offer);
                return (
                  <div
                    key={offer.offerId}
                    className="bg-[#090909] border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-[11px] text-[#B8B8B8] mb-1">
                        <span className={live ? 'text-emerald-400' : 'text-red-400'}>
                          {live ? 'Live Publicly' : offer.active ? 'Expired / Scheduled' : 'Inactive'}
                        </span>
                        <span>·</span>
                        <span className="tabular-nums">
                          Expires {new Date(offer.expiresAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white">{offer.title}</h3>
                      <p className="font-mono text-xs text-[#E6CC91] mt-1 tabular-nums">
                        {formatCurrency(offer.discountedPrice, settings.currency)} (was{' '}
                        {formatCurrency(offer.originalPrice, settings.currency)})
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => loadOffer(offer)}
                        className="px-3 py-1.5 border border-[#C9A45C]/40 text-xs text-[#E6CC91]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          void adminDeleteOffer(offer.offerId).then(() => refreshCatalog())
                        }
                        className="px-3 py-1.5 border border-red-500/40 text-xs text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
