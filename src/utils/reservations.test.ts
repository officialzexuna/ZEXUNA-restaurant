import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canTransitionReservationStatus,
  computeEndTime,
  formatSlotLockId,
  generateReferenceCode,
  isWithinOpeningHours,
  selectAvailableTable,
} from './reservations';
import type { DayOpeningHours, RestaurantTable } from '../types/restaurant';

const hours: Record<string, DayOpeningHours> = {
  monday: { open: '12:00', close: '23:00', closed: false },
  tuesday: { open: '12:00', close: '23:00', closed: true },
};

const tables: RestaurantTable[] = [
  { tableId: 't1', tableNumber: 'T1', capacity: 2, location: 'Window', active: true },
  { tableId: 't2', tableNumber: 'T2', capacity: 4, location: 'Main Hall', active: true },
  { tableId: 't3', tableNumber: 'T3', capacity: 6, location: 'Private Lounge', active: true },
  { tableId: 't4', tableNumber: 'T4', capacity: 8, location: 'VIP', active: false },
];

test('generateReferenceCode produces valid ZXN-prefixed code', () => {
  const code = generateReferenceCode(() => 0.1);
  assert.match(code, /^ZXN-[A-Z0-9]{6}$/);
});

test('formatSlotLockId creates deterministic collision-free lock key', () => {
  assert.equal(formatSlotLockId('2026-11-20', '19:30', 't2'), '2026-11-20_1930_t2');
});

test('computeEndTime increments slot duration across midnight if needed', () => {
  assert.equal(computeEndTime('19:30', 90), '21:00');
  assert.equal(computeEndTime('23:00', 90), '00:30');
});

test('isWithinOpeningHours validates open days and closed days', () => {
  // 2026-11-16 is Monday, 2026-11-17 is Tuesday
  assert.equal(isWithinOpeningHours('2026-11-16', '19:30', hours).valid, true);
  assert.equal(isWithinOpeningHours('2026-11-16', '10:00', hours).valid, false);
  assert.equal(isWithinOpeningHours('2026-11-17', '19:30', hours).valid, false);
});

test('selectAvailableTable picks smallest fitting unlocked active table', () => {
  const locked = new Set<string>(['t2']);
  const selected = selectAvailableTable(tables, locked, 3);
  assert.equal(selected?.tableId, 't3');
  assert.equal(selectAvailableTable(tables, new Set(['t1', 't2', 't3']), 2), null);
});

test('canTransitionReservationStatus enforces lifecycle rules', () => {
  assert.equal(canTransitionReservationStatus('PENDING', 'CONFIRMED'), true);
  assert.equal(canTransitionReservationStatus('CONFIRMED', 'COMPLETED'), true);
  assert.equal(canTransitionReservationStatus('CANCELLED', 'CONFIRMED'), false);
  assert.equal(canTransitionReservationStatus('REJECTED', 'COMPLETED'), false);
});
