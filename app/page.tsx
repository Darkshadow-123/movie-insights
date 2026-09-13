import { Suspense } from 'react';
import { SearchForm } from "./components/home/SearchForm";
import { MovieGrid } from "./components/movie/MovieGrid";
import { MovieGridSkeleton } from "./components/movie/MovieGridSkeleton";
import { FilterBar } from "./components/home/FilterBar";
import { Pagination } from "./components/common/Pagination";
import { QuotaWarning } from "./components/common/QuotaWarning";
import { browseMovies, searchMoviesByTitle, getGenreList } from "./actions/discoverAction";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function Home(props: PageProps) {
  const searchParams = await props.searchParams;

  const query = typeof searchParams.q === 'string' ? searchParams.q : '';
  const genre = typeof searchParams.genre === 'string' ? searchParams.genre : '';
  const sortBy = typeof searchParams.sort === 'string' ? searchParams.sort : 'popularity_desc';
  const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page, 10) : 1;

  let movies: any[] = [];
  let status = '';
  // Fetch Genres
  const genresRes = await getGenreList();
  const genres = genresRes.status === 'success' && genresRes.data ? genresRes.data : [];
  const genreName = genre ? genres.find((g: any) => g.id.toString() === genre)?.name : null;

  return (
    <div className="home-page" style={{ justifyContent: 'flex-start', paddingTop: '40px' }}>
      <div className="container">
        <div className="home-logo" style={{ justifyContent: 'center' }}>
          <span className="home-logo-icon">Brew</span>
          <span className="home-logo-text">AI Movie Insights</span>
        </div>

        <h1 className="home-headline" style={{ textAlign: 'center' }}>
          Discover Your<br />Favorite Movies
        </h1>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '48px' }}>
          <SearchForm />
        </div>

        {/* Always show FilterBar so user can sort search results, though genres won't affect search */}
        <FilterBar genres={genres} />

        <Suspense key={`${query}-${genre}-${sortBy}-${page}`} fallback={<MovieGridSkeleton />}>
          <MovieContent query={query} genre={genre} genreName={genreName} sortBy={sortBy} page={page} />
        </Suspense>
      </div>
    </div>
  );
}

async function MovieContent({ query, genre, genreName, sortBy, page }: any) {
  let movies: any[] = [];
  let status = '';
  let errorMessage = '';
  let totalPages = 1;
  let partialDataWarning = false;

  if (query) {
    const searchRes = await searchMoviesByTitle(query, sortBy);
    status = searchRes.status;
    movies = searchRes.data || [];
    errorMessage = searchRes.message || '';
    partialDataWarning = searchRes.partialDataWarning || false;
  } else {
    const browseRes = await browseMovies({
      genres: genre || undefined,
      sortBy: sortBy,
      page: page,
      limit: 20
    });
    status = browseRes.status;
    movies = browseRes.data || [];
    totalPages = browseRes.totalPages || 1;
    errorMessage = browseRes.message || '';
    partialDataWarning = browseRes.partialDataWarning || false;
  }

  return (
    <>
      {status === 'success' ? (
        <>
          {query && (
            <h2 className="section-title" style={{ marginBottom: '24px' }}>
              Search Results for &quot;{query}&quot;
            </h2>
          )}

          {!query && genreName && (
            <div style={{ marginBottom: '24px' }}>
              <h2 className="section-title" style={{ marginBottom: '8px' }}>
                Top {genreName} Movies
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px' }}>
                The most popular {genreName.toLowerCase()} titles across global streaming platforms.
              </p>
            </div>
          )}

          {!query && !genre && (
            <div style={{ marginBottom: '24px' }}>
              <h2 className="section-title" style={{ marginBottom: '8px' }}>
                Global Audience Favorites
              </h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '15px', maxWidth: '800px', lineHeight: '1.5' }}>
                Discover movies across the global database, ordered from highest popularity percentile to lowest. Watchmode calculates this metric internally based on global audience size and demand across all streaming platforms.
              </p>
            </div>
          )}

          <QuotaWarning show={partialDataWarning} />
          <MovieGrid movies={movies} />
          {!query && totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} />
          )}
        </>
      ) : (
        <div className="error-card">
          <div className="error-icon">⚠️</div>
          <h3 className="error-title">Oops!</h3>
          <p className="error-message">{errorMessage || 'Something went wrong while fetching movies.'}</p>
        </div>
      )}
    </>
  );
}
