import { Redis } from '@upstash/redis';

// REST-based client: every call is a stateless HTTPS request, not a
// persistent TCP connection. There's no connection pool to size, no
// singleton-across-warm-invocations pattern needed, and no
// maxclients-exhaustion risk under bursty concurrent Vercel traffic —
// that whole category of problem doesn't apply to this protocol.
//
// Reads UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN from env,
// which Vercel's Marketplace Upstash integration injects automatically
// once linked to this project. Locally, pull the same two values from
// the Upstash console into .env.local.
export const redis = Redis.fromEnv();
