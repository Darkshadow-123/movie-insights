import Link from 'next/link';
import { MovieSummary } from '@/app/types';

interface MovieCardProps {
  movie: MovieSummary;
}

export function MovieCard({ movie }: MovieCardProps) {
  // We use IMDb ID for routing as detailed in the prompt
  const detailUrl = `/movies/${movie.imdbId}`;

  const renderStars = (rating: number) => {  
    const full = Math.floor(rating / 2);  
    const half = rating % 2 >= 1;  
    const empty = Math.max(0, 5 - full - (half ? 1 : 0));  
    return (  
      <>  
        {"★".repeat(full)}  
        {half && "½"}  
        {"☆".repeat(empty)}  
      </>  
    );  
  };

  return (
    <Link href={detailUrl} className="movie-card glass-card">
      <div className="movie-card-poster">
        {movie.poster && movie.poster !== 'N/A' ? (
          <img src={movie.poster} alt={`${movie.title} poster`} loading="lazy" />
        ) : (
          <div className="poster-placeholder">
            🎬
          </div>
        )}
      </div>
      <div className="movie-card-info" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div className="movie-card-header">
          <h3 className="movie-card-title" title={movie.title}>{movie.title}</h3>
          {movie.runtime && (
            <span className="movie-card-runtime">
              {movie.runtime}
            </span>
          )}
        </div>
        
        <div className="movie-card-meta-row" style={{ marginTop: 'auto', paddingTop: '12px', justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <span className="movie-card-year">
            {movie.year || 'Unknown Year'}
          </span>
          {movie.rating && (
            <div className="movie-card-rating">
              <span className="movie-card-stars">
                {renderStars(parseFloat(movie.rating) || 0)}
              </span>
              <span className="movie-card-score">
                {movie.rating}/10
              </span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
