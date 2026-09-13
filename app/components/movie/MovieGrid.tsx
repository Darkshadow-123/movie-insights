import { MovieSummary } from '@/app/types';
import { MovieCard } from './MovieCard';
import { MovieGridSkeleton } from './MovieGridSkeleton';

interface MovieGridProps {
  movies: MovieSummary[];
  loading?: boolean;
}

export function MovieGrid({ movies, loading = false }: MovieGridProps) {
  if (loading) {
    return <MovieGridSkeleton />;
  }

  if (!movies || movies.length === 0) {
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
        <MovieCard key={movie.watchmodeId} movie={movie} />
      ))}
    </div>
  );
}
