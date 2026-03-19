import { getMovieById, getTrailerWithComments, getCastAndCrew } from '@/app/lib';  
import { analyzeCombined, getFallbackSentiment } from '@/app/services/sentimentService';  
import { MovieData, SentimentData } from '@/app/types';
import { MovieDetailsClient } from './MovieDetailsClient';  
  
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
  
  // Step 1: Fetch basic movie data  
  const movieData = await getMovieById(imdbId);  
  if (movieData.Response === 'False') {  
    throw new Error(movieData.Error || 'Movie not found');  
  }  
  
  // Step 2: Fetch YouTube trailer and comments in parallel with cast/crew data  
  const [youtubeResult, castAndCrew] = await Promise.all([  
    getTrailerWithComments(movieData.Title || '', movieData.Year || ''),  
    getCastAndCrew(imdbId)  
  ]);  
  
  // Step 3: Analyze sentiment using AI with fallback  
  let sentiment: SentimentData;
  let sentimentStatus: 'success' | 'fallback' = 'success';
  try {
    sentiment = await analyzeCombined(  
      movieData.Title || '',  
      movieData.Plot || '',  
      movieData.imdbRating || '0',  
      youtubeResult.comments.comments  
    );  
  } catch (err) {  
    sentiment = getFallbackSentiment(movieData.imdbRating || '0', movieData.Plot || '');  
    sentimentStatus = 'fallback';  
  }  
  
  // Combine all data  
  const movieDetails = {  
    ...movieData,  
    trailerId: youtubeResult.trailerId,  
    sentiment,  
    sentimentStatus,  
    trailerComments: youtubeResult.comments.comments.length > 0 ? youtubeResult.comments : null,  
    youtubeStatus: youtubeResult.status,  
    youtubeMessage: youtubeResult.statusMessage,  
    castAndCrew: castAndCrew.error ? { cast: [] } : castAndCrew  
  };  
  
  return <MovieDetailsClient movie={movieDetails} />;  
}