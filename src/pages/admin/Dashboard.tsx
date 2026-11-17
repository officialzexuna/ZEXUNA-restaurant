import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { useRestaurant } from '../../context/RestaurantContext';
import { adminClearDemoMenuItems, adminSeedDemoCatalog } from '../../services/database';
import { getActiveOffers } from '../../utils/pricing';
import type { AdminOutletContext } from './AdminLayout';

export function AdminDashboard() {
  const data = useOutletContext<AdminOutletContext>();
  const { items, seeded, tablesSeeded, refreshCatalog } = useRestaurant();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const activeOffers = getActiveOffers(data.offers);
  const demoCount = items.filter((i) => i.isDemo).length;

  const kpis = [
    { label: 'Total Reservations', value: data.reservations.length },
    { label: "Today's Bookings", value: data.reservations.filter((r) => r.date === today).length },
    { label: 'Pending Bookings', value: data.reservations.filter((r) => r.status === 'PENDING').length },
    { label: 'Confirmed Bookings', value: data.reservations.filter((r) => r.status === 'CONFIRMED').length },
    { label: 'Cancelled Bookings', value: data.reservations.filter((r) => r.status === 'CANCELLED').length },
    { label: 'Total Menu Items', value: items.length },
    { label: 'Active Offers', value: activeOffers.length },
    { label: 'Unavailable Dishes', value: items.filter((i) => !i.available).length },
    { label: 'Customer Enquiries', value: data.enquiries.length },
  ];

  // Build real 7-day reservation distribution
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const count = data.reservations.filter((r) => r.date === dateStr || r.createdAt?.slice(0, 10) === dateStr).length;
    return { date: dateStr.slice(5), count };
  });
  const maxDayCount = Math.max(1, ...last7Days.map((d) => d.count));

  // Popular dishes from initiated orders
  const dishCounts = new Map<string, number>();
  for (const ord of data.orders) {
    for (const line of ord.items || []) {
      dishCounts.set(line.name, (dishCounts.get(line.name) || 0) + (line.quantity || 1));
    }
  }
  const popularDishes = Array.from(dishCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  async function handleSeedDatabase() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminSeedDemoCatalog();
      await refreshCatalog();
      setNotice('Firestore database initialized with categories, dining tables, settings, and demonstration catalog.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Initialization failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleClearDemo() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const removed = await adminClearDemoMenuItems();
      await refreshCatalog();
      setNotice(`Removed ${removed} demonstration dishes. You can now add your live restaurant menu.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear demo dishes');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#C9A45C] mb-1">
            Operations & Analytics
          </p>
          <h1 className="font-display text-3xl text-white">Dashboard Overview</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {(!seeded || !tablesSeeded) && (
            <button
              type="button"
              disabled={busy}
              onClick={handleSeedDatabase}
              className="px-4 py-2.5 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] disabled:opacity-50"
            >
              {busy ? 'Initializing...' : 'Initialize Firestore Catalog & Tables'}
            </button>
          )}
          {seeded && demoCount > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={handleClearDemo}
              className="px-4 py-2.5 border border-[#C9A45C]/50 text-[#E6CC91] text-xs font-semibold uppercase tracking-wider hover:bg-[#1C1C1C] disabled:opacity-50"
            >
              {busy ? 'Removing...' : `Remove Demo Dishes (${demoCount})`}
            </button>
          )}
        </div>
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

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-[#121212] border border-white/10 p-5">
            <p className="text-xs text-[#B8B8B8]">{kpi.label}</p>
            <p className="font-mono text-3xl font-semibold text-[#E6CC91] mt-2 tabular-nums">
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-[#121212] border border-white/10 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-white">7-Day Reservation Activity</h2>
            <span className="text-xs text-[#B8B8B8] tabular-nums">
              {data.reservations.length} total bookings
            </span>
          </div>
          <div className="grid grid-cols-7 gap-3 items-end h-44 pt-4">
            {last7Days.map((day) => {
              const heightPct = Math.round((day.count / maxDayCount) * 100);
              return (
                <div key={day.date} className="flex flex-col items-center gap-2 h-full justify-end">
                  <span className="font-mono text-xs text-[#E6CC91] tabular-nums">{day.count}</span>
                  <div className="w-full bg-[#1C1C1C] flex-1 flex items-end">
                    <div
                      className="w-full bg-[#C9A45C] transition-all"
                      style={{ height: `${Math.max(6, heightPct)}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-[#B8B8B8] tabular-nums">{day.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#121212] border border-white/10 p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-white">Popular Ordered Dishes</h2>
            <Link to="/admin/menu" className="text-xs text-[#C9A45C] hover:text-[#E6CC91]">
              Manage Menu →
            </Link>
          </div>
          {popularDishes.length === 0 ? (
            <p className="text-sm text-[#B8B8B8] py-8">
              WhatsApp order trends will appear here as guests submit orders through the menu.
            </p>
          ) : (
            <div className="space-y-3">
              {popularDishes.map(([dishName, qty]) => (
                <div
                  key={dishName}
                  className="flex items-center justify-between py-2 border-b border-white/10 text-sm"
                >
                  <span className="text-white truncate pr-4">{dishName}</span>
                  <span className="font-mono text-[#E6CC91] tabular-nums">{qty} ordered</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Audit Trail */}
      <div className="bg-[#121212] border border-white/10 p-6 space-y-4">
        <h2 className="font-display text-xl text-white">Recent Audit Log</h2>
        {data.auditLogs.length === 0 ? (
          <p className="text-xs text-[#B8B8B8]">No administrative actions recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[#B8B8B8]">
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Entity</th>
                  <th className="py-2 pr-4">Details</th>
                  <th className="py-2">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {data.auditLogs.slice(0, 8).map((log) => (
                  <tr key={log.logId} className="border-b border-white/5">
                    <td className="py-2.5 pr-4 font-mono text-[#E6CC91]">{log.action}</td>
                    <td className="py-2.5 pr-4 text-white">
                      {log.entityType} ({log.entityId})
                    </td>
                    <td className="py-2.5 pr-4 text-[#B8B8B8]">{log.details || '-'}</td>
                    <td className="py-2.5 font-mono text-[#B8B8B8] tabular-nums">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
