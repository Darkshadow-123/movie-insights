import { randomUUID } from 'crypto';
import { redis } from './redis';

// Only deletes the lock if it still holds OUR token — prevents a stale
// release from accidentally deleting a DIFFERENT instance's lock, which
// could happen if this instance's own operation ran past the lock's TTL
// and a new owner had already acquired it by the time this runs.
const RELEASE_SCRIPT = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
  return redis.call("DEL", KEYS[1])
else
  return 0
end
`;

/**
 * Attempts to acquire a distributed lock. Returns a token to pass to
 * releaseLock() if successful, or null if someone else already holds it.
 */
export async function acquireLock(key: string, ttlMs: number): Promise<string | null> {
  const token = randomUUID();
  // nx: true = only set if the key doesn't already exist — the atomic
  // compare-and-set that makes this a real lock; Redis guarantees only
  // one caller gets 'OK' even under truly simultaneous requests.
  // px = auto-expire in ms, so a crashed instance that never releases
  // doesn't block this key forever.
  const result = await redis.set(key, token, { px: ttlMs, nx: true });
  return result === 'OK' ? token : null;
}

/**
 * Releases a lock previously acquired with acquireLock(), but only if
 * this caller still owns it (see RELEASE_SCRIPT above).
 */
export async function releaseLock(key: string, token: string): Promise<void> {
  await redis.eval(RELEASE_SCRIPT, [key], [token]);
}
