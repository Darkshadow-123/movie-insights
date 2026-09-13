# Movie Insights - Movie Discovery App

A Next.js full-stack web application that allows users to discover movies, browse by genre, search by title, and view comprehensive movie information including cast details, ratings, plot summaries, trailers, and AI-powered audience sentiment analysis.

*Note: This repository contains an existing codebase that predates the full-stack assignment. The core UI for the movie detail page, sentiment analysis pipeline, YouTube trailer comments integration, and Upstash Redis caching were pre-existing. The Browse, Search by Title, Pagination, Filters, and Watchmode API integrations were built specifically for this assignment pass.*

## Features

- **Discover & Browse**: Explore popular movies or filter them by genre.
- **Search with Autocomplete**: Search for movies by title with a debounced, live typeahead dropdown.
- **My Wishlist**: Bookmark movies to a persistent wishlist using anonymous cookie-based identity.
- **Movie Details**: View detailed information (title, year, runtime, genres, plot).
- **Posters & Media**: Display movie posters and trailers from YouTube.
- **AI Sentiment Analysis**: AI-powered insights on audience reactions based on trailer comments using Google Gemini.
- **Responsive UI**: Glassmorphism design system that adapts perfectly to desktop, tablet, and mobile screens with responsive grids and fluid layouts.
- **Resilience**: Sophisticated multi-layer caching, distributed locking, and graceful fallbacks for external APIs.

## Tech Stack & Architecture

- **Frontend**: Next.js (App Router), React 19, TypeScript
- **Styling**: Vanilla CSS, Glassmorphism design
- **State Management**: URL Search Parameters (for shareable, stateful URLs)
- **APIs & Caching**: Upstash Redis (caching and distributed locks), Next.js `unstable_cache`

### Database Schema (Redis)
We use a lightweight, NoSQL approach in Upstash Redis for persistent wishlists, avoiding the cold-start overhead of relational databases:
- `user:{anonId}:wishlist` (**ZSET**): Stores the chronological ordering of saved movies. The score is the Unix timestamp, and the member is the `imdbId`.
- `movie:{imdbId}` (**HASH**): Stores the denormalized movie metadata payload (title, poster, year, rating). This serves as a global cache shared across all users to minimize external API roundtrips.

### Three-Source Data Architecture
This application abstracts movie data through a bespoke backend orchestration layer integrating three independent external services:
1. **Watchmode API (Discovery)**: Used strictly for list/browse, genre data, and search. It's cost-effective for querying but charges extra for IMDb lookups, so it serves purely as our "discovery engine."
2. **OMDb API (Details & Posters)**: Used for retrieving high-quality movie posters and the comprehensive detail data (plot, actors, runtime). Watchmode IDs are mapped to IMDb IDs, which are passed to OMDb.
3. **Google Gemini (Sentiment Analysis)**: Used to analyze YouTube trailer comments and compute an aggregate audience sentiment score, supplementing the traditional 1-10 IMDb rating.

## Advanced Caching & Resiliency (`sentimentService.ts`)

