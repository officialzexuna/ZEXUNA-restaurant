import { signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from './firebase';
import type { AdminRecord } from '../types/restaurant';

export async function signInWithGoogle(): Promise<User> {
  const credential = await signInWithPopup(auth, googleProvider);
  return credential.user;
}

export async function signOutAdmin(): Promise<void> {
  await signOut(auth);
}

export async function fetchAdminProfile(uid: string): Promise<AdminRecord | null> {
  const path = `admins/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    if (!snap.exists()) return null;
    return snap.data() as AdminRecord;
  } catch (err) {
    // Return null if permission denied for non-admin account rather than crashing public flow
    const message = err instanceof Error ? err.message : '';
    if (message.includes('Missing or insufficient permissions')) {
      return null;
    }
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function onboardAuthorizedAdmin(user: User): Promise<AdminRecord> {
  const token = await user.getIdToken(true);
  const resp = await fetch('/api/admin/onboard', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const data = (await resp.json()) as { error?: string; admin?: AdminRecord };
  if (!resp.ok) {
    throw new Error(data.error || 'Administrator onboarding failed.');
  }
  const profile = data.admin || (await fetchAdminProfile(user.uid));
  if (!profile) {
    throw new Error('Administrator record could not be loaded after onboarding.');
  }
  return profile;
}
