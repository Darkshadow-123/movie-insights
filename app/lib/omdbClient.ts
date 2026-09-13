import { config } from './config';
import { OmdbApiResponse } from '../types';
import { unstable_cache } from 'next/cache';

const createErrorResponse = (error: string): OmdbApiResponse => ({
  Response: 'False',
  Error: error,
  Title: '', Year: '', Rated: '', Released: '', Runtime: '',
  Genre: '', Director: '', Actors: '', Plot: '', Poster: '',
  imdbRating: '', imdbVotes: '', imdbID: ''
});

const MAX_RETRIES = 2;
const TIMEOUT_MS = 5000;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function fetchWithRetryAndTimeout(url: string, init?: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Retry on 5xx errors
      if (response.status >= 500 && attempt < retries) {
        await delay(1000 * Math.pow(2, attempt)); // Exponential backoff: 1s, 2s
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err instanceof Error ? err : new Error(String(err));

      // Only retry network errors/aborts, not 4xx
      if (attempt < retries) {
        await delay(1000 * Math.pow(2, attempt));
        continue;
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries');
}

export async function getMovieById(imdbId: string): Promise<OmdbApiResponse> {
  if (!config.omdb.apiKey || config.omdb.apiKey.trim() === '') {
    return createErrorResponse('OMDB API key not configured');
  }

  const url = `${config.omdb.baseUrl}?i=${imdbId}&plot=full&apikey=${config.omdb.apiKey}`;

  try {
    const response = await fetchWithRetryAndTimeout(url, { next: { revalidate: 86400 } });

    if (!response.ok) {
      return createErrorResponse(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (data.Response === 'False') {
      if (data.Error?.toLowerCase().includes('limit') || data.Error?.toLowerCase().includes('quota')) {
        return createErrorResponse("This movie's details are temporarily unavailable due to API rate limits — please try again in a moment.");
      }
    }

    return data;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return createErrorResponse('Request timeout');
    }
    return createErrorResponse(`Network error: ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function fetchPosterUrlInternal(imdbId: string): Promise<string | null> {
  if (!config.omdb.apiKey || config.omdb.apiKey.trim() === '') {
    return null;
  }

  const url = `${config.omdb.baseUrl}?i=${imdbId}&apikey=${config.omdb.apiKey}`;

  try {
    const response = await fetchWithRetryAndTimeout(url, { next: { revalidate: 3600 * 24 * 7 } }); // Long cache for posters
    if (!response.ok) return null;

    const data = await response.json();
    if (data.Response === 'False' || data.Poster === 'N/A' || !data.Poster) {
      return null;
    }

    return data.Poster;
  } catch {
    return null;
  }
}

export const getPosterUrl = unstable_cache(
  async (imdbId: string) => fetchPosterUrlInternal(imdbId),
  ['omdb', 'poster'],
  { revalidate: 3600 * 24 * 7, tags: ['poster'] } // 7 days
);

async function fetchMovieBasicDataInternal(imdbId: string): Promise<{ poster: string | null, rating: string | null, votes: string | null, runtime: string | null, status: 'ok' | 'not_found' | 'quota_exceeded' }> {
  if (!config.omdb.apiKey || config.omdb.apiKey.trim() === '') {
    return { poster: null, rating: null, votes: null, runtime: null, status: 'ok' };
  }

  const url = `${config.omdb.baseUrl}?i=${imdbId}&apikey=${config.omdb.apiKey}`;

  try {
    const response = await fetchWithRetryAndTimeout(url, { next: { revalidate: 3600 * 24 * 7 } });
    if (!response.ok) {
      // If OMDb returns a 429 Too Many Requests, count it as quota exceeded
      const isRateLimit = response.status === 429;
      return { poster: null, rating: null, votes: null, runtime: null, status: isRateLimit ? 'quota_exceeded' : 'not_found' };
    }


    const data = await response.json();
    if (data.Response === 'False') {
      const isQuota = data.Error?.toLowerCase().includes('limit') || data.Error?.toLowerCase().includes('quota');
      return { poster: null, rating: null, votes: null, runtime: null, status: isQuota ? 'quota_exceeded' : 'not_found' };
    }

    return {
      poster: data.Poster !== 'N/A' && data.Poster ? data.Poster : null,
      rating: data.imdbRating !== 'N/A' && data.imdbRating ? data.imdbRating : null,
      votes: data.imdbVotes !== 'N/A' && data.imdbVotes ? data.imdbVotes : null,
      runtime: data.Runtime !== 'N/A' && data.Runtime ? data.Runtime : null,
      status: 'ok'
    };
  } catch {
    return { poster: null, rating: null, votes: null, runtime: null, status: 'not_found' };
  }
}

export const getMovieBasicData = unstable_cache(
  async (imdbId: string) => fetchMovieBasicDataInternal(imdbId),
  ['omdb', 'basic_data_v2'],
  { revalidate: 3600 * 24 * 7, tags: ['basic_data_v2'] }
);
