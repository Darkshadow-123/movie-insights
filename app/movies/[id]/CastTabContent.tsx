"use client";

import { useEffect, useState } from 'react';
import { CastGrid, LoadingSpinner } from '@/app/components';
import { fetchCastAction } from '@/app/actions/castAction';
import { CastData } from '@/app/types';

interface CastTabContentProps {
  imdbId: string;
  // Lifted to the parent (MovieDetailsClient) rather than kept in local
  // state here, because Tabs only renders the active tab's content —
  // this component fully unmounts when the user switches away and
  // remounts when they switch back. Without lifting the cache up, that
  // would mean a fresh fetchCastAction call (and a fresh RapidAPI hit)
  // on every single tab switch back to Cast.
  cachedData: CastData | null;
  onLoaded: (data: CastData) => void;
}

export function CastTabContent({ imdbId, cachedData, onLoaded }: CastTabContentProps) {
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedData) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchCastAction(imdbId)
      .then((data) => {
        if (cancelled) return;
        if (data.error) {
          setError(data.error);
        } else {
          onLoaded(data);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load cast');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imdbId, cachedData]);

  if (loading) return <LoadingSpinner />;

  if (error || !cachedData || cachedData.cast.length === 0) {
    return (
      <p className="no-cast" style={{ color: 'var(--text-muted)' }}>
        No cast information available
      </p>
    );
  }

  return <CastGrid cast={cachedData.cast} />;
}