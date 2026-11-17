import { MessageCircle } from 'lucide-react';
import { useRestaurant } from '../context/RestaurantContext';
import { buildGeneralWhatsAppEnquiryUrl } from '../services/whatsapp';

export function WhatsAppButton() {
  const { settings } = useRestaurant();
  const url = buildGeneralWhatsAppEnquiryUrl(
    settings.whatsappNumber,
    'Hello ZEXUNA Restaurant! I have a question regarding ordering or table reservations.'
  );

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with ZEXUNA Restaurant on WhatsApp"
      className="fixed bottom-4 right-4 z-40 inline-flex items-center justify-center gap-2 px-3 sm:px-4 h-10 sm:h-11 bg-[#121212]/95 border border-[#C9A45C]/60 text-[#E6CC91] text-xs font-semibold tracking-wider uppercase shadow-lg hover:bg-[#C9A45C] hover:text-[#090909] transition-colors"
    >
      <MessageCircle className="w-4 h-4 shrink-0" />
      <span className="hidden sm:inline whitespace-nowrap">WhatsApp</span>
    </a>
  );
}
