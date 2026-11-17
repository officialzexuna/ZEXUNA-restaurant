import { useRestaurant } from '../context/RestaurantContext';

export function PrivacyPolicy() {
  const { settings } = useRestaurant();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
      <div className="border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C] mb-2">Legal & Data Protection</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white">Privacy Policy</h1>
      </div>

      <div className="space-y-6 text-sm text-[#B8B8B8] leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-display text-xl text-white">1. Information We Collect</h2>
          <p>
            {settings.restaurantName} collects only the information necessary to fulfill table reservations, WhatsApp order enquiries, and customer support messages — specifically your full name, phone number, email address, party size, and dining preferences.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-xl text-white">2. Database Isolation & Access Control</h2>
          <p>
            Customer profiles, reservation PII, enquiries, and order histories are stored in Google Cloud Firestore protected by strict security rules. Public lookup routes expose only non-identifying booking status by reference code, never personal contact information.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-xl text-white">3. Marketing Consent & Cookies</h2>
          <p>
            Newsletter updates are strictly opt-in via explicit consent. Essential session storage is used solely for authentication and shopping cart state, with no third-party advertising trackers.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-xl text-white">4. Contact for Data Requests</h2>
          <p>
            To update or delete your guest record, reach our hospitality team at {settings.email} or WhatsApp {settings.whatsappNumber}.
          </p>
        </section>
      </div>
    </div>
  );
}

export function TermsAndConditions() {
  const { settings } = useRestaurant();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-8">
      <div className="border-b border-white/10 pb-6">
        <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C] mb-2">Hospitality Policies</p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white">
          Terms & Conditions
        </h1>
      </div>

      <div className="space-y-6 text-sm text-[#B8B8B8] leading-relaxed">
        <section className="space-y-2">
          <h2 className="font-display text-xl text-white">1. Table Reservation Policy</h2>
          <p>
            Online reservations initially enter a PENDING state while a table slot is reserved atomically. Final confirmation is issued by {settings.restaurantName} staff. Tables are held for {settings.reservationSettings.slotDurationMinutes} minutes per seating.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-xl text-white">2. Cancellation Policy</h2>
          <p>
            Guests may request a reservation cancellation anytime via the Reservation Status page using their unique reference code, or by messaging {settings.whatsappNumber} on WhatsApp.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-xl text-white">3. WhatsApp Ordering & Dynamic Pricing</h2>
          <p>
            Prices and promotional discounts displayed on our Digital Menu are synchronized with our live database. Submitting an order summary opens WhatsApp with your pre-filled order request; opening WhatsApp does not constitute order acceptance or payment until confirmed by {settings.restaurantName}.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display text-xl text-white">4. Promotional Offers</h2>
          <p>
            Campaigns such as The Great Biryani Price Drop apply strictly within their active start and expiration windows and are subject to dish availability.
          </p>
        </section>
      </div>
    </div>
  );
}
