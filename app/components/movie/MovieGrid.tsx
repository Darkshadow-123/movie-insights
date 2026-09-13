import { MovieSummary } from '@/app/types';
import { MovieCard } from './MovieCard';
import { MovieGridSkeleton } from './MovieGridSkeleton';

interface MovieGridProps {
  movies: MovieSummary[];
  loading?: boolean;
  savedMovieIds?: Set<string>;
  isWishlistPage?: boolean;
}

export function MovieGrid({ 
  movies, 
  loading = false, 
  savedMovieIds = new Set(), 
  isWishlistPage = false 
}: MovieGridProps) {
  if (loading) {
    return <MovieGridSkeleton />;
  }

  if (!movies || movies.length === 0) {
    if (isWishlistPage) {
      return (
        <div className="error-card" style={{ marginTop: '32px' }}>
          <div className="error-icon">🖤</div>
          <h3 className="error-title">Nothing saved yet</h3>
          <p className="error-message">Browse and tap the heart icon to save movies here.</p>
        </div>
      );
    }
    return (
      <div className="error-card" style={{ marginTop: '32px' }}>
        <div className="error-icon">🍿</div>
        <h3 className="error-title">No Movies Found</h3>
        <p className="error-message">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="movie-grid">
      {movies.map((movie) => (
        <MovieCard 
          key={movie.imdbId || movie.watchmodeId} 
          movie={movie} 
          isSaved={savedMovieIds.has(movie.imdbId)}
          removeOnToggle={isWishlistPage}
        />
      ))}
    </div>
  );
}
