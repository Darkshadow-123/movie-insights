import { MovieData } from "@/app/types";
import {
  ErrorDisplay,
  SentimentCard,
  TrailerPlayer,
  TrailerComments,
  CastGrid,
  YouTubeStatusBanner,
  Tabs,
} from "@/app/components";
import { Navbar } from "@/app/components/layout";

async function getMovie(id: string): Promise<MovieData> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ? process.env.NEXT_PUBLIC_BASE_URL : "";
  const res = await fetch(`${baseUrl}/api/movies/${id}`, { next:{revalidate:86400} });

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error("Movie not found");
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to fetch movie");
  }

  return res.json();
}

export default async function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;

  let movie: MovieData;
  try {
    movie = await getMovie(resolvedParams.id);
  } catch (err) {
    console.error("Error", err);

    return(
      <>
        <Navbar />
        <div
          style={{ paddingTop: "120px", maxWidth: "500px", margin: "0 auto" }}
        >
          <ErrorDisplay
            message={ "An error occurred"}
          />
        </div>
      </>
    );
  }

  const renderStars = (rating: number) => {
    // Calculate how many full stars (each worth 2 IMDb rating points)
    const full = Math.floor(rating / 2);
    // Check if there's a half star (remaining rating >= 1 means rating is 1 or more after full stars)
    const half = rating % 2 >= 1;
    // Remaining empty stars
    const empty = 5 - full - (half ? 1 : 0);
    return (
      <>
        {"★".repeat(full)}
        {half && "½"}
        {"☆".repeat(empty)}
      </>
    );
  };

  // Split genre string by comma, trim whitespace, and limit to 4 genres for display
  const genres = movie.Genre ? movie.Genre.split(", ").slice(0, 4) : [];

  return (
    <>
      <Navbar />

      {/* Movie Information Section */}
      <section className="movie-info-section">
        <div className="container">
          <div className="movie-details">
            <h1 className="movie-title-large">{movie.Title}</h1>

            <div className="movie-meta-row">
              <div className="movie-rating">
                <span className="rating-stars-large">
                  {renderStars(parseFloat(movie.imdbRating) || 0)}
                </span>
                <span className="rating-value-large">
                  {movie.imdbRating}/10
                </span>
                <span className="rating-votes">({movie.imdbVotes} votes)</span>
              </div>
              <span className="movie-year-runtime">
                {movie.Year} • {movie.Runtime}
              </span>
            </div>
          </div>
          <div className="movie-info-header">
            <div className="movie-poster-large">
              {movie.Poster && movie.Poster !== "N/A" ? (
                <img src={movie.Poster} alt={movie.Title} />
              ) : (
                <div className="poster-placeholder">Movie</div>
              )}
            </div>
            <div className="movie-trailer">
              {movie.trailerId && <TrailerPlayer trailerId={movie.trailerId} />}
              <YouTubeStatusBanner
                status={movie.youtubeStatus}
                message={movie.youtubeMessage}
              />              
            </div>
          </div>
          <div>
            <div className="movie-genres">
              {genres.map((genre, i) => (
                <span key={i} className="genre-tag-new">
                  {genre}
                </span>
              ))}
            </div>

            <p className="movie-plot">{movie.Plot}</p>

            <p className="movie-language">
              Language: {movie.Language || "N/A"}
            </p>
          </div>

          {/* Tabbed Content */}
          <Tabs
            tabs={[
              {
                id: "reviews",
                label: "Reviews",
                content: (
                  <div className="tab-content-reviews">
                    {movie.sentiment && (
                      <SentimentCard
                        sentiment={movie.sentiment}
                        isFallback={(movie as any).sentimentStatus === "fallback"}
                      />
                    )}
                    {movie.trailerComments &&
                      movie.trailerComments.comments.length > 0 && (
                        <TrailerComments
                          comments={movie.trailerComments.comments}
                          totalCount={movie.trailerComments.totalCount}
                        />
                      )}
                  </div>
                ),
              },
              {
                id: "cast",
                label: "Cast",
                content: (
                  <div className="tab-content-cast">
                    {movie.castAndCrew && movie.castAndCrew.cast?.length > 0 ? (
                      <CastGrid cast={movie.castAndCrew.cast} />
                    ) : (
                      <p className="no-cast" style={{ color: "var(--text-muted)" }}>
                        No cast information available
                      </p>
                    )}
                  </div>
                ),
              },
            ]}
          />
        </div>
      </section>
    </>
  );
}
