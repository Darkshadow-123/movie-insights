# Movie Insights - End-to-End Technical Deep Dive & Interview Guide

This document provides a comprehensive, production-grade architectural guide for **Movie Insights**. It is designed as a complete reference for technical interviews, system design walkthroughs, and code reviews.

---

## 📌 Executive Summary

**Movie Insights** is a full-stack Next.js 15 application built with TypeScript, Upstash Redis, Google Gemini 3.6 Flash AI, OMDb API, and YouTube Data API v3. 

### Core Technical Problem Addressed
Generative AI calls are inherently **expensive, slow (~3.8s–4.8s latency), and heavily rate-limited** (e.g. 5–15 requests per minute on free/flash tiers). In serverless environments (Vercel Lambdas), traffic spikes trigger the **Cache Stampede (Thundering Herd)** problem, where dozens of concurrent lambdas bombard AI APIs simultaneously, causing 429 quota exhaustion and massive billing spikes.

### The Engineering Solution
A **3-Tier Multi-Layer Caching & Distributed Lock Architecture**:
1. **Layer 1 (Process Memory)**: Intra-instance Promise deduplication (`inFlightRequests` Map).
2. **Layer 2 (Next.js Data Cache)**: Fast local server revalidation cache (`unstable_cache`).
3. **Layer 3 (Upstash Redis Persistent Shared Cache & Distributed Lock)**: Global cross-instance caching and atomic lock single-flight coordination.

### Key Results Achieved
* **Latency Reduction**: From **~4,800ms** (cold Gemini call) down to **281ms** (Redis shared cache) and **1ms** (Next.js data cache).
* **AI Cost Reduction**: **> 99.1% reduction** in total AI token consumption.
* **Concurrency Benchmark**: Load-tested on **Grafana Cloud k6 at 75 Virtual Users (95.3 Peak RPS)** with **0% HTTP error rate** and **100% check pass rate**.

---

## 📐 System Architecture & End-to-End Data Flow

```
                                  [ CLIENT BROWSER ]
                                          │
                                          │ 1. GET /movies/[id] (Page Shell)
                                          ▼
                               [ Next.js App Router ]
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  │                                               │
                  ▼                                               ▼
         [ OMDb API Client ]                            [ YouTube Data API ]
         (Movie Details / Plot)                         (Trailer & Comments)
                  │                                               │
                  └───────────────────────┬───────────────────────┘
                                          │
                                          │ 2. Return Fast Shell (~300ms)
                                          ▼
                             [ Client Renders Page Shell ]
                                          │
                                          │ 3. Client useEffect fires Server Action
                                          ▼
                            [ fetchSentimentAction() ]
                                          │
                                          ▼
                       ┌─────────────────────────────────────┐
                       │ Layer 1: Process In-Memory Map      │ ──(Hit: 0ms)──> Return Promise
                       └──────────────────┬──────────────────┘
                                          │ (Miss)
                                          ▼
                       ┌─────────────────────────────────────┐
                       │ Layer 2: Next.js Data Cache         │ ──(Hit: 1ms)──> Return Cached JSON
                       └──────────────────┬──────────────────┘
                                          │ (Miss)
                                          ▼
                       ┌─────────────────────────────────────┐
                       │ Layer 3: Upstash Redis Pre-Lock Check│ ──(Hit: 281ms)─> Return Persistent JSON
                       └──────────────────┬──────────────────┘
                                          │ (Miss)
                                          ▼
                       ┌─────────────────────────────────────┐
                       │ Upstash Redis Distributed Mutex     │
                       │ (SET lock:key token PX 20000 NX)    │
                       └──────────────┬───────────┬──────────┘
                                      │           │
                      (Lock Winner)   │           │ (Lock Losers / Waiters)
                                      ▼           ▼
                      ┌──────────────────┐  ┌──────────────────────────────────┐
                      │ Google Gemini AI │  │ Redis Active Polling Loop        │
                      │ (genai 3.6 Flash)│  │ (Poll every 150ms up to 10s)     │
                      └───────┬──────────┘  └────────────────┬─────────────────┘
                              │                              │
                              └──────────────┬───────────────┘
                                             │
                                             ▼
                      ┌──────────────────────────────────────┐
                      │ Store in Upstash Redis (7-Day TTL)   │
                      │ Return Sentiment Data to Client      │
                      └──────────────────────────────────────┘
```

