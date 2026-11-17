import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEmail,
  isValidId,
  isValidPhone,
  validateContactEnquiryInput,
  validateReservationInput,
} from './validation';

test('isValidId rejects slashes, empty strings, and oversized IDs', () => {
  assert.equal(isValidId('chicken_biryani-1'), true);
  assert.equal(isValidId('bad/id'), false);
  assert.equal(isValidId(''), false);
  assert.equal(isValidId('a'.repeat(129)), false);
});

test('email and phone validators catch malformed inputs', () => {
  assert.equal(isValidEmail('guest@example.com'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidPhone('+91 9999988787'), true);
  assert.equal(isValidPhone('123'), false);
});

test('validateReservationInput validates all required guest fields', () => {
  const valid = validateReservationInput({
    customerName: 'Priya Nair',
    phone: '+91 9876543210',
    email: 'priya@example.com',
    date: '2026-11-25',
    startTime: '20:00',
    guestCount: 4,
    specialRequests: 'Window table please',
  });
  assert.equal(valid.valid, true);

  const invalid = validateReservationInput({
    customerName: 'P',
    phone: '12',
    email: 'bad',
    date: '25-11-2026',
    startTime: '8pm',
    guestCount: 50,
  });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.length, 6);
});

test('validateContactEnquiryInput rejects short messages', () => {
  const res = validateContactEnquiryInput({
    name: 'Karan',
    phone: '+91 9999988787',
    email: 'karan@example.com',
    subject: 'Catering',
    message: 'Hi',
  });
  assert.equal(res.valid, false);
});
