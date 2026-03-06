import { NextRequest, NextResponse } from 'next/server';
import { getMovieById } from '@/app/lib';

export async function GET(request: NextRequest) {
  // Extract search query from URL parameters
  const searchQuery = request.nextUrl.searchParams.get('search');

  // Validate that search parameter exists
  if (!searchQuery) {
    return NextResponse.json({ error: 'IMDb ID is required' }, { status: 400 });
  }

  // Validate IMDb ID format: 'tt' followed by 7 or 8 digits
  // Example valid IDs: tt0133093 (7 digits), tt01330937 (8 digits)
  if (!/^tt\d{7,8}$/.test(searchQuery)) {
    return NextResponse.json({ error: 'Invalid IMDb ID format. Use: tt followed by 7/8 digits' }, { status: 400 });
  }

  try {
    // Fetch movie data from OMDB API using IMDb ID
    const movieData = await getMovieById(searchQuery);
    
    // OMDB returns Response: "False" when movie is not found
    if (movieData.Response === 'False') {
      return NextResponse.json({ error: movieData.Error || 'Movie not found' }, { status: 404 });
    }
    
    // Return only necessary fields for search results (lightweight response)
    return NextResponse.json({
      Title: movieData.Title,
      Year: movieData.Year,
      imdbID: movieData.imdbID
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to search movie' }, { status: 500 });
  }
}
