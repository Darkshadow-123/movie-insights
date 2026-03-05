import { NextRequest, NextResponse } from 'next/server';
import { omdbClient, youtubeClient, imdb8Client } from '@/app/lib';
import { sentimentService } from '@/app/services';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: imdbId } = await params;

  if (!imdbId) {
    return NextResponse.json({ error: 'IMDb ID is required' }, { status: 400 });
  }

  if (!/^tt\d{7,8}$/.test(imdbId)) {
    return NextResponse.json({ error: 'Invalid IMDb ID format' }, { status: 400 });
  }

  try {
    const movieData = await omdbClient.getMovieById(imdbId);
    if (movieData.Response === 'False') {
      return NextResponse.json({ error: movieData.Error || 'Movie not found' }, { status: 404 });
    }

    const [youtubeResult, castAndCrew] = await Promise.all([
      youtubeClient.getTrailerWithComments(movieData.Title || '', movieData.Year || ''),
      imdb8Client.getCastAndCrew(imdbId)
    ]);

    let sentiment, sentimentStatus = 'success';
    try {
      sentiment = await sentimentService.analyzeCombined(
        movieData.Title || '', 
        movieData.Plot || '', 
        movieData.imdbRating || '0', 
        youtubeResult.comments.comments
      );
    } catch (err) {
      sentiment = sentimentService.getFallbackSentiment(movieData.imdbRating || '0', movieData.Plot || '');
      sentimentStatus = 'fallback';
    }

    return NextResponse.json({
      ...movieData,
      trailerId: youtubeResult.trailerId,
      sentiment,
      sentimentStatus,
      trailerComments: youtubeResult.comments.comments.length > 0 ? youtubeResult.comments : null,
      youtubeStatus: youtubeResult.status,
      youtubeMessage: youtubeResult.statusMessage,
      castAndCrew: castAndCrew.error ? { cast: [], directors: [], writers: [] } : castAndCrew
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch movie data' }, { status: 500 });
  }
}
