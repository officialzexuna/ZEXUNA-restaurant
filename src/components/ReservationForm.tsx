import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Clock, Users } from 'lucide-react';
import { useRestaurant } from '../context/RestaurantContext';
import {
  fetchAvailability,
  submitReservation,
  type AvailabilityResponse,
  type CreateReservationResponse,
} from '../services/reservations';
import { buildGeneralWhatsAppEnquiryUrl } from '../services/whatsapp';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function ReservationForm() {
  const { settings } = useRestaurant();
  const [date, setDate] = useState(getTodayDateString());
  const [guestCount, setGuestCount] = useState(2);
  const [startTime, setStartTime] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');

  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [availLoading, setAvailLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<CreateReservationResponse | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setAvailLoading(true);
      setError(null);
      try {
        const res = await fetchAvailability(date, guestCount);
        if (cancelled) return;
        setAvailability(res);
        const firstAvailable = res.slots.find((s) => s.available);
        setStartTime((prev) => {
          const stillValid = res.slots.some((s) => s.startTime === prev && s.available);
          return stillValid ? prev : firstAvailable?.startTime || '';
        });
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to check table availability');
        }
      } finally {
        if (!cancelled) setAvailLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [date, guestCount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!startTime) {
      setError('Please select an available dining time slot.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await submitReservation({
        customerName,
        phone,
        email,
        date,
        startTime,
        guestCount,
        specialRequests,
        idempotencyKey,
      });
      setConfirmation(result);
      setIdempotencyKey(
        typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now())
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete reservation');
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmation) {
    return (
      <div className="bg-[#121212] border border-[#C9A45C]/50 p-8 sm:p-10 space-y-6">
        <div className="flex items-start gap-4">
          <CheckCircle2 className="w-8 h-8 text-[#C9A45C] shrink-0 mt-1" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#C9A45C] mb-1">
              Reservation Request Submitted
            </p>
            <h3 className="font-display text-2xl sm:text-3xl text-white">
              Reference {confirmation.referenceCode}
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#090909] border border-white/10 p-5 text-sm">
          <div>
            <p className="text-xs text-[#B8B8B8]">Status</p>
            <p className="font-mono font-semibold text-[#E6CC91] mt-0.5">{confirmation.status}</p>
          </div>
          <div>
            <p className="text-xs text-[#B8B8B8]">Assigned Table</p>
            <p className="font-mono text-white mt-0.5">{confirmation.tableNumber}</p>
          </div>
          <div>
            <p className="text-xs text-[#B8B8B8]">Date & Time</p>
            <p className="font-mono text-white mt-0.5 tabular-nums">
              {confirmation.date} · {confirmation.startTime} – {confirmation.endTime}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#B8B8B8]">Party Size</p>
            <p className="font-mono text-white mt-0.5 tabular-nums">{confirmation.guestCount} Guests</p>
          </div>
        </div>

        <div className="text-xs text-[#B8B8B8] space-y-1">
          <p>
            Email notification status:{' '}
            <span className="text-white font-medium">{confirmation.notifications.email.status}</span>
            {confirmation.notifications.email.status === 'NOT_CONFIGURED' &&
              ' (SMTP provider not configured; check Reservation Status anytime with your reference code)'}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to={`/reservation-status?ref=${encodeURIComponent(confirmation.referenceCode)}`}
            className="px-6 py-3 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] transition-colors"
          >
            Track Reservation Status
          </Link>
          <button
            type="button"
            onClick={() => {
              setConfirmation(null);
              setSpecialRequests('');
            }}
            className="px-6 py-3 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider hover:border-[#C9A45C]"
          >
            Book Another Table
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#121212] border border-white/10 p-6 sm:p-10 space-y-8">
      {availability && !availability.tablesSeeded && (
        <div className="bg-[#090909] border border-[#C9A45C]/40 p-4 text-xs text-[#E6CC91] leading-relaxed">
          Note: Dining tables have not yet been initialized in Firestore by the administrator. Sign in as the authorized owner in the Admin Portal to initialize live tables, or{' '}
          <a
            href={buildGeneralWhatsAppEnquiryUrl(
              settings.whatsappNumber,
              'I would like to book a dining table at ZEXUNA Restaurant.'
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-white"
          >
            book via WhatsApp
          </a>
          .
        </div>
      )}

      {/* Date & Party Size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="res-date" className="block text-xs text-[#B8B8B8] mb-2">
            Reservation Date
          </label>
          <input
            id="res-date"
            type="date"
            required
            min={getTodayDateString()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
          />
        </div>

        <div>
          <label htmlFor="res-guests" className="block text-xs text-[#B8B8B8] mb-2">
            Number of Guests
          </label>
          <div className="relative">
            <Users className="w-4 h-4 text-[#C9A45C] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="res-guests"
              value={guestCount}
              onChange={(e) => setGuestCount(Number(e.target.value))}
              className="w-full pl-10 pr-4 py-3 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
            >
              {Array.from(
                { length: settings.reservationSettings.maxPartySize || 12 },
                (_, idx) => idx + 1
              ).map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? 'Guest' : 'Guests'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Real-time Available Slots */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-[#B8B8B8] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#C9A45C]" />
            Available Time Slots
          </span>
          {availLoading && <span className="text-xs text-[#C9A45C]">Checking availability...</span>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(availability?.slots || []).map((slot) => (
            <button
              key={slot.startTime}
              type="button"
              disabled={!slot.available}
              onClick={() => setStartTime(slot.startTime)}
              className={`px-4 py-3 text-left border transition-colors ${
                startTime === slot.startTime
                  ? 'bg-[#C9A45C] text-[#090909] border-[#C9A45C]'
                  : slot.available
                    ? 'bg-[#090909] text-white border-white/15 hover:border-[#C9A45C]/60'
                    : 'bg-[#090909]/40 text-[#B8B8B8]/40 border-white/5 cursor-not-allowed'
              }`}
            >
              <p className="font-mono text-sm font-semibold tabular-nums">{slot.startTime}</p>
              <p className="text-[11px] mt-0.5 tabular-nums opacity-85">
                {slot.available
                  ? `${slot.availableTables} ${slot.availableTables === 1 ? 'table' : 'tables'} open`
                  : slot.reason || 'Booked'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Guest Information */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="sm:col-span-2">
          <label htmlFor="res-name" className="block text-xs text-[#B8B8B8] mb-2">
            Full Name
          </label>
          <input
            id="res-name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Enter your full name"
            className="w-full px-4 py-3 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
          />
        </div>

        <div>
          <label htmlFor="res-phone" className="block text-xs text-[#B8B8B8] mb-2">
            Phone Number
          </label>
          <input
            id="res-phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 9876543210"
            className="w-full px-4 py-3 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
          />
        </div>

        <div>
          <label htmlFor="res-email" className="block text-xs text-[#B8B8B8] mb-2">
            Email Address
          </label>
          <input
            id="res-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="guest@example.com"
            className="w-full px-4 py-3 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="res-requests" className="block text-xs text-[#B8B8B8] mb-2">
            Special Instructions (Optional)
          </label>
          <textarea
            id="res-requests"
            rows={3}
            maxLength={500}
            value={specialRequests}
            onChange={(e) => setSpecialRequests(e.target.value)}
            placeholder="Anniversary celebration, allergen notes, seating preference..."
            className="w-full px-4 py-3 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
          />
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-950/40 border border-red-500/40 text-xs text-red-300">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !startTime}
        className="w-full py-4 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-widest hover:bg-[#E6CC91] transition-colors disabled:opacity-50"
      >
        {submitting ? 'Securing Table Atomically...' : 'Request Table Reservation'}
      </button>
    </form>
  );
}
