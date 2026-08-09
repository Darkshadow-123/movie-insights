# Movie Insights

A Next.js web application that provides comprehensive movie information including cast details, ratings, plot summaries, trailers, and AI-powered audience sentiment analysis.

## Features

- Search movies by IMDb ID
- View detailed movie information (title, year, runtime, genres, plot)
- Display movie posters and trailers from YouTube
- Cast and crew information
- AI-powered sentiment analysis using Google Gemini
- YouTube trailer comments analysis
- Responsive design with modern UI

## Tech Stack

- **Frontend**: Next.js, React, TypeScript
- **Styling**: CSS Modules, Glassmorphism design
- **APIs**: OMDb API, YouTube Data API, Google Gemini AI

### Tech Stack Rationale

- **Next.js + React**: Enables server-side rendering, app router, and an excellent developer experience, resulting in fast movie search/detail pages and SEO-friendly content.
- **TypeScript**: Adds static typing for safer refactoring and better tooling as the app grows and integrates multiple external APIs.
- **CSS Modules + Glassmorphism**: Keeps styles scoped to components while enabling a modern, visually rich UI without global CSS conflicts.
- **OMDb API**: Provides core movie metadata (title, year, plot, cast, etc.) with a straightforward interface.
- **YouTube Data API**: Supplies official trailers and user comments to deepen the movie insight experience.
- **Google Gemini AI**: Powers sentiment analysis and higher-level insights on audience reactions based on trailer comments.

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with your API keys:
   ```bash
   OMDB_API_KEY=your_omdb_api_key
   GEMINI_API_KEY=your_gemini_api_key
   YOUTUBE_API_KEY=your_youtube_api_key
   RAPIDAPI_KEY=your_rapidapi_key
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

### Testing

- **Unit tests** (Jest + React Testing Library):
  ```bash
  npm test
  ```
  This runs the basic unit tests under the `__tests__/` folder (for example, the `ErrorDisplay` component test).

## Usage

1. Enter a valid IMDb ID (e.g., `tt0133093` for The Matrix)
2. Click Search or press Enter
3. View movie details, cast, and sentiment analysis

## Project Structure

```
app/
├── api/
│   ├── movie/route.ts         # Search by title
│   └── movies/[id]/route.ts   # Full movie details
├── components/
│   ├── common/
│   │   ├── ErrorDisplay.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── Tabs.tsx + Tabs.module.css
│   ├── layout/
│   │   ├── Navbar.tsx + Navbar.module.css
│   │   └── index.ts
│   └── movie/
│       ├── CastGrid.tsx
│       ├── SentimentCard.tsx
│       ├── TrailerComments.tsx
│       ├── TrailerPlayer.tsx
│       └── YouTubeStatusBanner.tsx
├── lib/                       # API clients
├── services/                  # Business logic
├── types/                     # TypeScript types
├── movies/[id]/page.tsx       # Movie detail page
├── globals.css                # All styles
├── layout.tsx                # Root layout
└── page.tsx                  # Home page

```
## Optimizations made

```

Token/Cost Optimization

The AI call in this app (analyzeCombined in app/services/sentimentService.ts) is a single Gemini call per movie page, not a multi-step agent pipeline — so it never had a 100K-token problem to begin with. The optimizations below are the same techniques that matter at agent-pipeline scale, applied here and measured on the real, working system rather than a synthetic example.

A note on the numbers

While making these changes, gemini-2.5-flash (the model this project originally used) was deprecated for new API keys mid-project (see "Debugging" below). That means there's no clean single "before" number on a live model to diff against — the original prompt design was measured on a now-dead model, and everything after the fix runs on gemini-3.5-flash-lite. Rather than presenting an apples-to-oranges "before/after" percentage, the numbers below are real usageMetadata.promptTokenCount values logged from the running app, across three different movies, on the current prompt design:

tt0468569: prompt tokens: 302, output tokens: 94
tt1160419: prompt tokens: 404, output tokens: 118
tt0418763: prompt tokens: 423, output tokens: 141

Variance across movies is expected and comes from plot length and how many trailer comments passed the cleaning/ranking filter below — not from the optimizations themselves.

Optimization 1 — Clean and rank comments before they hit the prompt (10 → 6)

