"use client";

import { useState, useEffect, use } from "react";
import { useParams } from "next/navigation";
import { MovieData, CastMember } from "@/app/types";
import {
  LoadingSpinner,
  ErrorDisplay,
  SentimentCard,
  TrailerPlayer,
  TrailerComments,
  CastGrid,
  YouTubeStatusBanner,
} from "@/app/components";
import { Navbar } from "@/app/components/layout";

export default function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 15+ requires awaiting params - this resolves the Promise to get the actual route parameters
  const resolvedParams = use(params);
  const [movie, setMovie] = useState<MovieData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("reviews");

  useEffect(() => {
    const fetchMovie = async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/movies/${resolvedParams.id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch movie");
        }

        setMovie(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (resolvedParams.id) {
      fetchMovie();
    }
  }, [resolvedParams.id]);

  // Converts numeric rating (0-10) to 5-star display
  // IMDb rating is 0-10, but we display 5 stars
  // Each full star represents 2 IMDb points (10/5 = 2)
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

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{ paddingTop: "120px", minHeight: "100vh" }}>
          <LoadingSpinner />
        </div>
      </>
    );
  }

  if (error || !movie) {
    return (
      <>
        <Navbar />
        <div
          style={{ paddingTop: "120px", maxWidth: "500px", margin: "0 auto" }}
        >
          <ErrorDisplay
            message={error || "Movie not found"}
            onRetry={() => window.location.reload()}
          />
        </div>
      </>
    );
  }

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

          {/* Sub Navbar with Tabs */}
          <div className="sub-navbar">
            <button
              className={`tab-button ${
                activeTab === "reviews" ? "active" : ""
              }`}
              onClick={() => setActiveTab("reviews")}
            >
              Reviews
            </button>
            <button
              className={`tab-button ${activeTab === "cast" ? "active" : ""}`}
              onClick={() => setActiveTab("cast")}
            >
              Cast
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "reviews" && (
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
          )}

          {activeTab === "cast" && (
            <div className="tab-content-cast">
              {movie.castAndCrew && movie.castAndCrew.cast?.length > 0 ? (
                <CastGrid cast={movie.castAndCrew.cast} />
              ) : (
                <p className="no-cast" style={{ color: "var(--text-muted)" }}>
                  No cast information available
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
