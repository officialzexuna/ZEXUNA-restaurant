import { Link } from 'react-router-dom';
import { ReservationForm } from '../components/ReservationForm';
import { useRestaurant } from '../context/RestaurantContext';
import { buildGeneralWhatsAppEnquiryUrl } from '../services/whatsapp';

export function Reservations() {
  const { settings } = useRestaurant();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-white/10 pb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C] mb-2">
            Real-Time Table Inventory
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white">
            Table Reservation
          </h1>
          <p className="text-sm text-[#B8B8B8] mt-3 max-w-2xl">
            Every booking checks live dining room capacity and secures your table atomically to prevent double bookings. Bookings start as PENDING until confirmed by our hospitality desk.
          </p>
        </div>

        <Link
          to="/reservation-status"
          className="px-5 py-3 border border-[#C9A45C]/50 text-[#E6CC91] text-xs font-semibold uppercase tracking-wider hover:bg-[#1C1C1C] whitespace-nowrap shrink-0"
        >
          Check Existing Booking
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-8">
          <ReservationForm />
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-[#121212] border border-white/10 p-6 space-y-4">
            <h2 className="font-display text-xl text-white">Opening Hours</h2>
            <div className="space-y-2 text-xs">
              {Object.entries(settings.openingHours).map(([day, sched]) => (
                <div
                  key={day}
                  className="flex items-center justify-between py-1.5 border-b border-white/5 capitalize"
                >
                  <span className="text-[#B8B8B8]">{day}</span>
                  <span className="font-mono text-white tabular-nums">
                    {sched.closed ? 'Closed' : `${sched.open} – ${sched.close}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#121212] border border-[#C9A45C]/30 p-6 space-y-4">
            <h2 className="font-display text-xl text-white">Private Dining & Large Groups</h2>
            <p className="text-xs text-[#B8B8B8] leading-relaxed">
              Planning a celebration for more than {settings.reservationSettings.maxPartySize} guests or bespoke tasting menu? Message our concierge directly on WhatsApp.
            </p>
            <a
              href={buildGeneralWhatsAppEnquiryUrl(
                settings.whatsappNumber,
                'Hello ZEXUNA Restaurant! I would like to book a table / private dining experience.'
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 bg-[#1C1C1C] border border-[#C9A45C]/50 text-center text-xs font-semibold uppercase tracking-wider text-[#E6CC91] hover:bg-[#C9A45C] hover:text-[#090909] transition-colors"
            >
              Book via WhatsApp
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}
