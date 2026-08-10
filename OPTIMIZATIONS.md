## Token/Cost Optimization

The numbers below are real `usageMetadata.promptTokenCount` values logged from the running app, across three different movies, on the current prompt design:

```
tt0468569: prompt tokens: 302, output tokens: 94
tt1160419: prompt tokens: 404, output tokens: 118
tt0418763: prompt tokens: 423, output tokens: 141
```

Variance across movies is expected and comes from plot length and how many trailer comments passed the cleaning/ranking filter below — not from the optimizations themselves.

### Optimization 1 — Clean and rank comments before they hit the prompt

The original `filterComments()` in `app/lib/youtubeClient.ts` only dropped comments under 10 characters and took the first 10 in YouTube's `order=relevance` sequence. Raw noise — emoji strings, "first", self-promo spam — survived into the prompt and burned tokens without adding sentiment signal.

**Change:** strip emoji/URLs, filter obvious spam patterns (self-promo, "first", bare ordinal replies), sort by `likeCount` so the comments that make it into the prompt are the ones most likely to reflect real audience sentiment.

### Optimization 2 — Move the JSON schema out of the prompt text

The original prompt spelled out the desired JSON shape as instructions inside the prompt string itself ("Provide a JSON response with: - classification... - positive..."), roughly 150 tokens of boilerplate repeated on every call.

**Change:** moved the schema into `responseSchema` + `responseMimeType: 'application/json'` in the Gemini `config` object, enforced by the API instead of described in text. This also removed a failure mode: `parseAIResponse`'s try/catch was defensively guarding against malformed JSON from a model that was "asked nicely" in prose; a schema-enforced response doesn't need that guard in practice (kept as a defensive fallback, not removed).


### Bonus lever — caching + in-flight request dedup (redundant-call elimination, not token reduction)

The biggest inefficiency wasn't the size of any one call — it was that `analyzeCombined` had no caching at all, so every page visit to the same movie re-ran the full Gemini call from scratch, even though the YouTube data one layer up was already cached for 24h.

**Change:** wrapped the Gemini call in Next.js's `unstable_cache`, keyed by `[title, rating]`, revalidating every 7 days. Verified working from real logs — a repeat visit to an already-cached movie produces zero `callGemini invoked` lines and zero token cost:

```
GET /movies/tt0133093 200 in 993ms   # cached — no callGemini log, no token log at all
```

**A real bug found and fixed along the way:** the initial caching implementation had a cache-stampede race condition — `unstable_cache` only writes to its cache *after* a call resolves, so two concurrent requests for the same movie could both miss the cache and both fire a full paid Gemini call before either finished writing back:

```
[gemini] callGemini invoked
[gemini] callGemini invoked        # fired before the first had resolved — duplicate paid call
[gemini] prompt tokens: 302...
[gemini] prompt tokens: 302...
```

Fixed with an in-flight request lock (a module-level `Map<string, Promise<SentimentData>>` in `sentimentService.ts`): a second request for the same movie now awaits the first request's in-flight promise instead of starting its own. Verified fixed — concurrent requests for the same key now produce exactly one `callGemini invoked` line.

**Known limitation, stated honestly:** the in-flight lock is module-scope, so it only dedupes requests handled by the *same* server process/instance. On a platform running multiple serverless instances concurrently under load (e.g. Vercel), two different instances could still both miss at once. A fully distributed fix would need a shared lock (e.g. Redis) keyed the same way — out of scope for this app's traffic level, but worth naming as the next step rather than presenting the current fix as complete.

## Latency & Perceived Performance Optimizations

Token/cost and latency are related but genuinely separate optimization axes — a call can be cheap and still slow. The Part 1 changes above barely move latency (Gemini's response time is dominated by model inference and network round-trip, not by a few hundred fewer input tokens); the changes below don't save any tokens, they just stop the user from waiting on work that doesn't need to block them.

### The problem, measured

The original page architecture awaited four sequential API stages before sending any HTML to the browser: OMDb → (YouTube + cast/crew, in parallel) → Gemini. Real logged render times before this work: **8–11 seconds**, with the user looking at a blank page the entire time.

### Change 1 — A fast shell that awaits only what it needs

`page.tsx` now awaits exactly two things: `getMovieById` (OMDb) and `getTrailerWithComments` (YouTube). Measured combined latency on a cold request: **~1–1.5s**. Title, poster, rating, genre, plot, trailer video, and trailer comments all render together in that window — a ~7-8x improvement in time-to-first-meaningful-paint over the original waterfall, with no reduction in total work done, just no longer forcing the user to wait for the slowest stage before seeing anything.

### Change 2 — Only the genuinely slow part stays deferred

Measured breakdown on a cold, uncached movie:

```
[youtube] search call: 433ms
[youtube] comments call: 369ms
[gemini] prompt tokens: 326, output tokens: 113   (gemini total: ~4000ms)
```

Gemini is the dominant cost — roughly 4x the YouTube fetch. So it's the only piece still deferred: `SentimentCardClient` fetches sentiment client-side (via a Server Action, `sentimentAction.ts`) after the rest of the page has already rendered, instead of blocking the shell.

**Tradeoff stated honestly:** this means the Gemini call now starts slightly later than it theoretically could — after hydration and a `useEffect` fires, not as early as possible during server rendering. That's a deliberate trade: a page that's fully interactive immediately, in exchange for the AI-dependent section arriving a bit later than the absolute minimum possible.

### Change 3 — Cast/crew fetched only if the user asks for it

Cast/crew (the slowest of the four original external calls) is no longer fetched on page load at all. `CastTabContent.tsx` fetches it via a Server Action (`castAction.ts`) only when the user opens the Cast tab, with the result cached in the parent component's state so switching tabs back and forth doesn't refetch. For any visitor who never opens that tab — plausibly most of them — this eliminates an API call entirely rather than merely delaying it.

### Change 4 — Smooth reveal instead of a spinner-to-content pop-in

`SentimentCard` renders a loading variant (`sentiment: null` — pulsing "..." dots, 0%-width bars) immediately, then animates its bars filling in once real data arrives, rather than either an indefinite spinner or an instant, jarring snap to final values.

This needed more than a CSS `transition` rule. A first attempt deferred the sentiment section behind a `<Suspense>` boundary — but Suspense doesn't patch a fallback into its resolved content; it unmounts the fallback's DOM entirely and mounts a fresh tree when the boundary resolves. A brand-new element has no "previous width" for a CSS transition to interpolate from, so the bars would have just appeared already full, no animation, regardless of the CSS. The fix that actually works: fetch client-side into local state on one persistent component instance (`SentimentCardClient`), so the bar's width changes on a DOM node that's already mounted — which is the one condition a CSS `transition` actually needs to fire.