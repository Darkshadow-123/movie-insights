import { NextRequest, NextResponse } from 'next/server';
import { omdbClient } from '@/app/lib';

export async function GET(request: NextRequest) {
  const searchQuery = request.nextUrl.searchParams.get('search');

  if (!searchQuery) {
    return NextResponse.json({ error: 'IMDb ID is required' }, { status: 400 });
  }

  if (!/^tt\d{7,8}$/.test(searchQuery)) {
    return NextResponse.json({ error: 'Invalid IMDb ID format. Use: tt followed by 7/8 digits' }, { status: 400 });
  }

  try {
    const movieData = await omdbClient.getMovieById(searchQuery);
    
    if (movieData.Response === 'False') {
      return NextResponse.json({ error: movieData.Error || 'Movie not found' }, { status: 404 });
    }
    return NextResponse.json({
      Title: movieData.Title,
      Year: movieData.Year,
      imdbID: movieData.imdbID
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to search movie' }, { status: 500 });
  }
}
