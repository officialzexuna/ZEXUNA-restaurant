import { useEffect } from 'react';
import { BrowserRouter, Link, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Chatbot } from './components/Chatbot';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { OrderDrawer } from './components/OrderDrawer';
import { WhatsAppButton } from './components/WhatsAppButton';
import { RestaurantProvider, useRestaurant } from './context/RestaurantContext';
import { About } from './pages/About';
import { AdminLogin } from './pages/AdminLogin';
import { Categories } from './pages/Categories';
import { Contact } from './pages/Contact';
import { FAQ } from './pages/FAQ';
import { FoodDetails } from './pages/FoodDetails';
import { Gallery } from './pages/Gallery';
import { Home } from './pages/Home';
import { PrivacyPolicy, TermsAndConditions } from './pages/Legal';
import { Menu } from './pages/Menu';
import { Offers } from './pages/Offers';
import { Reservations } from './pages/Reservations';
import { ReservationStatus } from './pages/ReservationStatus';
import { AdminLayout } from './pages/admin/AdminLayout';
import { CustomerManagement } from './pages/admin/CustomerManagement';
import { AdminDashboard } from './pages/admin/Dashboard';
import { MenuManagement } from './pages/admin/MenuManagement';
import { OfferManagement } from './pages/admin/OfferManagement';
import { ReservationManagement } from './pages/admin/ReservationManagement';
import { AdminSettings } from './pages/admin/Settings';

const ROUTE_META: Array<{ match: (pathname: string) => boolean; title: string; description: string }> = [
  {
    match: (p) => p === '/',
    title: 'ZEXUNA Restaurant — Where Flavour Meets Perfection',
    description:
      'Experience ZEXUNA Restaurant: slow-cooked royal dum biryani, online table reservations, WhatsApp ordering, and AI dining concierge — Technology Without Limits.',
  },
  {
    match: (p) => p === '/about',
    title: 'About ZEXUNA Restaurant — Technology Without Limits.',
    description:
      'Discover the craft, heritage spices, and full-stack restaurant platform built by ZEXUNA.',
  },
  {
    match: (p) => p === '/menu',
    title: 'Digital Menu — ZEXUNA Restaurant',
    description:
      'Explore slow-cooked dum biryanis, artisan starters, signature mains, desserts, and beverages with live database pricing.',
  },
  {
    match: (p) => p === '/categories',
    title: 'Menu Categories — ZEXUNA Restaurant',
    description:
      'Browse all ten culinary collections curated by ZEXUNA Restaurant.',
  },
  {
    match: (p) => p.startsWith('/food/'),
    title: 'Dish Details — ZEXUNA Restaurant',
    description:
      'View dish ingredients, preparation notes, allergen tags, live pricing, and direct WhatsApp ordering.',
  },
  {
    match: (p) => p === '/offers',
    title: 'The Great Biryani Price Drop! — ZEXUNA Offers',
    description:
      'Special limited-time dining campaigns and price-drop promotions at ZEXUNA Restaurant.',
  },
  {
    match: (p) => p === '/gallery',
    title: 'Culinary & Dining Gallery — ZEXUNA Restaurant',
    description:
      'A visual showcase of ZEXUNA signature dum biryanis, spices, plated dishes, and private dining atmosphere.',
  },
  {
    match: (p) => p === '/reservations',
    title: 'Reserve a Table — ZEXUNA Restaurant',
    description:
      'Check real-time seating availability and book your table atomically at ZEXUNA Restaurant.',
  },
  {
    match: (p) => p === '/reservation-status',
    title: 'Check Reservation Status — ZEXUNA Restaurant',
    description:
      'Verify your table booking status or request cancellation using your unique ZEXUNA reference code.',
  },
  {
    match: (p) => p === '/contact',
    title: 'Contact & Enquiries — ZEXUNA Restaurant',
    description:
      'Reach ZEXUNA Restaurant via WhatsApp, email, or direct hospitality enquiry form.',
  },
  {
    match: (p) => p === '/faq',
    title: 'Frequently Asked Questions — ZEXUNA Restaurant',
    description:
      'Answers on online table reservations, WhatsApp ordering, catering enquiries, and dietary options.',
  },
  {
    match: (p) => p === '/privacy-policy',
    title: 'Privacy Policy — ZEXUNA Restaurant',
    description: 'Data protection and privacy practices for ZEXUNA Restaurant guests.',
  },
  {
    match: (p) => p === '/terms-and-conditions' || p === '/terms',
    title: 'Terms & Conditions — ZEXUNA Restaurant',
    description: 'Reservation, cancellation, and digital ordering terms at ZEXUNA Restaurant.',
  },
  {
    match: (p) => p === '/admin/login',
    title: 'Admin Sign-In — ZEXUNA Restaurant',
    description: 'Authorized Google Sign-In portal for ZEXUNA Restaurant administrators.',
  },
  {
    match: (p) => p.startsWith('/admin'),
    title: 'Admin Console — ZEXUNA Restaurant',
    description: 'Live menu, offers, reservations, customers, and settings console for ZEXUNA Restaurant.',
  },
];

function RouteManager() {
  const { pathname } = useLocation();
  const { settings } = useRestaurant();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });

    const entry = ROUTE_META.find((r) => r.match(pathname)) ?? ROUTE_META[0];
    document.title = entry.title.replace('ZEXUNA Restaurant', settings.restaurantName || 'ZEXUNA Restaurant');

    const descEl = document.querySelector('meta[name="description"]');
    if (descEl) {
      descEl.setAttribute('content', entry.description);
    }

    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.rel = 'canonical';
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = `${window.location.origin}${pathname}`;
  }, [pathname, settings.restaurantName]);

  return null;
}

function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-[#090909] text-white">
      <Navbar />
      <main id="main-content" className="flex-1 pb-16 sm:pb-0">
        <Outlet />
      </main>
      <Footer />
      <OrderDrawer />
      <WhatsAppButton />
      <Chatbot />
    </div>
  );
}

function NotFoundPage() {
  return (
    <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center space-y-6">
      <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C]">404 · Page Not Found</p>
      <h1 className="font-display text-4xl sm:text-5xl font-semibold text-white">
        This page is not on tonight&apos;s menu
      </h1>
      <p className="text-sm sm:text-base text-[#B8B8B8] max-w-xl mx-auto">
        The route you requested could not be found. Return to our signature showcase or browse our live digital menu.
      </p>
      <div className="flex flex-wrap justify-center gap-4 pt-2">
        <Link
          to="/"
          className="px-6 py-3 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] transition-colors"
        >
          Return Home
        </Link>
        <Link
          to="/menu"
          className="px-6 py-3 border border-[#C9A45C]/50 text-[#E6CC91] text-xs font-semibold uppercase tracking-wider hover:bg-[#1C1C1C] transition-colors"
        >
          Explore Menu
        </Link>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <RestaurantProvider>
        <BrowserRouter>
          <RouteManager />
          <Routes>
            <Route element={<PublicLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/menu" element={<Menu />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/food/:id" element={<FoodDetails />} />
              <Route path="/offers" element={<Offers />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/reservations" element={<Reservations />} />
              <Route path="/reservation-status" element={<ReservationStatus />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            <Route path="/admin/login" element={<AdminLogin />} />

            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="menu" element={<MenuManagement />} />
              <Route path="offers" element={<OfferManagement />} />
              <Route path="reservations" element={<ReservationManagement />} />
              <Route path="customers" element={<CustomerManagement />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </RestaurantProvider>
    </ErrorBoundary>
  );
}
