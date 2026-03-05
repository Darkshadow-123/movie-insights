import { NextRequest, NextResponse } from 'next/server';
import { omdbClient, youtubeClient, imdb8Client } from '@/app/lib';
import { sentimentService } from '@/app/services';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Next.js 15+ requires awaiting params to get the actual route parameters
  const { id: imdbId } = await params;

  // Validate IMDb ID is provided
  if (!imdbId) {
    return NextResponse.json({ error: 'IMDb ID is required' }, { status: 400 });
  }

  // Validate IMDb ID format: 'tt' followed by 7 or 8 digits
  if (!/^tt\d{7,8}$/.test(imdbId)) {
    return NextResponse.json({ error: 'Invalid IMDb ID format' }, { status: 400 });
  }

  try {
    // Step 1: Fetch basic movie data from OMDB (title, plot, rating, poster, etc.)
    const movieData = await omdbClient.getMovieById(imdbId);
    if (movieData.Response === 'False') {
      return NextResponse.json({ error: movieData.Error || 'Movie not found' }, { status: 404 });
    }

    // Step 2: Fetch YouTube trailer and comments in parallel with cast/crew data
    // Using Promise.all for parallel execution to reduce overall response time
    const [youtubeResult, castAndCrew] = await Promise.all([
      youtubeClient.getTrailerWithComments(movieData.Title || '', movieData.Year || ''),
      imdb8Client.getCastAndCrew(imdbId)
    ]);

    // Step 3: Analyze sentiment using AI
    // Combines movie metadata (plot, rating) with YouTube comments if available
    // Falls back to basic sentiment if AI analysis fails
    let sentiment, sentimentStatus = 'success';
    try {
      sentiment = await sentimentService.analyzeCombined(
        movieData.Title || '', 
        movieData.Plot || '', 
        movieData.imdbRating || '0', 
        youtubeResult.comments.comments
      );
    } catch (err) {
      // Fallback: generate sentiment from rating and plot keywords if AI fails
      sentiment = sentimentService.getFallbackSentiment(movieData.imdbRating || '0', movieData.Plot || '');
      sentimentStatus = 'fallback';
    }

    // Return combined movie data with all enhancements
    return NextResponse.json({
      ...movieData,
      trailerId: youtubeResult.trailerId,
      sentiment,
      sentimentStatus,
      // Only include comments if there are any
      trailerComments: youtubeResult.comments.comments.length > 0 ? youtubeResult.comments : null,
      youtubeStatus: youtubeResult.status,
      youtubeMessage: youtubeResult.statusMessage,
      // Handle cast errors gracefully - return empty arrays if API failed
      castAndCrew: castAndCrew.error ? { cast: [], directors: [], writers: [] } : castAndCrew
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch movie data' }, { status: 500 });
  }
}
