"use client";

import { useState, useEffect } from "react";

interface TrailerPlayerProps {
  trailerId: string;
}

export function TrailerPlayer({ trailerId }: TrailerPlayerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const url = `https://img.youtube.com/vi/${trailerId}/maxresdefault.jpg`;
    fetch(url, { method: 'HEAD' })
      .then(res => {
        if (!res.ok) {
          setThumbnailUrl(`https://img.youtube.com/vi/${trailerId}/hqdefault.jpg`);
        } else {
          setThumbnailUrl(url);
        }
      })
      .catch(() => setThumbnailUrl(`https://img.youtube.com/vi/${trailerId}/hqdefault.jpg`));
  }, [trailerId]);

  useEffect(() => {
    const updateHeight = () => {
      const poster = document.querySelector('.movie-poster-large img') as HTMLImageElement;
      if (poster && poster.height > 0) {
        setContainerHeight(poster.height);
      }
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  if (!trailerId) return null;

  return (
    <div>
      <div 
        className="trailer-container"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: 'pointer', borderRadius: 'var(--radius-md)', overflow: 'hidden', height: containerHeight || 'auto' }}
      >
        {!isHovered ? (
          <img 
            src={thumbnailUrl || `https://img.youtube.com/vi/${trailerId}/hqdefault.jpg`}
            alt="Trailer thumbnail"
            style={{ 
              width: '100%', 
              height: '100%',
              objectFit: 'cover',
              display: 'block'
            }}
          />
        ) : (
          <iframe
            width="100%"
            height="100%"
            style={{ aspectRatio: '16/9' }}
            src={`https://www.youtube.com/embed/${trailerId}?autoplay=1&modestbranding=1&rel=0&iv_load_policy=3`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="Movie Trailer"
          />
        )}
      </div>
    </div>
  );
}
