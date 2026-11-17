import type { DayOpeningHours, ReservationStatus, RestaurantTable } from '../types/restaurant';

export function generateReferenceCode(randomFn: () => number = Math.random): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(randomFn() * chars.length)];
  }
  return `ZXN-${suffix}`;
}

export function formatSlotLockId(date: string, startTime: string, tableId: string): string {
  const compactTime = startTime.replace(':', '');
  return `${date}_${compactTime}_${tableId}`;
}

export function timeToMinutes(timeStr: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!match) return -1;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return -1;
  return hours * 60 + minutes;
}

export function computeEndTime(startTime: string, durationMinutes: number = 90): string {
  const startMin = timeToMinutes(startTime);
  if (startMin < 0) return startTime;
  const total = (startMin + durationMinutes) % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export function isWithinOpeningHours(
  dateStr: string,
  startTime: string,
  openingHours: Record<string, DayOpeningHours>
): { valid: boolean; reason?: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { valid: false, reason: 'Invalid date format.' };
  }
  const parsed = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, reason: 'Invalid calendar date.' };
  }
  const dayKey = WEEKDAYS[parsed.getUTCDay()];
  const schedule = openingHours[dayKey];
  if (!schedule) {
    return { valid: true };
  }
  if (schedule.closed) {
    return { valid: false, reason: `Restaurant is closed on ${dayKey}.` };
  }

  const slotMin = timeToMinutes(startTime);
  const openMin = timeToMinutes(schedule.open);
  const closeMin = timeToMinutes(schedule.close);
  if (slotMin < 0 || openMin < 0 || closeMin < 0) {
    return { valid: false, reason: 'Invalid time format.' };
  }

  if (slotMin < openMin || slotMin > closeMin) {
    return {
      valid: false,
      reason: `Requested time ${startTime} is outside opening hours (${schedule.open} - ${schedule.close}).`,
    };
  }
  return { valid: true };
}

export function selectAvailableTable(
  tables: RestaurantTable[],
  lockedTableIds: Set<string>,
  guestCount: number
): RestaurantTable | null {
  const candidates = tables
    .filter((t) => t.active && t.capacity >= guestCount && !lockedTableIds.has(t.tableId))
    .sort((a, b) => a.capacity - b.capacity);

  return candidates.length > 0 ? candidates[0] : null;
}

const ALLOWED_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'NO_SHOW', 'CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export function canTransitionReservationStatus(
  current: ReservationStatus,
  next: ReservationStatus
): boolean {
  if (current === next) return true;
  return ALLOWED_TRANSITIONS[current]?.includes(next) ?? false;
}
