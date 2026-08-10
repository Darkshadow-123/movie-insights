"use client";

import { useEffect, useState } from 'react';
import { SentimentCard } from '@/app/components';
import { fetchSentimentAction } from '@/app/actions/sentimentAction';
import { SentimentData, FilteredComment } from '@/app/types';

interface SentimentCardClientProps {
  title: string;
  plot: string;
  rating: string;
  comments: FilteredComment[];
}

// Renders SentimentCard immediately with sentiment=null (its built-in
// loading state), then fetches the real result client-side and updates
// state on the SAME mounted instance. This trades a slightly later
// start for the AI call (it begins after hydration + effect, not as
// early as possible during SSR) for a guaranteed smooth transition —
// see the comment in SentimentCard.tsx for why that guarantee needs
// this pattern specifically, not just moving the loading markup into
// the same file.
export function SentimentCardClient({ title, plot, rating, comments }: SentimentCardClientProps) {
  const [sentiment, setSentiment] = useState<SentimentData | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetchSentimentAction(title, plot, rating, comments).then((result) => {
      if (cancelled) return;
      setSentiment(result.data);
      setIsFallback(result.isFallback);
    });

    return () => {
      cancelled = true;
    };
  }, [title, plot, rating, comments]);

  return <SentimentCard sentiment={sentiment} isFallback={isFallback} />;
}