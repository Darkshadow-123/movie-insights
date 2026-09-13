"use client";

import { useState, useRef, useEffect } from 'react';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: React.ReactNode;
}

export function ImageWithFallback({ src, alt, fallback, ...props }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setError(false);
  }, [src]);

  useEffect(() => {
    if (imgRef.current) {
      if (imgRef.current.complete && imgRef.current.naturalHeight === 0) {
        setError(true);
      }
    }
  }, [src]);

  if (!src || src === 'N/A' || src === 'null' || src === 'undefined' || error) {
    return (
      <>{fallback}</>
    );
  }

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      onError={() => setError(true)}
      {...props}
    />
  );
}
