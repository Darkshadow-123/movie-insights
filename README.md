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

## Assumptions

- You have valid API keys for OMDb, Google Gemini, YouTube Data API, and RapidAPI (for IMDb-related endpoints) and have configured them in `.env.local` as shown above.
- Network access to these external APIs is available from the environment where the app is running.
- IMDb IDs provided by the user (for example, `tt0133093`) are valid and correspond to actual movies in the OMDb/IMDb ecosystem.
- This project is intended primarily as a demo / educational application and not as a production-ready system; hardening concerns such as rate limiting, full observability, and advanced security are out of scope.
