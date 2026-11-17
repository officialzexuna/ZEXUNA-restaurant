export const VOLUMETRIC_LIMITS = {
  ID_MAX: 128,
  ID_REGEX: /^[a-zA-Z0-9_-]+$/,
  NAME_MIN: 2,
  NAME_MAX: 120,
  EMAIL_MAX: 200,
  PHONE_MIN: 6,
  PHONE_MAX: 30,
  SUBJECT_MIN: 2,
  SUBJECT_MAX: 160,
  MESSAGE_MIN: 5,
  MESSAGE_MAX: 2000,
  SPECIAL_REQUESTS_MAX: 500,
  DESCRIPTION_MAX: 800,
  URL_MAX: 500,
  MAX_GUESTS: 30,
} as const;

export function isValidId(id: string): boolean {
  return typeof id === 'string' && id.length >= 1 && id.length <= VOLUMETRIC_LIMITS.ID_MAX && VOLUMETRIC_LIMITS.ID_REGEX.test(id);
}

export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const trimmed = email.trim();
  return (
    trimmed.length >= 5 &&
    trimmed.length <= VOLUMETRIC_LIMITS.EMAIL_MAX &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
  );
}

export function isValidPhone(phone: string): boolean {
  if (typeof phone !== 'string') return false;
  const trimmed = phone.trim();
  const digits = trimmed.replace(/[^\d]/g, '');
  return (
    trimmed.length >= VOLUMETRIC_LIMITS.PHONE_MIN &&
    trimmed.length <= VOLUMETRIC_LIMITS.PHONE_MAX &&
    digits.length >= 7 &&
    digits.length <= 15
  );
}

export function clampString(val: unknown, maxLen: number): string {
  if (typeof val !== 'string') return '';
  return val.trim().slice(0, maxLen);
}

export interface ReservationInput {
  customerName: string;
  phone: string;
  email: string;
  date: string;
  startTime: string;
  guestCount: number;
  specialRequests?: string;
}

export function validateReservationInput(input: ReservationInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const name = (input.customerName || '').trim();
  if (name.length < VOLUMETRIC_LIMITS.NAME_MIN || name.length > VOLUMETRIC_LIMITS.NAME_MAX) {
    errors.push('Full name must be between 2 and 120 characters.');
  }
  if (!isValidPhone(input.phone)) {
    errors.push('Please enter a valid phone number (7 to 15 digits).');
  }
  if (!isValidEmail(input.email)) {
    errors.push('Please enter a valid email address.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date || '')) {
    errors.push('Please select a valid reservation date (YYYY-MM-DD).');
  }
  if (!/^\d{2}:\d{2}$/.test(input.startTime || '')) {
    errors.push('Please select a valid preferred time slot.');
  }
  const guests = Number(input.guestCount);
  if (!Number.isInteger(guests) || guests < 1 || guests > VOLUMETRIC_LIMITS.MAX_GUESTS) {
    errors.push(`Guest count must be between 1 and ${VOLUMETRIC_LIMITS.MAX_GUESTS}.`);
  }
  if (input.specialRequests && input.specialRequests.length > VOLUMETRIC_LIMITS.SPECIAL_REQUESTS_MAX) {
    errors.push(`Special requests cannot exceed ${VOLUMETRIC_LIMITS.SPECIAL_REQUESTS_MAX} characters.`);
  }
  return { valid: errors.length === 0, errors };
}

export interface ContactEnquiryInput {
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
}

export function validateContactEnquiryInput(input: ContactEnquiryInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const name = (input.name || '').trim();
  const subject = (input.subject || '').trim();
  const message = (input.message || '').trim();

  if (name.length < VOLUMETRIC_LIMITS.NAME_MIN || name.length > VOLUMETRIC_LIMITS.NAME_MAX) {
    errors.push('Name must be between 2 and 120 characters.');
  }
  if (!isValidPhone(input.phone)) {
    errors.push('Please enter a valid phone number.');
  }
  if (!isValidEmail(input.email)) {
    errors.push('Please enter a valid email address.');
  }
  if (subject.length < VOLUMETRIC_LIMITS.SUBJECT_MIN || subject.length > VOLUMETRIC_LIMITS.SUBJECT_MAX) {
    errors.push('Subject must be between 2 and 160 characters.');
  }
  if (message.length < VOLUMETRIC_LIMITS.MESSAGE_MIN || message.length > VOLUMETRIC_LIMITS.MESSAGE_MAX) {
    errors.push('Message must be between 5 and 2000 characters.');
  }

  return { valid: errors.length === 0, errors };
}
