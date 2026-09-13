"use client";

import Link from 'next/link';
import { MovieSummary } from '@/app/types';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { WishlistToggle } from '../common/WishlistToggle';
import { useState } from 'react';

interface MovieCardProps {
  movie: MovieSummary;
  isSaved?: boolean;
  removeOnToggle?: boolean;
}

export function MovieCard({ movie, isSaved = false, removeOnToggle = false }: MovieCardProps) {
  const [hidden, setHidden] = useState(false);

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

  if (hidden) {
    return null;
  }

  return (
    <Link href={detailUrl} className="movie-card glass-card" style={{ position: 'relative' }}>
      <WishlistToggle 
        movie={movie} 
        isSaved={isSaved} 
        removeOnToggle={removeOnToggle}
        onHidden={() => setHidden(true)}
      />

      <div className="movie-card-poster">
        <ImageWithFallback 
          src={movie.poster || ''} 
          alt={`${movie.title} poster`} 
          loading="lazy" 
          fallback={
            <div className="poster-placeholder">
              🎬
            </div>
          }
        />
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