The original filterComments() in app/lib/youtubeClient.ts only dropped comments under 10 characters and took the first 10 in YouTube's order=relevance sequence. Raw noise — emoji strings, "first", self-promo spam — survived into the prompt and burned tokens without adding sentiment signal.

Change: strip emoji/URLs, filter obvious spam patterns (self-promo, "first", bare ordinal replies), sort by likeCount so the comments that make it into the prompt are the ones most likely to reflect real audience sentiment, and cap at 6 instead of 10.

Tradeoff: capping at 6 risks dropping a minority opinion that would have shown up in comment #7–10. For a small sample size (rarely more than a few dozen relevant comments on a trailer), this is a reasonable bet, but it is a real tradeoff, not a free win.

Optimization 2 — Move the JSON schema out of the prompt text

The original prompt spelled out the desired JSON shape as instructions inside the prompt string itself ("Provide a JSON response with: - classification... - positive..."), roughly 150 tokens of boilerplate repeated on every call.

Change: moved the schema into responseSchema + responseMimeType: 'application/json' in the Gemini config object, enforced by the API instead of described in text. This also removed a failure mode: parseAIResponse's try/catch was defensively guarding against malformed JSON from a model that was "asked nicely" in prose; a schema-enforced response doesn't need that guard in practice (kept as a defensive fallback, not removed).

Optimization 3 — Model tiering to gemini-3.5-flash-lite

Found while debugging the 404 described below, but it's a legitimate cost optimization in its own right: this task is single-shot classification plus a 3–4 sentence summary, not complex reasoning or agentic tool use — exactly the workload a Lite-tier model is built for. gemini-3.5-flash-lite runs at $0.10/$0.40 per million tokens (in/out) vs. $1.50/$7.50 for the current full Flash model — roughly a 15x cost reduction on top of the token-count reductions above, just from matching model capability to task complexity.

Tradeoff: Lite-tier models trade off some nuance on ambiguous or sarcastic comments compared to full Flash. For short-comment ternary sentiment classification, that's a good bet — but worth stating rather than assuming.

Bonus lever — caching + in-flight request dedup (redundant-call elimination, not token reduction)

The biggest inefficiency wasn't the size of any one call — it was that analyzeCombined had no caching at all, so every page visit to the same movie re-ran the full Gemini call from scratch, even though the YouTube data one layer up was already cached for 24h.

Change: wrapped the Gemini call in Next.js's unstable_cache, keyed by [title, rating], revalidating every 7 days. Verified working from real logs — a repeat visit to an already-cached movie produces zero callGemini invoked lines and zero token cost:

GET /movies/tt0133093 200 in 993ms   # cached — no callGemini log, no token log at all

A real bug found and fixed along the way: the initial caching implementation had a cache-stampede race condition — unstable_cache only writes to its cache after a call resolves, so two concurrent requests for the same movie could both miss the cache and both fire a full paid Gemini call before either finished writing back:

[gemini] callGemini invoked
[gemini] callGemini invoked        # fired before the first had resolved — duplicate paid call
[gemini] prompt tokens: 302...
[gemini] prompt tokens: 302...

Fixed with an in-flight request lock (a module-level Map<string, Promise<SentimentData>> in sentimentService.ts): a second request for the same movie now awaits the first request's in-flight promise instead of starting its own. Verified fixed — concurrent requests for the same key now produce exactly one callGemini invoked line.

Known limitation, stated honestly: the in-flight lock is module-scope, so it only dedupes requests handled by the same server process/instance. On a platform running multiple serverless instances concurrently under load (e.g. Vercel), two different instances could still both miss at once. A fully distributed fix would need a shared lock (e.g. Redis) keyed the same way — out of scope for this app's traffic level, but worth naming as the next step rather than presenting the current fix as complete.

```

## Assumptions

- You have valid API keys for OMDb, Google Gemini, YouTube Data API, and RapidAPI (for IMDb-related endpoints) and have configured them in `.env.local` as shown above.
- Network access to these external APIs is available from the environment where the app is running.
- IMDb IDs provided by the user (for example, `tt0133093`) are valid and correspond to actual movies in the OMDb/IMDb ecosystem.
- This project is intended primarily as a demo / educational application and not as a production-ready system; hardening concerns such as rate limiting, full observability, and advanced security are out of scope.
