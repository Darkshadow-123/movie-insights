'use server';

import { revalidatePath } from 'next/cache';
import { getOrCreateAnonId } from '../lib/identity';
import { addToWishlist, removeFromWishlist, getWishlistWithMeta } from '../lib/wishlistStore';
import { getMovieBasicData } from '../lib/omdbClient';
import { MovieSummary } from '../types';

export async function toggleWishlist(movie: MovieSummary, isCurrentlySaved: boolean): Promise<void> {
  const anonId = await getOrCreateAnonId();
  
  if (isCurrentlySaved) {
    await removeFromWishlist(anonId, movie.imdbId);
  } else {
    await addToWishlist(anonId, movie);
  }
  
  // Revalidate the wishlist path so UI updates automatically for server components
  revalidatePath('/wishlist');
}

export async function getWishlistMovies(): Promise<{
  data: MovieSummary[] | null;
  status: string;
  partialDataWarning?: boolean;
}> {
  try {
    const anonId = await getOrCreateAnonId();
    const wishlistMeta = await getWishlistWithMeta(anonId);
    
    if (wishlistMeta.length === 0) {
      return { data: [], status: 'success' };
    }
    
    let quotaExceededCount = 0;
    
    // Fetch live posters in parallel for the wishlist movies
    const enriched = await Promise.all(
      wishlistMeta.map(async (movie) => {
        if (movie.imdbId) {
          const basicData = await getMovieBasicData(movie.imdbId);
          movie.poster = basicData.poster;
          movie.rating = basicData.rating || undefined;
          movie.votes = basicData.votes || undefined;
          movie.runtime = basicData.runtime || undefined;
          
          if (basicData.status === 'quota_exceeded') {
            quotaExceededCount++;
          }
        }
        return movie;
      })
    );
    
    return {
      data: enriched,
      status: 'success',
      partialDataWarning: quotaExceededCount > 0
    };
  } catch (err) {
    console.error('Error fetching wishlist movies:', err);
    return { data: null, status: 'error' };
  }
}
