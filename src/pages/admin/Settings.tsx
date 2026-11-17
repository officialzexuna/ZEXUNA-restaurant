import React, { useEffect, useState } from 'react';
import { auth } from '../../services/firebase';
import { useRestaurant } from '../../context/RestaurantContext';
import { adminUpdateSettings } from '../../services/database';
import type { RestaurantSettings } from '../../types/restaurant';

export function AdminSettings() {
  const { settings, refreshCatalog } = useRestaurant();
  const [form, setForm] = useState<RestaurantSettings>(settings);
  const [slotsText, setSlotsText] = useState(
    (settings.reservationSettings.timeSlots || []).join(', ')
  );
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [integrations, setIntegrations] = useState<{
    smtpConfigured: boolean;
    whatsappCloudConfigured: boolean;
    geminiConfigured: boolean;
    adminSdkConfigured: boolean;
  } | null>(null);

  useEffect(() => {
    setForm(settings);
    setSlotsText((settings.reservationSettings.timeSlots || []).join(', '));
  }, [settings]);

  useEffect(() => {
    async function loadIntegrations() {
      const user = auth.currentUser;
      if (!user) return;
      const token = await user.getIdToken();
      const resp = await fetch('/api/admin/integrations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        setIntegrations(await resp.json());
      }
    }
    void loadIntegrations();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setNotice(null);
    setError(null);
    try {
      const parsedSlots = slotsText
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^\d{2}:\d{2}$/.test(s));

      await adminUpdateSettings({
        ...form,
        reservationSettings: {
          ...form.reservationSettings,
          timeSlots: parsedSlots.length > 0 ? parsedSlots : form.reservationSettings.timeSlots,
        },
      });
      await refreshCatalog();
      setNotice('Restaurant settings saved to Cloud Firestore.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#C9A45C] mb-1">Configuration</p>
        <h1 className="font-display text-3xl text-white">Restaurant Settings</h1>
      </div>

      {integrations && (
        <div className="bg-[#121212] border border-white/10 p-6 space-y-3">
          <h2 className="font-display text-lg text-white">Connected Server Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="bg-[#090909] border border-white/10 p-3.5">
              <p className="text-[#B8B8B8]">Gemini AI Assistant</p>
              <p className={integrations.geminiConfigured ? 'text-emerald-400 mt-1' : 'text-[#E6CC91] mt-1'}>
                {integrations.geminiConfigured ? 'Configured' : 'Set GEMINI_API_KEY in Secrets'}
              </p>
            </div>
            <div className="bg-[#090909] border border-white/10 p-3.5">
              <p className="text-[#B8B8B8]">SMTP Email Notifications</p>
              <p className={integrations.smtpConfigured ? 'text-emerald-400 mt-1' : 'text-[#E6CC91] mt-1'}>
                {integrations.smtpConfigured ? 'Configured' : 'Set SMTP_* env vars'}
              </p>
            </div>
            <div className="bg-[#090909] border border-white/10 p-3.5">
              <p className="text-[#B8B8B8]">WhatsApp Business Cloud API</p>
              <p className={integrations.whatsappCloudConfigured ? 'text-emerald-400 mt-1' : 'text-[#E6CC91] mt-1'}>
                {integrations.whatsappCloudConfigured ? 'Configured' : 'Optional · Using wa.me links'}
              </p>
            </div>
            <div className="bg-[#090909] border border-white/10 p-3.5">
              <p className="text-[#B8B8B8]">Cloud Firestore</p>
              <p className="text-emerald-400 mt-1">Connected</p>
            </div>
          </div>
        </div>
      )}

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

      <form onSubmit={handleSave} className="bg-[#121212] border border-white/10 p-6 sm:p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="set-name" className="block text-xs text-[#B8B8B8] mb-1">
              Restaurant Name
            </label>
            <input
              id="set-name"
              type="text"
              required
              value={form.restaurantName}
              onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 text-sm text-white"
            />
          </div>
          <div>
            <label htmlFor="set-currency" className="block text-xs text-[#B8B8B8] mb-1">
              Currency
            </label>
            <select
              id="set-currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 text-sm text-white"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="GBP">GBP (£)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="set-desc" className="block text-xs text-[#B8B8B8] mb-1">
            Restaurant Description
          </label>
          <textarea
            id="set-desc"
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 text-sm text-white"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="set-address" className="block text-xs text-[#B8B8B8] mb-1">
              Physical Address (Configurable)
            </label>
            <input
              id="set-address"
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 text-sm text-white"
            />
          </div>
          <div>
            <label htmlFor="set-wa" className="block text-xs text-[#B8B8B8] mb-1">
              WhatsApp Number
            </label>
            <input
              id="set-wa"
              type="text"
              required
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 font-mono text-sm text-white"
            />
          </div>
          <div>
            <label htmlFor="set-email" className="block text-xs text-[#B8B8B8] mb-1">
              Contact Email
            </label>
            <input
              id="set-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 text-sm text-white"
            />
          </div>
          <div>
            <label htmlFor="set-video" className="block text-xs text-[#B8B8B8] mb-1">
              Hero MP4 Video URL
            </label>
            <input
              id="set-video"
              type="text"
              value={form.heroVideoUrl || ''}
              onChange={(e) => setForm({ ...form, heroVideoUrl: e.target.value })}
              placeholder="/assets/hero-biryani.mp4"
              className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 text-sm text-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="set-slots" className="block text-xs text-[#B8B8B8] mb-1">
              Reservation Time Slots (HH:MM, comma-separated)
            </label>
            <input
              id="set-slots"
              type="text"
              value={slotsText}
              onChange={(e) => setSlotsText(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 font-mono text-sm text-white"
            />
          </div>
          <div>
            <label htmlFor="set-party" className="block text-xs text-[#B8B8B8] mb-1">
              Max Online Party Size
            </label>
            <input
              id="set-party"
              type="number"
              min="1"
              max="30"
              value={form.reservationSettings.maxPartySize}
              onChange={(e) =>
                setForm({
                  ...form,
                  reservationSettings: {
                    ...form.reservationSettings,
                    maxPartySize: Number(e.target.value),
                  },
                })
              }
              className="w-full px-3.5 py-2.5 bg-[#090909] border border-white/15 font-mono text-sm text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-8 py-3.5 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] disabled:opacity-50"
        >
          {saving ? 'Saving Settings...' : 'Save Restaurant Settings'}
        </button>
      </form>
    </div>
  );
}
