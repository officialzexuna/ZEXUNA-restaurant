import test from 'node:test';
import assert from 'node:assert/strict';
import { SlidingWindowLimiter } from './rateLimit';

test('SlidingWindowLimiter allows requests up to limit and blocks excess', () => {
  const limiter = new SlidingWindowLimiter(3, 60_000);
  const t0 = 1_000_000;

  assert.equal(limiter.check('1.2.3.4', t0).allowed, true);
  assert.equal(limiter.check('1.2.3.4', t0 + 100).allowed, true);
  const third = limiter.check('1.2.3.4', t0 + 200);
  assert.equal(third.allowed, true);
  assert.equal(third.remaining, 0);

  const fourth = limiter.check('1.2.3.4', t0 + 300);
  assert.equal(fourth.allowed, false);
  assert.ok(fourth.retryAfterSeconds >= 1);

  // Separate client IP remains unblocked
  assert.equal(limiter.check('5.6.7.8', t0 + 300).allowed, true);
});

test('SlidingWindowLimiter resets allowance after sliding window elapses', () => {
  const limiter = new SlidingWindowLimiter(2, 10_000);
  const t0 = 5_000_000;

  assert.equal(limiter.check('10.0.0.1', t0).allowed, true);
  assert.equal(limiter.check('10.0.0.1', t0 + 1_000).allowed, true);
  assert.equal(limiter.check('10.0.0.1', t0 + 2_000).allowed, false);

  // After t0 + 10_001, the first timestamp drops out of the window
  const recovered = limiter.check('10.0.0.1', t0 + 10_001);
  assert.equal(recovered.allowed, true);
  assert.equal(recovered.remaining, 0);
});
