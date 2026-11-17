import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useRestaurant } from '../context/RestaurantContext';
import { buildGeneralWhatsAppEnquiryUrl } from '../services/whatsapp';

export function Contact() {
  const { settings } = useRestaurant();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedId, setSubmittedId] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const resp = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, subject, message }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Unable to submit enquiry');
      setSubmittedId(data.enquiryId);
      setName('');
      setPhone('');
      setEmail('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-12">
      <div className="border-b border-white/10 pb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-[#C9A45C] mb-2">
          Concierge & Private Catering
        </p>
        <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white">
          Contact Us
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#121212] border border-white/10 p-6 space-y-4 text-sm">
            <h2 className="font-display text-xl text-white">Restaurant Details</h2>
            <div>
              <p className="text-xs text-[#B8B8B8]">Address</p>
              <p className="text-white mt-0.5">{settings.address}</p>
            </div>
            <div>
              <p className="text-xs text-[#B8B8B8]">Telephone & WhatsApp</p>
              <p className="font-mono text-[#E6CC91] mt-0.5">{settings.whatsappNumber}</p>
            </div>
            <div>
              <p className="text-xs text-[#B8B8B8]">Email</p>
              <p className="text-white mt-0.5">{settings.email}</p>
            </div>
          </div>

          <div className="bg-[#121212] border border-[#C9A45C]/30 p-6 space-y-4">
            <h2 className="font-display text-xl text-white">Direct WhatsApp Channels</h2>
            <p className="text-xs text-[#B8B8B8] leading-relaxed">
              Reach our hospitality team immediately for takeout orders, custom biryani trays, or corporate catering enquiries.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href={buildGeneralWhatsAppEnquiryUrl(
                  settings.whatsappNumber,
                  'Hello ZEXUNA Restaurant! I have a general dining enquiry.'
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-3 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>General WhatsApp Enquiry</span>
              </a>
              <a
                href={buildGeneralWhatsAppEnquiryUrl(
                  settings.whatsappNumber,
                  'Hello ZEXUNA Restaurant! I would like to request catering details for an upcoming event.'
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 py-3 border border-[#C9A45C]/50 text-[#E6CC91] text-xs font-semibold uppercase tracking-wider hover:bg-[#1C1C1C]"
              >
                <span>Catering Enquiry on WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-[#121212] border border-white/10 p-6 sm:p-10">
          <h2 className="font-display text-2xl text-white mb-6">Send a Message</h2>

          {submittedId ? (
            <div className="bg-[#090909] border border-[#C9A45C]/40 p-6 space-y-4">
              <p className="text-xs uppercase tracking-wider text-[#C9A45C]">
                Enquiry Recorded · {submittedId}
              </p>
              <p className="text-sm text-white">
                Thank you for contacting ZEXUNA Restaurant. Your message has been saved to our hospitality inbox.
              </p>
              <button
                type="button"
                onClick={() => setSubmittedId(null)}
                className="px-5 py-2.5 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider"
              >
                Send Another Enquiry
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="contact-name" className="block text-xs text-[#B8B8B8] mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>
                <div>
                  <label htmlFor="contact-phone" className="block text-xs text-[#B8B8B8] mb-1.5">
                    Phone Number
                  </label>
                  <input
                    id="contact-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-email" className="block text-xs text-[#B8B8B8] mb-1.5">
                  Email Address
                </label>
                <input
                  id="contact-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                />
              </div>

              <div>
                <label htmlFor="contact-subject" className="block text-xs text-[#B8B8B8] mb-1.5">
                  Subject
                </label>
                <input
                  id="contact-subject"
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Catering, private dining, allergen question..."
                  className="w-full px-4 py-3 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                />
              </div>

              <div>
                <label htmlFor="contact-message" className="block text-xs text-[#B8B8B8] mb-1.5">
                  Message
                </label>
                <textarea
                  id="contact-message"
                  rows={4}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 bg-[#090909] border border-white/15 text-sm text-white focus:outline-none focus:border-[#C9A45C]"
                />
              </div>

              {error && (
                <p role="alert" className="text-xs text-red-400">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-[#C9A45C] text-[#090909] text-xs font-semibold uppercase tracking-wider hover:bg-[#E6CC91] transition-colors disabled:opacity-50"
              >
                {submitting ? 'Submitting Enquiry...' : 'Submit Enquiry'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
