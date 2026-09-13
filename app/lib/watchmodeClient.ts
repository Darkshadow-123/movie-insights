import { config } from './config';
import { unstable_cache } from 'next/cache';
import {
  ListTitlesResponse,
  SearchResponse,
  AutocompleteResponse,
  Genre,
  WatchmodeStatus
} from '../types';

export class WatchmodeApiError extends Error {
  public status: WatchmodeStatus;
  
  constructor(message: string, status: WatchmodeStatus = 'error') {
    super(message);
    this.status = status;
    this.name = 'WatchmodeApiError';
  }
}

const checkApiKey = () => {
  if (!config.watchmode.apiKey || config.watchmode.apiKey.trim() === '') {
    throw new WatchmodeApiError('Watchmode API key not configured', 'no_api_key');
  }
};

const handleResponseError = async (response: Response) => {
  if (!response.ok) {
    if (response.status === 429) {
      throw new WatchmodeApiError('Watchmode API quota exceeded or rate limited', 'quota_exceeded');
    }
    
    // Watchmode can sometimes return 402 Payment Required for quotas
    if (response.status === 402) {
        throw new WatchmodeApiError('Watchmode API monthly quota exceeded', 'quota_exceeded');
    }
    
    const text = await response.text().catch(() => '');
    throw new WatchmodeApiError(`Watchmode API error: ${response.status} ${response.statusText} - ${text}`);
  }
};

export async function listTitles(params: {
  genres?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}): Promise<ListTitlesResponse> {
  checkApiKey();
  
  const searchParams = new URLSearchParams({
    apiKey: config.watchmode.apiKey,
    types: 'movie',
  });
  
  if (params.genres) {
    searchParams.append('genres', params.genres);
  }
  if (params.sortBy) {
    searchParams.append('sort_by', params.sortBy);
  }
  if (params.page) {
    searchParams.append('page', params.page.toString());
  }
  if (params.limit) {
    searchParams.append('limit', params.limit.toString());
  }
  
  const url = `${config.watchmode.baseUrl}/v1/list-titles/?${searchParams.toString()}`;
  
  // Use Next.js fetch cache. Cache per unique URL with a multi-hour revalidate window
  const response = await fetch(url, {
    next: { revalidate: 3600 * 4 }, // 4 hours
  });
  
  await handleResponseError(response);
  const data = await response.json();
  if (data.success === false) {
    throw new WatchmodeApiError(`Watchmode API error: ${data.status_message || data.error_message || 'Unknown error'}`);
  }
  return data;
}

export async function searchTitles(query: string): Promise<SearchResponse> {
  checkApiKey();
  
  const searchParams = new URLSearchParams({
    apiKey: config.watchmode.apiKey,
    search_field: 'name',
    search_value: query,
    types: 'movie',
  });
  
  const url = `${config.watchmode.baseUrl}/v1/search/?${searchParams.toString()}`;
  
  // No aggressive caching for open search
  const response = await fetch(url, {
    cache: 'no-store',
  });
  
  await handleResponseError(response);
  const data = await response.json();
  if (data.success === false) {
    throw new WatchmodeApiError(`Watchmode API error: ${data.status_message || data.error_message || 'Unknown error'}`);
  }
  return data;
}

export async function autocompleteSearch(query: string): Promise<AutocompleteResponse> {
  checkApiKey();
  
  const searchParams = new URLSearchParams({
    apiKey: config.watchmode.apiKey,
    search_value: query,
    search_type: '3', // 3 = movies only
  });
  
  const url = `${config.watchmode.baseUrl}/v1/autocomplete-search/?${searchParams.toString()}`;
  
  // Per-keystroke, do not cache
  const response = await fetch(url, {
    cache: 'no-store',
  });
  
  await handleResponseError(response);
  const data = await response.json();
  if (data.success === false) {
    throw new WatchmodeApiError(`Watchmode API error: ${data.status_message || data.error_message || 'Unknown error'}`);
  }
  return data;
}

// Internal function to fetch genres (used by the cached version)
async function fetchGenresInternal(): Promise<Genre[]> {
  checkApiKey();
  
  const searchParams = new URLSearchParams({
    apiKey: config.watchmode.apiKey,
  });
  
  const url = `${config.watchmode.baseUrl}/v1/genres/?${searchParams.toString()}`;
  
  const response = await fetch(url, {
    next: { revalidate: 3600 * 24 * 7 }, // fallback fetch cache, 7 days
  });
  
  await handleResponseError(response);
  const data = await response.json();
  if (data.success === false) {
    throw new WatchmodeApiError(`Watchmode API error: ${data.status_message || data.error_message || 'Unknown error'}`);
  }
  return data;
}

export const getGenres = unstable_cache(
  async () => fetchGenresInternal(),
  ['watchmode', 'genres'],
  { revalidate: 3600 * 24 * 7, tags: ['genres'] } // 7-day TTL
);
