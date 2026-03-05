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

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your API keys:
   ```
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
