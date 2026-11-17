import { useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { adminUpdateEnquiryStatus } from '../../services/database';
import type { ContactEnquiry } from '../../types/restaurant';
import type { AdminOutletContext } from './AdminLayout';

export function CustomerManagement() {
  const data = useOutletContext<AdminOutletContext>();
  const [search, setSearch] = useState('');

  const bookingCountByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    data.reservations.forEach((r) => {
      map.set(r.customerId, (map.get(r.customerId) || 0) + 1);
    });
    return map;
  }, [data.reservations]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.customers;
    return data.customers.filter((c) =>
      `${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(q)
    );
  }, [data.customers, search]);

  async function handleEnquiryStatus(enq: ContactEnquiry, status: ContactEnquiry['status']) {
    await adminUpdateEnquiryStatus(enq.enquiryId, status);
  }

  return (
    <div className="space-y-10">
      <div className="border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.2em] text-[#C9A45C] mb-1">
          Guest Directory & Inbox
        </p>
        <h1 className="font-display text-3xl text-white">Customer Management</h1>
      </div>

      {/* Customer Search & Table */}
      <div className="bg-[#121212] border border-white/10 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-display text-xl text-white">
            Guest Profiles ({filteredCustomers.length})
          </h2>
          <input
            type="search"
            aria-label="Search customers"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, email..."
            className="w-full sm:w-72 px-3.5 py-2 bg-[#090909] border border-white/15 text-sm text-white"
          />
        </div>

        {filteredCustomers.length === 0 ? (
          <p className="text-sm text-[#B8B8B8]">No customer records found yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[#B8B8B8]">
                  <th className="py-2.5 pr-4">Name</th>
                  <th className="py-2.5 pr-4">Phone</th>
                  <th className="py-2.5 pr-4">Email</th>
                  <th className="py-2.5 text-right">Bookings</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c) => (
                  <tr key={c.customerId} className="border-b border-white/5">
                    <td className="py-3 pr-4 font-medium text-white">{c.name}</td>
                    <td className="py-3 pr-4 font-mono text-[#E6CC91]">{c.phone}</td>
                    <td className="py-3 pr-4 text-[#B8B8B8]">{c.email}</td>
                    <td className="py-3 text-right font-mono tabular-nums text-white">
                      {bookingCountByCustomer.get(c.customerId) || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Contact Enquiries */}
      <div className="bg-[#121212] border border-white/10 p-6 space-y-4">
        <h2 className="font-display text-xl text-white">
          Contact Enquiries ({data.enquiries.length})
        </h2>
        {data.enquiries.length === 0 ? (
          <p className="text-sm text-[#B8B8B8]">No customer enquiries submitted yet.</p>
        ) : (
          <div className="space-y-3">
            {data.enquiries.map((enq) => (
              <div
                key={enq.enquiryId}
                className="bg-[#090909] border border-white/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-[#B8B8B8]">
                    <span className="font-mono text-[#E6CC91]">{enq.status}</span>
                    <span>·</span>
                    <span>{enq.name}</span>
                    <span>·</span>
                    <span>{enq.email}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-white">{enq.subject}</h3>
                  <p className="text-xs text-[#B8B8B8]">{enq.message}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {enq.status !== 'RESOLVED' && (
                    <button
                      type="button"
                      onClick={() => void handleEnquiryStatus(enq, 'RESOLVED')}
                      className="px-3 py-1.5 border border-[#C9A45C]/40 text-xs text-[#E6CC91]"
                    >
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
