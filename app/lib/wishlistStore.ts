import { redis } from './redis';
import { MovieSummary } from '../types';

export async function addToWishlist(anonId: string, movie: MovieSummary): Promise<void> {
  try {
    await Promise.all([
      redis.zadd(`wishlist:${anonId}`, { score: Date.now(), member: movie.imdbId }),
      redis.hset(`wishlist:${anonId}:meta`, { [movie.imdbId]: JSON.stringify({ 
        title: movie.title, 
        year: movie.year, 
        type: movie.type 
      }) }),
    ]);
  } catch (error) {
    console.error('Failed to add to wishlist Redis store:', error);
    throw error;
  }
}

export async function removeFromWishlist(anonId: string, imdbId: string): Promise<void> {
  try {
    await Promise.all([
      redis.zrem(`wishlist:${anonId}`, imdbId),
      redis.hdel(`wishlist:${anonId}:meta`, imdbId),
    ]);
  } catch (error) {
    console.error('Failed to remove from wishlist Redis store:', error);
    throw error;
  }
}

export async function getWishlistIds(anonId: string): Promise<string[]> {
  try {
    // Return an array of imdbIds, most recently added first
    return await redis.zrange<string[]>(`wishlist:${anonId}`, 0, -1, { rev: true });
  } catch (error) {
    console.error('Failed to get wishlist IDs from Redis store:', error);
    return [];
  }
}

export async function getWishlistWithMeta(anonId: string): Promise<MovieSummary[]> {
  try {
    const ids = await redis.zrange<string[]>(`wishlist:${anonId}`, 0, -1, { rev: true });
    if (ids.length === 0) return [];
    
    // One round trip for all metadata
    const metaMap = await redis.hmget<Record<string, string>>(`wishlist:${anonId}:meta`, ...ids);
    if (!metaMap) return [];
    
    return ids.map(id => {
      const metaData = metaMap[id];
      let meta = { title: 'Unknown', year: null, type: 'movie' };
      if (metaData) {
        meta = typeof metaData === 'string' ? JSON.parse(metaData) : metaData;
      }
      return {
        imdbId: id,
        watchmodeId: 0, // Fallback since we don't store Watchmode ID in the hash, only needed for details page
        title: meta.title,
        year: meta.year,
        type: meta.type,
      };
    });
  } catch (error) {
    console.error('Failed to get wishlist with metadata from Redis store:', error);
    return [];
  }
}

export async function isInWishlist(anonId: string, imdbId: string): Promise<boolean> {
  try {
    const score = await redis.zscore(`wishlist:${anonId}`, imdbId);
    return score !== null;
  } catch (error) {
    console.error('Failed to check wishlist status in Redis store:', error);
    return false;
  }
}
