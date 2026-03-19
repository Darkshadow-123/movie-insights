import { config } from './config';
import { OmdbApiResponse } from '../types';

const createErrorResponse = (error: string): OmdbApiResponse => ({
  Response: 'False',
  Error: error,
  Title: '', Year: '', Rated: '', Released: '', Runtime: '',
  Genre: '', Director: '', Actors: '', Plot: '', Poster: '',
  imdbRating: '', imdbVotes: '', imdbID: ''
});

export async function getMovieById(imdbId: string): Promise<OmdbApiResponse> {
  if (!config.omdb.apiKey || config.omdb.apiKey.trim() === '') {
    return createErrorResponse('OMDB API key not configured');
  }

  const url = `${config.omdb.baseUrl}?i=${imdbId}&plot=full&apikey=${config.omdb.apiKey}`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  
  if (!response.ok) {
    return createErrorResponse(`HTTP error: ${response.status}`);
  }
  
  return response.json();
}