A standout piece of the pre-existing backend architecture is the 3-Tier Multi-Layer Caching & Distributed Lock system used for AI Sentiment Analysis:
1. **In-Flight Request Deduplication (Memory)**: Prevents the same Node process from firing identical API calls simultaneously.
2. **Next.js Data Cache**: A fast, local server revalidation cache (`unstable_cache`).
3. **Upstash Redis Distributed Lock**: Solves the "Cache Stampede" problem for serverless functions. A global, cross-instance persistent shared cache and atomic lock ensure that concurrent lambdas wait for a single leader to fetch the expensive Gemini response, reducing AI costs by >99%.
4. **Graceful Fallbacks**: If Gemini rate-limits or fails, the server action seamlessly falls back to a deterministic heuristic based on plot keywords and IMDb rating, ensuring zero downtime for the user.

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env.local` file with your API keys:
   ```bash
   WATCHMODE_API_KEY=your_watchmode_api_key
   OMDB_API_KEY=your_omdb_api_key
   GEMINI_API_KEY=your_gemini_api_key
   YOUTUBE_API_KEY=your_youtube_api_key
   RAPIDAPI_KEY=your_rapidapi_key
   UPSTASH_REDIS_REST_URL=your_upstash_url
   UPSTASH_REDIS_REST_TOKEN=your_upstash_token
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:3000](http://localhost:3000)

## Approach Taken

The core philosophy behind this implementation was to build a robust **Backend-for-Frontend (BFF)** abstraction layer using Next.js Server Actions. Rather than having the client talk directly to external APIs (Watchmode, OMDb, Gemini), the server orchestrates these calls, handles API quotas, implements resilient fallback mechanisms (like exponential backoffs), and merges disparate data sources into clean TypeScript models.

I focused heavily on **URL-Driven State** for the discovery experience. By pushing all search, filter, and pagination state into URL query parameters, the application natively supports deep-linking, back-button navigation without losing context, and server-side rendering for instant page loads.

For the **Wishlist**, rather than introducing the friction of a full authentication flow or relying on ephemeral `localStorage` (which fails during Server-Side Rendering), I implemented a lazy-initialized anonymous identity system stored in secure `httpOnly` cookies. This identity keys into a persistent Upstash Redis datastore, ensuring wishlists survive browser restarts and are fully available during the initial server paint.

## Important Technical Decisions

- **URL-Driven State**: All browse state (`genre`, `sort`, `page`, `q`) is driven entirely by URL search parameters instead of React state. This fulfills the requirement to navigate between detail views and the grid without losing context, and allows users to bookmark specific queries.
- **Server Actions over API Routes**: The application relies entirely on Next.js Server Actions (`app/actions/*.ts`) rather than traditional REST `app/api` routes. This removes the need for client-side data fetching libraries and significantly speeds up rendering.
- **Debounced Autocomplete**: Search inputs are wrapped in a custom `useDebouncedValue` hook (~300ms) to prevent rate-limiting the Watchmode API while a user is actively typing.
- **Anonymous Cookie Identity**: Instead of implementing full authentication (e.g., NextAuth/Auth.js) for the wishlist, the app uses a lazy-initialized UUID stored in an `httpOnly`, 1-year expiry cookie. This removes login friction, aligning with a public discovery tool, though it limits cross-device sync.
- **Redis Sorted Sets for Wishlist**: The wishlist avoids relational databases in favor of Upstash Redis `ZSET` (for ordering) and `HASH` (for metadata payloads). This sidesteps the Vercel ephemeral-filesystem constraints (which breaks SQLite in production) and avoids the heavy provisioning overhead of a Postgres instance for a simple feature.

## Assumptions Made
- **API Availability**: Assumes Watchmode and OMDb are reachable. If they degrade, the application attempts exponential backoffs to recover gracefully.
- **Client Capabilities**: Assumes the user's browser accepts standard HTTP cookies, which is required for anonymous wishlist identity.
- **API Quotas**: Assumes free-tier API quotas are sufficient for evaluation and testing.

## Known Limitations
- **Wishlist Sync**: Because the wishlist relies on anonymous `httpOnly` cookies, it cannot be synced across different devices or browsers, and will be lost if the user completely clears their browser data.
- **Watchmode Images**: Watchmode's standard `list-titles` endpoint does not return poster URLs on the free tier. I worked around this by mapping the returned `imdb_id` back through the OMDb API, which creates a slight dependency chain but avoids missing images.

## AI Tools Used
Used AI (Cursor/Gemini) to understand the third-party API documentation (Watchmode/Upstash), generate initial React component boilerplate, and troubleshoot hydration/hydration-mismatch errors during layout adjustments. 

The API architecture, three-source orchestration strategy, database structure (Redis), caching implementations, and overall application behavior were based on my own product and technical decisions.

## What I Would Improve With More Time
- **Full Authentication**: Implement full OAuth (e.g., NextAuth/Auth.js) so users can explicitly log in and sync their wishlists across multiple devices.
- **Infinite Scroll**: Introduce infinite scroll via Intersection Observers rather than traditional click-based pagination for a more modern mobile browsing experience.
- **Cache Pre-Warming**: Pre-warm the Next.js Data Cache for the top 100 trending movies via a cron job to make the initial browse experience instantly fast for the majority of traffic.
- **E2E Testing**: Add Cypress or Playwright integration tests covering the critical user flow of discovering a movie, clicking into details, and saving it to the wishlist.

---

## Project Structure

```text
app/
├── actions/
│   ├── discoverAction.ts      # Watchmode API orchestration 
│   ├── searchAction.ts        # Legacy IMDb lookup
│   ├── sentimentAction.ts     # Resilient AI fetch
│   ├── castAction.ts          
│   └── wishlistAction.ts      # Redis wishlist operations
├── components/
│   ├── layout/
│   │   └── Navbar.tsx         # Global responsive navigation
│   ├── MovieGrid.tsx          # Browse grid with skeletons
│   ├── MovieCard.tsx          # Single poster UI
│   ├── FilterBar.tsx          # URL-driven select dropdowns
│   ├── Pagination.tsx         
│   └── SearchForm.tsx         # Live autocomplete input
├── hooks/
│   └── useDebouncedValue.ts   # Rate-limiting typing
├── lib/                       # Thin API clients
│   ├── watchmodeClient.ts
│   ├── omdbClient.ts
│   ├── redis.ts               
│   ├── identity.ts            # Anonymous cookie logic
│   └── wishlistStore.ts       # Upstash Redis wrapper
├── services/                  # Business logic
│   └── sentimentService.ts    # 4-tier caching layer
├── types/                     # TypeScript definitions
├── movies/[id]/page.tsx       # Movie detail view
├── wishlist/page.tsx          # My Wishlist view
├── page.tsx                   # Homepage / Browse View
└── globals.css                # Glassmorphism design system
```