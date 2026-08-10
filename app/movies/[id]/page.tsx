import { getMovieById, getTrailerWithComments } from '@/app/lib';
import { MovieDetailsClient } from './MovieDetailsClient';
import { SentimentCardClient } from './SentimentCardClient';

export default async function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: imdbId } = await params;

  // Validate IMDb ID format
  if (!/^tt\d{7,8}$/.test(imdbId)) {
    throw new Error('Invalid IMDb ID format');
  }

  // Fetched once, synchronously. Measured latency: OMDb + YouTube
  // together land around 1-1.5s on a cold (uncached) request.
  const movieData = await getMovieById(imdbId);
  if (movieData.Response === 'False') {
    throw new Error(movieData.Error || 'Movie not found');
  }

  const title = movieData.Title || '';
  const year = movieData.Year || '';

  const youtubeResult = await getTrailerWithComments(title, year);
  const trailerComments =
    youtubeResult.comments.comments.length > 0 ? youtubeResult.comments : null;

  return (
    <MovieDetailsClient
      movie={movieData}
      imdbId={imdbId}
      trailerId={youtubeResult.trailerId}
      youtubeStatus={youtubeResult.status}
      youtubeMessage={youtubeResult.statusMessage}
      trailerComments={trailerComments}
      // No Suspense boundary here anymore — SentimentCardClient is a
      // client component that manages its own loading state (see
      // SentimentCard's `sentiment: null` loading variant) and fetches
      // client-side after mount, the same pattern already used for
      // CastTabContent below.
      sentimentSection={
        <SentimentCardClient
          title={title}
          plot={movieData.Plot || ''}
          rating={movieData.imdbRating || '0'}
          comments={youtubeResult.comments.comments}
        />
      }
    />
  );
}