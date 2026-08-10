"use server";

import { analyzeCombined, getFallbackSentiment } from '@/app/services/sentimentService';
import { SentimentData, FilteredComment } from '@/app/types';

export interface SentimentResult {
  data: SentimentData;
  isFallback: boolean;
}

// Called client-side (from SentimentCardClient) after the page has
// already mounted with a loading state. Always resolves to something
// renderable — real data on success, a locally-computed fallback on
// failure — so the client never needs to import sentimentService's
// fallback logic directly (that file also pulls in @google/genai and
// next/cache, which have no business in a client bundle).
export async function fetchSentimentAction(
  title: string,
  plot: string,
  rating: string,
  comments: FilteredComment[]
): Promise<SentimentResult> {
  const geminiStart = Date.now();
  try {
    const data = await analyzeCombined(title, plot, rating, comments);
    console.log(`[sentiment] gemini total: ${Date.now() - geminiStart}ms`);
    return { data, isFallback: false };
  } catch (err) {
    console.log(`[sentiment] gemini total (failed): ${Date.now() - geminiStart}ms`);
    console.error('[sentiment] analyzeCombined failed:', err);
    return { data: getFallbackSentiment(rating, plot), isFallback: true };
  }
}