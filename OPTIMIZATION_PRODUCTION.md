# Production Caching & Distributed Synchronization Architecture

This document details the production-grade caching, distributed locking, and performance optimizations implemented for **Movie Insights**. It includes empirical runtime logs, k6 load testing benchmarks, and structural breakdowns of how the system handles high-concurrency serverless traffic.

---

## Executive Summary

The primary objective of this architecture is to eliminate redundant, expensive Google Gemini AI API calls across distributed serverless instances (e.g., Vercel Lambdas) while driving user-perceived sentiment analysis latency down from **~3.8s–4.8s** on cold calls to **281ms (Redis Shared Cache)** and **1ms (Next.js Data Cache)**.

### Performance & Latency Matrix

| Request Scenario | Execution Path | AI Token Cost | User Latency | Speedup |
| :--- | :--- | :--- | :--- | :--- |
| **Cold Request (First Ever)** | Google Gemini AI Model Inference | ~350–750 tokens | **3,800ms – 4,800ms** | 1x (Baseline) |
| **Cold Container (Wiped Local Cache)** | Upstash Redis 7-Day Shared Cache | **0 tokens** | **281ms** | **~13.5x Faster** |
| **Concurrent Race (Other Instance)** | Upstash Redis Handoff Lock Wait | **0 tokens** | **~300ms – 600ms** | **~8x Faster** |
| **Warm Repeat Request** | Next.js `unstable_cache` / Process Memory | **0 tokens** | **1ms – 5ms** | **~3,800x Faster** |

---

## 3-Tier Multi-Layer Caching & Synchronization System

To prevent the **Cache Stampede (Thundering Herd)** problem inherent to serverless hosting, the application employs a 3-tiered defense system:

```
                  ┌───────────────────────────────────────────┐
                  │          Incoming Web Request             │
                  └─────────────────────┬─────────────────────┘
                                        │
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │ Tier 1: Process In-Flight Promise Map     │ ──(Hit: 0ms)──> Return Promise
                  └─────────────────────┬─────────────────────┘
                                        │ (Miss)
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │ Tier 2: Next.js Data Cache (unstable_cache)│ ──(Hit: 1ms)──> Return Data
                  └─────────────────────┬─────────────────────┘
                                        │ (Miss)
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │ Tier 3: Upstash Redis Shared 7-Day Cache  │ ──(Hit: 281ms)─> Return Data
                  └─────────────────────┬─────────────────────┘
                                        │ (Miss)
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │ Distributed Mutex Lock (Upstash Redis)    │
                  └──────────────┬──────────────────┬─────────┘
                                 │                  │
                 (Lock Winner)   │                  │ (Lock Loser / Waiter)
                                 ▼                  ▼
                  ┌──────────────────────┐  ┌──────────────────────┐
                  │ Call Gemini AI API   │  │ Poll Redis Handoff   │
                  │ (~3.8s - 4.8s)       │  │ (Every 300ms)        │
                  └──────────────┬───────┘  └──────────┬───────────┘
                                 │                     │
                                 └──────────┬──────────┘
                                            │
                                            ▼
                  ┌───────────────────────────────────────────┐
                  │  Store in Redis (7 Days) + Return Result  │
                  └───────────────────────────────────────────┘
```

### 1. Tier 1: Intra-Instance In-Flight Lock (`inFlightRequests` Map)
* **Location**: `app/services/sentimentService.ts`
* **Mechanics**: A Node.js module-scoped `Map<string, Promise<SentimentData>>`.
* **Purpose**: Deduplicates concurrent requests arriving at the **same serverless instance** within milliseconds. JS Promises are multicast; multiple subscribers `await` the single active Promise, resolving simultaneously without incurring additional network overhead.

### 2. Tier 2: Next.js Server-Side Cache (`unstable_cache`)
* **Location**: `app/services/sentimentService.ts`
* **Mechanics**: Wraps sentiment computation with a 7-day revalidation window (`tags: ['sentiment']`).
* **Purpose**: Serves repeat visits on warm containers in **1ms** without touching Redis or external APIs.

### 3. Tier 3: Upstash Redis Distributed Mutex & 7-Day Shared Cache
* **Location**: `app/lib/redis.ts` & `app/lib/distributedLock.ts`
* **Mechanics**: REST-based `@upstash/redis` stateless HTTP client (`Redis.fromEnv()`).
* **Purpose**: 
  - **Global Single-Flight**: Uses atomic `SET lock:key token PX 30000 NX` so only **one container worldwide** executes Gemini AI during concurrent cache misses.
  - **Atomic Safe Release**: Uses an atomic Lua script (`RELEASE_SCRIPT`) to prevent stale lock deletions.
  - **7-Day Persistent Shared Cache**: Pre-computed results are saved in Redis under `result:sentiment:<key>` (`EX 604800`), allowing new cold serverless containers to retrieve existing results in **281ms** with zero AI token expenditure.
  - **Fail-Open Resiliency**: If Upstash Redis environment variables are missing or unreachable, the system degrades gracefully to local process-memory execution without breaking the user experience.

