import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { App as AdminApp } from 'firebase-admin/app';
import type { Firestore as AdminFirestore } from 'firebase-admin/firestore';

export interface FirebaseAppletConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId: string;
  storageBucket?: string;
}

const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
export const firebaseConfig: FirebaseAppletConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

export const ADMIN_BOOTSTRAP_EMAIL = (
  process.env.ADMIN_BOOTSTRAP_EMAIL || 'official.zexuna@gmail.com'
).toLowerCase();

let adminApp: AdminApp | null = null;
let adminDb: AdminFirestore | null = null;

async function tryInitAdminSdk(): Promise<void> {
  const rawCert = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawCert || !rawCert.trim().startsWith('{')) {
    return;
  }
  try {
    const { initializeApp, cert, getApps } = await import('firebase-admin/app');
    const { getFirestore } = await import('firebase-admin/firestore');
    const parsed = JSON.parse(rawCert);
    adminApp =
      getApps().length > 0
        ? getApps()[0]
        : initializeApp({
            credential: cert(parsed),
            projectId: firebaseConfig.projectId,
          });
    adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
  } catch (err) {
    console.warn('Optional FIREBASE_SERVICE_ACCOUNT_KEY failed to initialize:', err);
  }
}

void tryInitAdminSdk();

export function getAdminFirestore(): AdminFirestore | null {
  return adminDb;
}

export interface VerifiedIdToken {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

let cachedCerts: { expiresAt: number; certs: Record<string, string> } | null = null;

async function getGooglePublicCerts(): Promise<Record<string, string>> {
  if (cachedCerts && Date.now() < cachedCerts.expiresAt) {
    return cachedCerts.certs;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error(`Failed to fetch Google securetoken certificates (${resp.status})`);
  }
  const certs = (await resp.json()) as Record<string, string>;
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = /max-age=(\d+)/.exec(cacheControl);
  const ttlMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 3600 * 1000;
  cachedCerts = { certs, expiresAt: Date.now() + ttlMs };
  return certs;
}

function decodeBase64Url(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(padded, 'base64');
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedIdToken> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed JWT token');
  }
  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(decodeBase64Url(headerB64).toString('utf8')) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(decodeBase64Url(payloadB64).toString('utf8')) as {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Unsupported JWT algorithm or missing key ID');
  }
  if (payload.aud !== firebaseConfig.projectId) {
    throw new Error('Token audience mismatch');
  }
  if (payload.iss !== `https://securetoken.google.com/${firebaseConfig.projectId}`) {
    throw new Error('Token issuer mismatch');
  }
  if (!payload.sub || typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) {
    throw new Error('Token expired or missing subject');
  }

  const certs = await getGooglePublicCerts();
  const pem = certs[header.kid];
  if (!pem) {
    throw new Error('Unknown signing key');
  }

  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  const valid = verifier.verify(pem, decodeBase64Url(signatureB64));
  if (!valid) {
    throw new Error('Invalid Firebase ID token signature');
  }

  return {
    uid: payload.sub,
    email: String(payload.email || '').toLowerCase(),
    emailVerified: Boolean(payload.email_verified),
    name: payload.name,
  };
}

// -----------------------------------------------------------------------------
// Firestore REST API Helpers (works seamlessly with or without service account)
// -----------------------------------------------------------------------------
const FIRESTORE_REST_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;

export type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } };

export function toFirestoreValue(val: unknown, keyHint?: string): FirestoreValue {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    const isTimestampKey =
      keyHint &&
      ['createdAt', 'updatedAt', 'timestamp', 'startAt', 'expiresAt'].includes(keyHint);
    if (isTimestampKey && /^\d{4}-\d{2}-\d{2}T/.test(val)) {
      return { timestampValue: val };
    }
    return { stringValue: val };
  }
  if (val instanceof Date) {
    return { timestampValue: val.toISOString() };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map((item) => toFirestoreValue(item)),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, FirestoreValue> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = toFirestoreValue(v, k);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

export function toFirestoreFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = toFirestoreValue(v, k);
    }
  }
  return fields;
}

