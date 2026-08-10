"use server";

import { getCastAndCrew } from '@/app/lib';
import { CastData } from '@/app/types';

// Cast/crew is no longer fetched on initial page load. It's the
// slowest of the four external APIs in practice and isn't needed
// until the user actually opens the Cast tab, so it's fetched
// on-demand from the client via this Server Action instead of
// blocking the initial render for every visitor, most of whom
// may never open that tab at all.
export async function fetchCastAction(imdbId: string): Promise<CastData> {
  if (!/^tt\d{7,8}$/.test(imdbId)) {
    return { cast: [], error: 'Invalid IMDb ID format' };
  }
  return getCastAndCrew(imdbId);
}