---

## Empirical Server Logs & Production Verification

The following logged terminal outputs demonstrate real runtime behavior under varying cache states:

### 1. Uncached Cold Request (Live Gemini AI Execution)
```bash
[debug] UPSTASH_REDIS_REST_URL present: true | UPSTASH_REDIS_REST_TOKEN present: true
[redis] acquired lock for "The Dark Knight::9.1"
[source:gemini-live-call] firing live Gemini API call for "The Dark Knight::9.1"
[gemini] prompt tokens: 319, output tokens: 120
[redis] released lock for "The Dark Knight::9.1"
[sentiment] gemini total: 4792ms
 POST /movies/tt0468569 200 in 4.8s (compile: 23ms, render: 4.8s)
```

### 2. Cold Container Startup (Local Cache Wiped via `Remove-Item .next`, Redis Persistence Hit)
```bash
[debug] UPSTASH_REDIS_REST_URL present: true | UPSTASH_REDIS_REST_TOKEN present: true
[source:redis-cache-hit] retrieved 7-day persistent result from Upstash Redis for "Parasite::8.5"
[source:nextjs-cache-hit] returned result for "Parasite::8.5"
[sentiment] gemini total: 281ms
 POST /movies/tt6751668 200 in 417ms (compile: 45ms, render: 371ms)
```
* **Observation**: Zero `[gemini] prompt tokens` logged. Complete AI analysis retrieved from Upstash Redis in **281ms**.

### 3. Warm Next.js Local Cache Hit
```bash
[source:nextjs-cache-hit] returned result for "Parasite::8.5"
[sentiment] gemini total: 1ms
 POST /movies/tt6751668 200 in 38ms (compile: 17ms, render: 20ms)
```
* **Observation**: In-memory data cache served response in **1ms**.

---

## K6 Load Testing Benchmarks at Scale

A stress test was conducted using Grafana Cloud k6 against the production deployment (`movie-insights-seven.vercel.app`), ramping to **75 Virtual Users (VUs)** across a randomized pool of **50 valid IMDb movie IDs**.

### Metric Summary (3,898 Requests Run)

| Metric | Result | Benchmark Target | Status |
| :--- | :--- | :--- | :--- |
| **Total Requests** | **3,898 requests** | — | — |
| **Throughput (RPS)** | **60.9 mean / 95.3 peak RPS** | > 50 RPS | ⚡ Pass |
| **HTTP Error Rate** | **0.00% (0 / 3,898 failed)** | < 1.00% | ✅ Pass |
| **Check Pass Rate** | **100.00% (5,847 / 5,847 passed)** | 99.00% | ✅ Pass |
| **Mean Latency** | **92.1 ms** | < 800 ms | ⚡ Pass |
| **p95 Latency** | **153.8 ms** | < 800 ms | ⚡ Pass |
| **p99 Latency** | **233.5 ms** | < 1,500 ms | ⚡ Pass |
| **Max Outlier Latency** | **5,380.8 ms** | (1 single uncached cold request) | ℹ️ Expected |

---

## Serverless Redis Architecture: HTTP REST vs. TCP Sockets

To run Redis reliably in serverless environments like Vercel, `@upstash/redis` was chosen over standard TCP clients (e.g., `ioredis`).

### Why REST-Based Upstash Redis is Essential for Serverless

1. **No Connection Pool Exhaustion**: Standard TCP Redis connections create persistent sockets. When 100 concurrent Lambda functions spin up on Vercel, standard Redis quickly crashes with `ERR max number of clients reached`. Upstash uses stateless HTTPS REST calls (`fetch`), completely eliminating connection pool limits.
2. **Zero Connection Handshake Latency**: Standard TCP sockets add 200ms–500ms connection latency on cold Lambda starts. REST-based HTTP requests execute immediately with 0ms connection overhead.
3. **Serverless Pay-per-Request Pricing**: Operates on a pay-per-request model ($0.20 per 100,000 requests) with a free tier of 500,000 commands/month, reducing infrastructure overhead to near zero.

---

## Environment Variables Configuration

To enable distributed locking and persistent Redis caching, set the following environment variables in `.env.local` or Vercel Settings:

```bash
UPSTASH_REDIS_REST_URL="https://your-database-id.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_upstash_rest_token"
```

If these environment variables are omitted, the system automatically degrades to single-process in-memory locking without throwing runtime exceptions.
