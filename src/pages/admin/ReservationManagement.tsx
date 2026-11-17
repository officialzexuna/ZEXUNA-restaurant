import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { adminUpdateReservationStatus } from '../../services/reservations';
import type { Reservation, ReservationStatus } from '../../types/restaurant';
import type { AdminOutletContext } from './AdminLayout';

export function ReservationManagement() {
  const data = useOutletContext<AdminOutletContext>();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReservationStatus>('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return data.reservations.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (dateFilter && r.date !== dateFilter) return false;
      if (q) {
        const hay = `${r.referenceCode} ${r.customerName} ${r.phone} ${r.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [data.reservations, search, statusFilter, dateFilter]);

  async function handleStatusAction(res: Reservation, nextStatus: ReservationStatus) {
    setBusyId(res.reservationId);
    setError(null);
    setFeedback(null);
    try {
      const result = await adminUpdateReservationStatus(res.reservationId, nextStatus);
      const emailNote = result.notificationResult
        ? ` · Email notification: ${result.notificationResult.status}`
        : '';
      setFeedback(`Reservation ${res.referenceCode} updated to ${nextStatus}${emailNote}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status update failed');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div className="border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#C9A45C] mb-1">
          Floor & Booking Operations
        </p>
        <h1 className="font-display text-3xl text-white">Reservation Management</h1>
      </div>

      {feedback && (
        <div className="p-4 bg-[#121212] border border-[#C9A45C]/50 text-xs text-[#E6CC91]">
          {feedback}
        </div>
      )}
      {error && (
        <div role="alert" className="p-4 bg-red-950/40 border border-red-500/40 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-[#121212] border border-white/10 p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="admin-res-search" className="block text-xs text-[#B8B8B8] mb-1">
            Search guest or reference
          </label>
          <input
            id="admin-res-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ZXN-..., name, phone, email"
            className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 text-sm text-white"
          />
        </div>
        <div>
          <label htmlFor="admin-res-status" className="block text-xs text-[#B8B8B8] mb-1">
            Status
          </label>
          <select
            id="admin-res-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | ReservationStatus)}
            className="w-full px-3.5 py-2 bg-[#090909] border border-white/15 text-sm text-white"
          >
            <option value="ALL">All statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="NO_SHOW">NO_SHOW</option>
          </select>
        </div>
        <div>
          <label htmlFor="admin-res-date" className="block text-xs text-[#B8B8B8] mb-1">
            Filter by Date
          </label>
          <div className="flex gap-2">
            <input
              id="admin-res-date"
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="flex-1 px-3.5 py-2 bg-[#090909] border border-white/15 text-sm text-white"
            />
            {dateFilter && (
              <button
                type="button"
                onClick={() => setDateFilter('')}
                className="px-3 py-2 border border-white/15 text-xs text-[#B8B8B8]"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Reservations List */}
      {filtered.length === 0 ? (
        <div className="bg-[#121212] border border-white/10 p-10 text-center text-sm text-[#B8B8B8]">
          No reservations match your current filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((res) => (
            <div
              key={res.reservationId}
              className="bg-[#121212] border border-white/10 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <span className="font-mono font-semibold text-[#E6CC91]">{res.referenceCode}</span>
                  <span>·</span>
                  <span className="font-mono text-white">{res.status}</span>
                  <span>·</span>
                  <span className="font-mono text-[#B8B8B8] tabular-nums">
                    {res.date} {res.startTime}–{res.endTime}
                  </span>
                  <span>·</span>
                  <span className="tabular-nums text-white">{res.guestCount} guests</span>
                </div>
                <h2 className="text-base font-semibold text-white">
                  {res.customerName}{' '}
                  <span className="text-xs font-normal text-[#B8B8B8]">
                    ({res.phone} · {res.email})
                  </span>
                </h2>
                {res.specialRequests && (
                  <p className="text-xs text-[#E6CC91]">Special Request: {res.specialRequests}</p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {res.status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === res.reservationId}
                      onClick={() => void handleStatusAction(res, 'CONFIRMED')}
                      className="px-3.5 py-2 bg-emerald-600 text-white text-xs font-semibold uppercase tracking-wider hover:bg-emerald-500 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={busyId === res.reservationId}
                      onClick={() => void handleStatusAction(res, 'REJECTED')}
                      className="px-3.5 py-2 border border-red-500/50 text-red-300 text-xs font-semibold uppercase tracking-wider hover:bg-red-950/40 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                {res.status === 'CONFIRMED' && (
                  <>
                    <button
                      type="button"
                      disabled={busyId === res.reservationId}
                      onClick={() => void handleStatusAction(res, 'COMPLETED')}
                      className="px-3.5 py-2 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] disabled:opacity-50"
                    >
                      Complete
                    </button>
                    <button
                      type="button"
                      disabled={busyId === res.reservationId}
                      onClick={() => void handleStatusAction(res, 'NO_SHOW')}
                      className="px-3.5 py-2 border border-white/20 text-[#B8B8B8] text-xs font-semibold uppercase tracking-wider hover:text-white disabled:opacity-50"
                    >
                      No-Show
                    </button>
                  </>
                )}
                {['PENDING', 'CONFIRMED'].includes(res.status) && (
                  <button
                    type="button"
                    disabled={busyId === res.reservationId}
                    onClick={() => void handleStatusAction(res, 'CANCELLED')}
                    className="px-3.5 py-2 border border-white/20 text-xs text-[#B8B8B8] hover:text-red-300 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
