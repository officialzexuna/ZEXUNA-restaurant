import { auth } from './firebase';
import type { ReservationStatus, ReservationStatusView } from '../types/restaurant';

export interface SlotAvailability {
  startTime: string;
  endTime: string;
  available: boolean;
  availableTables: number;
  reason?: string;
}

export interface AvailabilityResponse {
  date: string;
  guestCount: number;
  tablesSeeded: boolean;
  slots: SlotAvailability[];
}

export interface CreateReservationPayload {
  customerName: string;
  phone: string;
  email: string;
  date: string;
  startTime: string;
  guestCount: number;
  specialRequests?: string;
  idempotencyKey?: string;
}

export interface CreateReservationResponse {
  referenceCode: string;
  reservationId: string;
  status: ReservationStatus;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  tableNumber: string;
  notifications: {
    email: { status: string; error?: string };
    whatsapp: { status: string; error?: string };
  };
}

export async function fetchAvailability(date: string, guests: number): Promise<AvailabilityResponse> {
  const resp = await fetch(
    `/api/reservations/availability?date=${encodeURIComponent(date)}&guests=${encodeURIComponent(String(guests))}`
  );
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Failed to check table availability');
  return data as AvailabilityResponse;
}

export async function submitReservation(
  payload: CreateReservationPayload
): Promise<CreateReservationResponse> {
  const resp = await fetch('/api/reservations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Unable to submit reservation');
  return data as CreateReservationResponse;
}

export async function lookupReservationStatus(refCode: string): Promise<ReservationStatusView> {
  const resp = await fetch(`/api/reservations/status?ref=${encodeURIComponent(refCode.trim())}`);
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Reservation not found');
  return data as ReservationStatusView;
}

export async function requestReservationCancellation(referenceCode: string): Promise<void> {
  const resp = await fetch('/api/reservations/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referenceCode }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Failed to request cancellation');
}

export async function adminUpdateReservationStatus(
  reservationId: string,
  status: ReservationStatus
): Promise<{ status: ReservationStatus; notificationResult?: { status: string; error?: string } | null }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Administrator sign-in required.');
  const token = await user.getIdToken();
  const resp = await fetch(`/api/admin/reservations/${encodeURIComponent(reservationId)}/status`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.error || 'Failed to update reservation status');
  return data;
}
