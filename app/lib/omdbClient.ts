import { config } from './config';
import { OmdbApiResponse } from '../types';

export async function getMovieById(imdbId: string): Promise<OmdbApiResponse> {
  const url = `${config.omdb.baseUrl}?i=${imdbId}&plot=full&apikey=${config.omdb.apiKey}`;
  const response = await fetch(url, { next: { revalidate: 86400 } });
  return response.json();
}
