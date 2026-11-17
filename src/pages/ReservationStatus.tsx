import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  lookupReservationStatus,
  requestReservationCancellation,
} from '../services/reservations';
import type { ReservationStatusView } from '../types/restaurant';

const STATUS_BADGE_MAP: Record<string, string> = {
  PENDING: 'text-[#E6CC91] border-[#C9A45C]/50',
  CONFIRMED: 'text-emerald-400 border-emerald-500/40',
  COMPLETED: 'text-white border-white/30',
  REJECTED: 'text-red-400 border-red-500/40',
  CANCELLED: 'text-red-400 border-red-500/40',
  NO_SHOW: 'text-[#B8B8B8] border-white/20',
};

export function ReservationStatus() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialRef = searchParams.get('ref') || '';
  const [refInput, setRefInput] = useState(initialRef);
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [record, setRecord] = useState<ReservationStatusView | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  async function runLookup(code: string) {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setCancelNotice(null);
    try {
      const data = await lookupReservationStatus(clean);
      setRecord(data);
    } catch (err) {
      setRecord(null);
      setError(err instanceof Error ? err.message : 'Reservation not found');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialRef) {
      void runLookup(initialRef);
    }
  }, [initialRef]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const clean = refInput.trim().toUpperCase();
    setSearchParams(clean ? { ref: clean } : {});
    void runLookup(clean);
  }

  async function handleRequestCancel() {
    if (!record) return;
    setCancelling(true);
    setError(null);
    try {
      await requestReservationCancellation(record.referenceCode);
      setRecord({ ...record, cancellationRequested: true });
      setCancelNotice(
        'Your cancellation request has been recorded and sent to the restaurant administrator.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit cancellation request');
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="border-b border-white/10 pb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C] mb-2">
          Live Booking Tracker
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white">
          Reservation Status
        </h1>
        <p className="text-sm text-[#B8B8B8] mt-3">
          Enter your unique ZEXUNA reference code (for example, <span className="font-mono text-white">ZXN-XXXXXX</span>) to view live confirmation status or request cancellation.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <label htmlFor="ref-code-input" className="sr-only">
          Reservation Reference Code
        </label>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#B8B8B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="ref-code-input"
            type="text"
            required
            value={refInput}
            onChange={(e) => setRefInput(e.target.value.toUpperCase())}
            placeholder="ZXN-XXXXXX"
            className="w-full pl-10 pr-4 py-3 bg-[#121212] border border-white/15 font-mono text-sm text-white uppercase focus:outline-none focus:border-[#C9A45C]"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-7 py-3 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] transition-colors disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check Status'}
        </button>
      </form>

      {error && (
        <div role="alert" className="p-4 bg-red-950/40 border border-red-500/40 text-xs text-red-300">
          {error}
        </div>
      )}

      {record && (
        <div className="bg-[#121212] border border-[#C9A45C]/40 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <p className="text-xs text-[#B8B8B8]">Reference Code</p>
              <h2 className="font-mono text-2xl font-semibold text-white mt-0.5">
                {record.referenceCode}
              </h2>
            </div>
            <span
              className={`px-3.5 py-1.5 border font-mono text-xs font-semibold uppercase ${
                STATUS_BADGE_MAP[record.status] || 'text-white border-white/20'
              }`}
            >
              {record.status}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm">
            <div>
              <p className="text-xs text-[#B8B8B8]">Date</p>
              <p className="font-mono text-white mt-1 tabular-nums">{record.date}</p>
            </div>
            <div>
              <p className="text-xs text-[#B8B8B8]">Time Slot</p>
              <p className="font-mono text-white mt-1 tabular-nums">
                {record.startTime} – {record.endTime}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#B8B8B8]">Party Size & Table</p>
              <p className="font-mono text-white mt-1 tabular-nums">
                {record.guestCount} Guests {record.tableNumber ? `· ${record.tableNumber}` : ''}
              </p>
            </div>
          </div>

          {record.cancellationRequested && (
            <div className="p-3.5 bg-[#090909] border border-[#C9A45C]/40 text-xs text-[#E6CC91]">
              Cancellation requested — awaiting final administrator release.
            </div>
          )}

          {cancelNotice && (
            <div className="p-3.5 bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300">
              {cancelNotice}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            {['PENDING', 'CONFIRMED'].includes(record.status) && !record.cancellationRequested && (
              <button
                type="button"
                disabled={cancelling}
                onClick={handleRequestCancel}
                className="px-5 py-2.5 border border-red-500/50 text-red-300 text-xs font-semibold uppercase tracking-wider hover:bg-red-950/40 transition-colors disabled:opacity-50"
              >
                {cancelling ? 'Submitting...' : 'Request Cancellation'}
              </button>
            )}
            <Link
              to="/reservations"
              className="text-xs font-semibold uppercase tracking-wider text-[#C9A45C] hover:text-[#E6CC91]"
            >
              Book a New Table →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
