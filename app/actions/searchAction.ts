"use server";  
  
import { getMovieById } from '@/app/lib';  
import { redirect } from 'next/navigation';
import { SearchActionState } from '@/app/types';
  
export async function searchMovie(prevState: SearchActionState | null, formData: FormData) {
  const searchQuery = formData.get('searchQuery') as string;
  
  if (!/^tt\d{7,8}$/.test(searchQuery)) {
    return { error: 'Invalid IMDb ID format. Use: tt followed by 7/8 digits' };
  }
  
  let movieData;
  try {
    movieData = await getMovieById(searchQuery);
  } catch (err) {
    return { error: 'Failed to search' };
  }
  
  if (movieData.Response === 'False') {
    return { error: movieData.Error || 'Movie not found' };
  }
  
  redirect(`/movies/${movieData.imdbID}`);
}