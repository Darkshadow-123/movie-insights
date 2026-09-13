import { Suspense } from 'react';
import { MovieGrid } from "../components/movie/MovieGrid";
import { MovieGridSkeleton } from "../components/movie/MovieGridSkeleton";
import { getWishlistMovies } from "../actions/wishlistAction";
import { QuotaWarning } from "../components/common/QuotaWarning";

import { BackButton } from "../components/common/BackButton";

export const metadata = {
  title: 'My Wishlist | Brew AI Movie Insights',
};

export default async function WishlistPage() {
  const { data: movies, status, partialDataWarning } = await getWishlistMovies();

  // Create a Set of saved IDs since every movie on this page is saved by definition
  const savedMovieIds = new Set(movies?.map(m => m.imdbId) || []);

  return (
    <div className="wishlist-page">
      <div className="container">
        <BackButton />
        <div style={{ marginBottom: '32px' }}>
          <h1 className="section-title" style={{ fontSize: '32px', marginBottom: '8px' }}>
            My Wishlist
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>
            Movies you've saved to watch later.
          </p>
        </div>

        <Suspense fallback={<MovieGridSkeleton />}>
          {status === 'success' ? (
            <>
              <QuotaWarning show={partialDataWarning || false} />
              <MovieGrid 
                movies={movies || []} 
                savedMovieIds={savedMovieIds}
                isWishlistPage={true} 
              />
            </>
          ) : (
            <div className="error-card">
              <div className="error-icon">⚠️</div>
              <h3 className="error-title">Oops!</h3>
              <p className="error-message">Something went wrong while loading your wishlist. Please try again later.</p>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
}
