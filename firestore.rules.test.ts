import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');
const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));

test('firestore.rules includes default-deny global safety net', () => {
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;\s*\}/);
});

test('every collection in firebase-blueprint.json has an explicit match block in firestore.rules', () => {
  const paths = Object.keys(blueprint.firestore);
  for (const path of paths) {
    const collectionName = path.split('/')[1];
    assert.ok(
      rules.includes(`match /${collectionName}/{`),
      `Missing match block for collection ${collectionName}`
    );
  }
});

test('all sensitive PII collections forbid unauthenticated list and get', () => {
  const piiCollections = [
    'customers',
    'reservations',
    'orders',
    'orderItems',
    'contactEnquiries',
    'newsletterSubscribers',
    'notifications',
    'auditLogs',
    'chatbotConversations',
    'chatbotMessages',
  ];

  for (const col of piiCollections) {
    const blockStart = rules.indexOf(`match /${col}/{`);
    assert.ok(blockStart !== -1, `Missing ${col}`);
    const blockEnd = rules.indexOf('\n    match /', blockStart + 10);
    const block = rules.slice(blockStart, blockEnd === -1 ? undefined : blockEnd);
    assert.match(block, /allow list:\s*if isAdmin\(\);/, `${col} list must require isAdmin()`);
    assert.match(block, /allow get:\s*if isValidId\([^)]+\) && isAdmin\(\);/, `${col} get must require isAdmin()`);
  }
});

test('email_verified is enforced for admin and bootstrap owner checks', () => {
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /request\.auth\.token\.email == 'official\.zexuna@gmail\.com'/);
});

test('auditLogs are append-only and immutable', () => {
  const blockStart = rules.indexOf('match /auditLogs/{logId}');
  const block = rules.slice(blockStart);
  assert.match(block, /allow update:\s*if false;/);
  assert.match(block, /allow delete:\s*if false;/);
});
