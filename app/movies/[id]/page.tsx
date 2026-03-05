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
} from "@/app/components";
import { Navbar } from "@/app/components/layout";

export default function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const renderStars = (rating: number) => {
    const full = Math.floor(rating / 2);
    const half = rating % 2 >= 1;
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

function YouTubeStatusBanner({
  status,
  message,
}: {
  status?: string;
  message?: string;
}) {
  if (!status || status === "success") return null;

  const config: Record<string, { color: string; text: string }> =
    {
      no_api_key: {
        color: "gray",
        text: "YouTube API key not configured",
      },
      trailer_not_found: {
        color: "yellow",
        text: "Trailer not found",
      },
      comments_disabled: {
        color: "gray",
        text: "Comments are disabled",
      },
      quota_exceeded: {
        color: "red",
        text: "YouTube quota exceeded",
      },
      error: {
        color: "red",
        text: message || "An error occurred",
      },
    };

  const c = config[status] || config.error;

  return (
    <div className={`youtube-status youtube-status-${c.color}`}>
      <span className="youtube-status-text">{c.text}</span>
    </div>
  );
}
