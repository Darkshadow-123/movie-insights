"use client";

import { useState } from 'react';
import { MovieSummary } from '@/app/types';
import { toggleWishlist } from '@/app/actions/wishlistAction';

interface WishlistToggleProps {
  movie: MovieSummary;
  isSaved?: boolean;
  removeOnToggle?: boolean;
  className?: string;
  onHidden?: () => void;
}

export function WishlistToggle({ 
  movie, 
  isSaved = false, 
  removeOnToggle = false,
  className = '',
  onHidden
}: WishlistToggleProps) {
  const [optimisticSaved, setOptimisticSaved] = useState(isSaved);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating if wrapped in a link
    e.stopPropagation();

    if (isPending) return;

    const currentlySaved = optimisticSaved;
    
    // Optimistic UI update
    setOptimisticSaved(!currentlySaved);
    setErrorMsg(null);
    setIsPending(true);
    
    if (removeOnToggle && currentlySaved && onHidden) {
      onHidden();
    }

    try {
      await toggleWishlist(movie, currentlySaved);
    } catch (error) {
      console.error('Failed to toggle wishlist:', error);
      // Revert optimistic update
      setOptimisticSaved(currentlySaved);
      setErrorMsg("Error");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className={`wishlist-toggle-wrapper ${className}`}>
      <div 
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleToggle(e as any); }}
        className="wishlist-toggle-icon"
        aria-label={optimisticSaved ? "Remove from wishlist" : "Add to wishlist"}
        title={optimisticSaved ? "Remove from wishlist" : "Add to wishlist"}
      >
        <svg 
          width="32" 
          height="40" 
          viewBox="0 0 24 32" 
          fill={optimisticSaved ? "white" : "rgba(0, 0, 0, 0.4)"} 
          stroke="white" 
          strokeWidth="1.5"
          className="bookmark-ribbon"
        >
          <path d="M0 0 L24 0 L24 32 L12 24 L0 32 Z" />
          {isPending ? (
            <circle 
              cx="12" 
              cy="13" 
              r="4" 
              stroke={optimisticSaved ? "black" : "white"} 
              strokeWidth="2" 
              fill="none" 
              strokeDasharray="16" 
              strokeDashoffset="4" 
              className="spinner-svg"
              style={{ transformOrigin: '12px 13px' }}
            />
          ) : (
            <>
              {!optimisticSaved && (
                 <path d="M12 8 v10 M7 13 h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
              )}
              {optimisticSaved && (
                 <path d="M7 13 l3.5 3.5 l6.5 -6.5" stroke="black" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </>
          )}
        </svg>
      </div>

      {errorMsg && (
        <div className="wishlist-error-tooltip">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
