import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';

const FAQ_ITEMS = [
  {
    q: 'How does online table reservation confirmation work?',
    a: 'When you submit a reservation on our website or through the ZEXUNA AI Restaurant Assistant, we atomically lock an available table matching your party size and issue a unique reference code with PENDING status. Our hospitality administrator reviews and confirms your booking, which you can track live on the Reservation Status page.',
  },
  {
    q: 'How does ordering via WhatsApp work?',
    a: 'Add any available dishes from our Digital Menu to your Order Summary, select Delivery or Pickup, and enter your contact details. We calculate prices and active offer discounts directly from our database, display the exact message for your review, and open WhatsApp to send it to +91 9999988787. Orders are confirmed only once acknowledged by our restaurant team.',
  },
  {
    q: 'Are active offers like The Great Biryani Price Drop automatically applied?',
    a: 'Yes. Active non-expired promotional campaigns from our database are automatically evaluated against eligible dishes. Expired offers are automatically hidden and excluded from pricing.',
  },
  {
    q: 'Do you offer vegetarian biryani and allergen information?',
    a: 'Yes. Every dish in our Digital Menu indicates Vegetarian or Non-Vegetarian status and lists known allergens such as Dairy, Tree Nuts, Gluten, Soy, or Sesame.',
  },
  {
    q: 'How can I request cancellation for a table reservation?',
    a: 'Visit the Reservation Status page, enter your reference code (such as ZXN-XXXXXX), and click Request Cancellation. Our admin team will process the cancellation and release the table slot.',
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
      <div className="border-b border-white/10 pb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C] mb-2">
          Guest Guide
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white">
          Frequently Asked Questions
        </h1>
      </div>

      <div className="space-y-3">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={item.q} className="bg-[#121212] border border-white/10">
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full px-6 py-5 flex items-center justify-between gap-4 text-left"
              >
                <span className="font-display text-lg text-white">{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#C9A45C] shrink-0 transition-transform ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-6 pb-6 text-sm text-[#B8B8B8] leading-relaxed border-t border-white/5 pt-4">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-[#121212] border border-[#C9A45C]/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p className="text-sm text-[#B8B8B8]">
          Have a specific dietary or private event question?
        </p>
        <Link
          to="/contact"
          className="px-5 py-2.5 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
        >
          Contact Concierge
        </Link>
      </div>
    </div>
  );
}
