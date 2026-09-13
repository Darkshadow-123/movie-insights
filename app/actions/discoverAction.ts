'use server';

import {
  listTitles,
  searchTitles,
  autocompleteSearch,
  getGenres,
  WatchmodeApiError
} from '../lib/watchmodeClient';
import { getPosterUrl, getMovieBasicData } from '../lib/omdbClient';
import {
  MovieSummary,
  Genre,
  WatchmodeStatus
} from '../types';

export interface DiscoverResult<T> {
  data: T | null;
  status: WatchmodeStatus;
  message?: string;
  page?: number;
  totalPages?: number;
}

const handleWatchmodeError = (err: unknown): DiscoverResult<any> => {
  if (err instanceof WatchmodeApiError) {
    return { data: null, status: err.status, message: err.message };
  }
  return { 
    data: null, 
    status: 'error', 
    message: err instanceof Error ? err.message : String(err) 
  };
};

export async function browseMovies(filters: {
  genres?: string;
  sortBy?: string;
  page?: number;
  limit?: number;
}): Promise<DiscoverResult<MovieSummary[]>> {
  try {
    const res = await listTitles(filters);
    
    // Safely map to MovieSummary
    const titles = res.titles || [];
    const summaries: MovieSummary[] = titles.map(t => ({
      imdbId: t.imdb_id,
      watchmodeId: t.id,
      title: t.title,
      year: t.year,
      type: t.type,
    }));
    
    // Fetch posters in parallel using the cached omdb client
    const withPosters = await Promise.all(
      summaries.map(async (movie) => {
        if (movie.imdbId) {
          const basicData = await getMovieBasicData(movie.imdbId);
          movie.poster = basicData.poster;
          movie.rating = basicData.rating || undefined;
          movie.votes = basicData.votes || undefined;
          movie.runtime = basicData.runtime || undefined;
        }
        return movie;
      })
    );
    
    return {
      data: withPosters,
      status: 'success',
      page: res.page,
      totalPages: res.total_pages
    };
  } catch (err) {
    return handleWatchmodeError(err);
  }
}

export async function searchMoviesByTitle(query: string, sortBy: string = 'popularity_desc'): Promise<DiscoverResult<MovieSummary[]>> {
  try {
    const res = await searchTitles(query);
    
    const results = res.title_results || [];
    const summaries: MovieSummary[] = results.map(t => ({
      imdbId: t.imdb_id,
      watchmodeId: t.id,
      title: t.name,
      year: t.year,
      type: t.type,
      poster: t.image_url || null, // Search sometimes returns image_url
    }));
    
    // Fetch details for those that don't have them, and get imdbVotes for sorting
    const enriched = await Promise.all(
      summaries.map(async (movie) => {
        if (movie.imdbId) {
          const basicData = await getMovieBasicData(movie.imdbId);
          if (!movie.poster && basicData.poster) {
             movie.poster = basicData.poster;
          }
          movie.rating = basicData.rating || undefined;
          movie.votes = basicData.votes || undefined;
          movie.runtime = basicData.runtime || undefined;
          (movie as any)._votes = parseInt((basicData.votes || '0').replace(/,/g, ''), 10) || 0;
        }
        return movie;
      })
    );
    
    // Sort logic
    if (sortBy === 'release_date_desc') {
      enriched.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else if (sortBy === 'release_date_asc') {
      enriched.sort((a, b) => (a.year || 9999) - (b.year || 9999));
    } else if (sortBy === 'popularity_asc') {
      enriched.sort((a, b) => ((a as any)._votes || 0) - ((b as any)._votes || 0));
    } else {
      // Default to popularity_desc
      enriched.sort((a, b) => ((b as any)._votes || 0) - ((a as any)._votes || 0));
    }
    
    return {
      data: enriched,
      status: 'success'
    };
  } catch (err) {
    return handleWatchmodeError(err);
  }
}

export async function getAutocompleteSuggestions(query: string): Promise<DiscoverResult<MovieSummary[]>> {
  try {
    const res = await autocompleteSearch(query);
    
    const results = res.results || [];
    const summaries: MovieSummary[] = results.map(t => ({
      imdbId: t.imdb_id,
      watchmodeId: t.id,
      title: t.name,
      year: t.year,
      type: t.type,
      poster: t.image_url || null, // Autocomplete typically returns image_url
    }));
    
    return {
      data: summaries,
      status: 'success'
    };
  } catch (err) {
    return handleWatchmodeError(err);
  }
}

export async function getGenreList(): Promise<DiscoverResult<Genre[]>> {
  try {
    const genres = await getGenres();
    if (!Array.isArray(genres)) {
      return { data: [], status: 'error', message: 'Invalid genres format' };
    }
    return {
      data: genres,
      status: 'success'
    };
  } catch (err) {
    return handleWatchmodeError(err);
  }
}