export function fromFirestoreValue(val: FirestoreValue): unknown {
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map((v) => fromFirestoreValue(v));
  }
  if ('mapValue' in val) {
    return fromFirestoreFields(val.mapValue.fields || {});
  }
  return null;
}

export function fromFirestoreFields(fields: Record<string, FirestoreValue>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    out[k] = fromFirestoreValue(v);
  }
  return out;
}

export function docResourceName(collectionPath: string, docId: string): string {
  return `projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/${collectionPath}/${docId}`;
}

export async function firestoreRestGetDoc<T = Record<string, unknown>>(
  collectionPath: string,
  docId: string,
  bearerToken?: string
): Promise<T | null> {
  const headers: Record<string, string> = {};
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;
  const resp = await fetch(`${FIRESTORE_REST_BASE}/${collectionPath}/${encodeURIComponent(docId)}`, {
    headers,
  });
  if (resp.status === 404) return null;
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Firestore GET ${collectionPath}/${docId} failed (${resp.status}): ${text}`);
  }
  const json = (await resp.json()) as { fields?: Record<string, FirestoreValue> };
  return (json.fields ? fromFirestoreFields(json.fields) : {}) as T;
}

export async function firestoreRestListCollection<T = Record<string, unknown>>(
  collectionPath: string,
  bearerToken?: string,
  pageSize: number = 100
): Promise<T[]> {
  const headers: Record<string, string> = {};
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;
  const resp = await fetch(`${FIRESTORE_REST_BASE}/${collectionPath}?pageSize=${pageSize}`, {
    headers,
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Firestore LIST ${collectionPath} failed (${resp.status}): ${text}`);
  }
  const json = (await resp.json()) as {
    documents?: Array<{ name: string; fields?: Record<string, FirestoreValue> }>;
  };
  return (json.documents || []).map((d) =>
    (d.fields ? fromFirestoreFields(d.fields) : {}) as T
  );
}

export interface AtomicWriteOperation {
  collection: string;
  docId: string;
  data: Record<string, unknown>;
  serverTimestampFields?: string[];
  mustNotExist?: boolean;
  mustExist?: boolean;
}

export async function firestoreRestAtomicCommit(
  operations: AtomicWriteOperation[],
  bearerToken?: string
): Promise<void> {
  const writes = operations.map((op) => {
    const name = docResourceName(op.collection, op.docId);
    const fields = toFirestoreFields(op.data);
    const writeObj: Record<string, unknown> = {
      update: {
        name,
        fields,
      },
    };
    if (op.mustNotExist) {
      writeObj.currentDocument = { exists: false };
    } else if (op.mustExist) {
      writeObj.currentDocument = { exists: true };
    }
    if (op.serverTimestampFields && op.serverTimestampFields.length > 0) {
      writeObj.updateTransforms = op.serverTimestampFields.map((fieldPath) => ({
        fieldPath,
        setToServerValue: 'REQUEST_TIME',
      }));
    }
    return writeObj;
  });

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`;

  const resp = await fetch(`${FIRESTORE_REST_BASE}:commit`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ writes }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    const err = new Error(`Firestore atomic commit failed (${resp.status}): ${text}`) as Error & {
      statusCode?: number;
    };
    err.statusCode = resp.status;
    throw err;
  }
}

export async function checkIsAdminUser(uid: string, bearerToken: string): Promise<boolean> {
  if (adminDb) {
    const snap = await adminDb.collection('admins').doc(uid).get();
    return snap.exists && snap.data()?.active === true;
  }
  try {
    const docData = await firestoreRestGetDoc<{ active?: boolean }>('admins', uid, bearerToken);
    return docData !== null && docData.active === true;
  } catch {
    return false;
  }
}