---

## 🔄 Detailed Request Lifecycle (Step-by-Step)

### Step 1: Initial Page Shell Request (`GET /movies/[id]`)
1. User navigates to `/movies/tt0468569` (*The Dark Knight*).
2. Next.js Server Component ([app/movies/[id]/page.tsx](file:///d:/movie-insights/movie-insights/app/movies/%5Bid%5D/page.tsx)) executes on the server.
3. Concurrently fetches movie metadata from **OMDb API** (`getMovieById`) and video/comments from **YouTube API** (`getMovieTrailerAndComments`).
4. Renders the fast UI shell (Poster, Title, Rating, Cast, Trailer) in **~300ms** and streams HTML to the browser.
5. Renders a loading skeleton placeholder for the AI Sentiment section (`SentimentCardClient.tsx`).

### Step 2: Deferred Client Trigger & Server Action
1. `SentimentCardClient.tsx` mounts in the browser.
2. In a client-side `useEffect`, it invokes the Next.js Server Action: `fetchSentimentAction(title, plot, rating, comments)`.
3. This keeps initial page load ultra-fast while isolating heavy AI processing behind a deferred async call.

### Step 3: Layer 1 - Intra-Instance Promise Deduplication
1. `analyzeCombined()` calculates the cache key: `${title}::${rating}` (e.g. `"The Dark Knight::9.1"`).
2. Checks Node.js process-memory map `inFlightRequests.get(key)`.
3. If another request for *The Dark Knight* is currently executing on the **same Node.js process**, it reuses the existing active `Promise` (0ms cost, 0 network overhead).

### Step 4: Layer 2 - Next.js Server Data Cache (`unstable_cache`)
1. If not in memory, Next.js checks its local Data Cache (`unstable_cache`).
2. If previously calculated within 7 days, returns the cached JSON in **1ms**.

### Step 5: Layer 3 - Pre-Lock Upstash Redis Shared Cache
1. If local cache misses (e.g. a brand new cold serverless container on Vercel), `withDistributedLock` checks Upstash Redis: `redis.get("result:sentiment:The Dark Knight::9.1")`.
2. If another serverless container in the world already analyzed this movie, it returns the 7-day persistent result in **~281ms** with **0 AI tokens spent**.

### Step 6: Layer 4 - Upstash Redis Distributed Mutex & Polling Loop
1. If 100 concurrent requests hit an uncached movie simultaneously:
   - **Winner**: Container 1 executes `acquireLock()`, running atomic Redis command: `SET lock:sentiment:The Dark Knight::9.1 <uuid> PX 20000 NX`.
   - **Losers**: Containers 2 through 100 fail lock acquisition. They enter an active polling loop checking Redis (`redis.get()`) every **150ms** (`REDIS_POLL_INTERVAL_MS`) up to a max timeout of **10 seconds** (`REDIS_MAX_WAIT_MS`).
2. Winner calls Google Gemini API (`ai.models.generateContent`), writes result to Redis (`result:sentiment:...` with 7-day TTL), and releases lock via atomic Lua script.
3. Waiting containers instantly pick up the written result from Redis within 150ms.

### Step 7: Graceful Fallback Safety Net
1. If Google Gemini API returns a rate limit (`429 TooManyRequests`) or server overload (`503 Service Unavailable`):
2. `sentimentAction.ts` catches the exception cleanly and invokes `getFallbackSentiment(rating, plot)`.
3. Computes local heuristic sentiment percentages and summary in **< 5ms** and returns HTTP `200 OK` with `isFallback: true`.
4. **Result**: Zero 500 server errors, zero site crashes.

---

## 🛠️ Codebase Structure & Key Files

| File Path | Role & Technical Description |
| :--- | :--- |
| [app/lib/redis.ts](file:///d:/movie-insights/movie-insights/app/lib/redis.ts) | Upstash Redis REST client initialization (`Redis.fromEnv()`). |
| [app/lib/distributedLock.ts](file:///d:/movie-insights/movie-insights/app/lib/distributedLock.ts) | Atomic lock acquisition (`SET NX PX`) and Lua script release (`releaseLock`). |
| [app/services/sentimentService.ts](file:///d:/movie-insights/movie-insights/app/services/sentimentService.ts) | Core 3-tier caching pipeline, Gemini API client, and lock polling loop. |
| [app/actions/sentimentAction.ts](file:///d:/movie-insights/movie-insights/app/actions/sentimentAction.ts) | Next.js Server Action wrapping sentiment calls with fallback catch logic. |
| [app/movies/[id]/SentimentCardClient.tsx](file:///d:/movie-insights/movie-insights/app/movies/%5Bid%5D/SentimentCardClient.tsx) | Client component managing deferred client-side sentiment fetch. |
| [k6-load-test.js](file:///d:/movie-insights/movie-insights/k6-load-test.js) | Protocol load testing script for Grafana Cloud k6 across 50 IMDb movies. |
| [OPTIMIZATION_PRODUCTION.md](file:///d:/movie-insights/movie-insights/OPTIMIZATION_PRODUCTION.md) | Empirical benchmarks, terminal log verification, and architecture docs. |

---

## 📊 Empirical Benchmarks (Grafana Cloud k6 Load Test)

Under protocol load testing with **75 Virtual Users (VUs)** across a randomized pool of **50 IMDb movies**:

* **Total Requests Handled**: 3,898 requests
* **Throughput**: **60.9 mean RPS / 95.3 peak RPS**
* **HTTP Failure Rate**: **0.00% (0 / 3,898 failed)**
* **Check Pass Rate**: **100.00% (5,847 / 5,847 checks passed)**
* **Mean Latency**: **92.1 ms**
* **p95 Latency**: **153.8 ms**

---

## 💬 Interview Q&A Cheatsheet

### Q1: "Why use REST-based `@upstash/redis` instead of standard TCP `ioredis`?"
> *"On serverless platforms like Vercel, functions spin up statelessly on demand. Standard TCP Redis connections require persistent socket connections, which cause socket pool exhaustion (`ERR max number of clients reached`) during traffic spikes. `@upstash/redis` uses stateless HTTP `fetch` requests, eliminating connection pooling issues and connection cold starts."*

### Q2: "Why use Active Polling instead of Redis Pub/Sub?"
> *"Redis Pub/Sub requires long-lived, continuous TCP socket subscriptions. In serverless environments, Lambdas freeze or terminate as soon as an HTTP response is sent, breaking socket subscriptions. Active lock polling over HTTP REST (`redis.get()` every 150ms) is completely stateless and works reliably across serverless lambdas."*

### Q3: "How does the system handle Gemini API failures or rate limits?"
> *"We implemented a multi-layered fail-open resiliency pattern. If Gemini returns 429 Rate Limit or 503 Service Unavailable, the Server Action catches the exception and immediately invokes a local heuristic generator (`getFallbackSentiment`). It calculates realistic sentiment distributions in < 5ms and returns HTTP 200 OK, ensuring users never see a broken page or 500 error."*

### Q4: "How did you prevent stale lock deletions?"
> *"When acquiring a lock, we store a unique UUID token as the lock value. When releasing the lock, we execute an atomic Lua script (`eval`) that checks if the lock value in Redis still matches our unique UUID token before deleting it. This guarantees a slow container never accidentally deletes a lock acquired by a newer container."*
