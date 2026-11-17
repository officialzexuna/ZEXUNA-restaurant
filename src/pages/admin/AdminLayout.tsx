import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Settings as SettingsIcon,
  Tag,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { ASSETS } from '../../data/demoSeed';
import { LoadingScreen } from '../../components/Loading';
import { useRestaurant } from '../../context/RestaurantContext';
import { signOutAdmin } from '../../services/authentication';
import {
  subscribeAdminCollections,
  type AdminRealtimeCollections,
} from '../../services/database';

export interface AdminOutletContext extends AdminRealtimeCollections {}

const EMPTY_ADMIN_DATA: AdminRealtimeCollections = {
  reservations: [],
  customers: [],
  enquiries: [],
  orders: [],
  offers: [],
  tables: [],
  auditLogs: [],
  notifications: [],
  subscribers: [],
};

const NAV_ITEMS = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/menu', label: 'Menu Management', icon: UtensilsCrossed, end: false },
  { to: '/admin/offers', label: 'Offer Management', icon: Tag, end: false },
  { to: '/admin/reservations', label: 'Reservations', icon: CalendarCheck, end: false },
  { to: '/admin/customers', label: 'Customers & Enquiries', icon: Users, end: false },
  { to: '/admin/settings', label: 'Restaurant Settings', icon: SettingsIcon, end: false },
];

export function AdminLayout() {
  const { authReady, isAdmin, adminProfile } = useRestaurant();
  const location = useLocation();
  const [adminData, setAdminData] = useState<AdminRealtimeCollections>(EMPTY_ADMIN_DATA);

  useEffect(() => {
    if (!authReady || !isAdmin) return;
    const unsub = subscribeAdminCollections((partial) => {
      setAdminData((prev) => ({ ...prev, ...partial }));
    });
    return () => unsub();
  }, [authReady, isAdmin]);

  if (!authReady) {
    return <LoadingScreen label="Verifying administrator credentials" />;
  }

  if (!isAdmin) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return (
    <div className="min-h-screen bg-[#090909] text-white flex flex-col lg:flex-row">
      {/* Sidebar */}
      <aside className="lg:w-64 shrink-0 bg-[#121212] border-b lg:border-b-0 lg:border-r border-[#C9A45C]/25 flex flex-col">
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={ASSETS.logo} alt="ZEXUNA Logo" className="w-8 h-8 object-contain" />
            <div>
              <p className="font-display text-sm font-semibold text-white">ZEXUNA Admin</p>
              <p className="text-[11px] text-[#C9A45C]">{adminProfile?.role || 'OWNER'}</p>
            </div>
          </Link>
        </div>

        <nav aria-label="Admin Modules" className="flex lg:flex-col overflow-x-auto p-3 gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#C9A45C] text-[#090909]'
                      : 'text-[#B8B8B8] hover:text-white hover:bg-[#1C1C1C]'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 hidden lg:block space-y-3">
          <div className="text-xs">
            <p className="text-white font-medium truncate">{adminProfile?.displayName}</p>
            <p className="text-[#B8B8B8] truncate">{adminProfile?.email}</p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/"
              className="flex-1 py-2 text-center border border-white/15 text-[11px] text-[#E6CC91] hover:border-[#C9A45C]"
            >
              Public Site
            </Link>
            <button
              type="button"
              onClick={() => void signOutAdmin()}
              className="px-3 py-2 border border-white/15 text-[11px] text-[#B8B8B8] hover:text-white inline-flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 sm:p-8 lg:p-10">
        <Outlet context={adminData} />
      </main>
    </div>
  );
}
