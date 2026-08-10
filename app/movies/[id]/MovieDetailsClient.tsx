"use client";  
   
import { useState } from 'react';
import Image from 'next/image';
import { MovieData, CastData, YouTubeStatus, FilteredComment, TrailerComments as TrailerCommentsType } from "@/app/types";  
import { Tabs, TrailerPlayer, YouTubeStatusBanner, TrailerComments } from "@/app/components";  
import { Navbar } from "@/app/components/layout";
import { CastTabContent } from './CastTabContent';

interface MovieDetailsClientProps {
  movie: MovieData;
  imdbId: string;
  trailerId: string | null;
  youtubeStatus?: YouTubeStatus;
  youtubeMessage?: string;
  trailerComments: TrailerCommentsType | null;
  // Only the Gemini call is still deferred — it's the expensive part
  // of this page (measured ~4s vs. YouTube's ~1s), so it's the only
  // piece worth hiding behind a Suspense boundary. Trailer + comments
  // are fetched once, synchronously, in page.tsx now.
  sentimentSection: React.ReactNode;
}

export function MovieDetailsClient({
  movie,
  imdbId,
  trailerId,
  youtubeStatus,
  youtubeMessage,
  trailerComments,
  sentimentSection,
}: MovieDetailsClientProps) {  
  // Cast data is fetched lazily by CastTabContent when the Cast tab is
  // first opened, but cached here (one level up) so switching tabs away
  // and back doesn't trigger a refetch — see the comment in
  // CastTabContent.tsx for why that lift is necessary.
  const [castData, setCastData] = useState<CastData | null>(null);

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

const genres = movie.Genre ? movie.Genre.split(", ").slice(0, 4) : [];


  return (
    <>
      <Navbar />

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
              {movie.Poster && movie.Poster !== "N/A" && movie.Poster.startsWith("http") ? (
                <Image 
                  src={movie.Poster} 
                  alt={movie.Title} 
                  fill
                  sizes="(max-width: 900px) 100vw, 280px"
                  style={{ objectFit: 'cover' }}
                  priority
                />
              ) : (
                <div className="poster-placeholder">Movie</div>
              )}
            </div>
            <div className="movie-trailer">
              {trailerId && <TrailerPlayer trailerId={trailerId} />}
              <YouTubeStatusBanner status={youtubeStatus} message={youtubeMessage} />
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

          <Tabs
            tabs={[
              {
                id: "reviews",
                label: "Reviews",
                content: (
                  <div className="tab-content-reviews">
                    {sentimentSection}
                    {trailerComments && trailerComments.comments.length > 0 && (
                      <TrailerComments
                        comments={trailerComments.comments}
                        totalCount={trailerComments.totalCount}
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
                    <CastTabContent
                      imdbId={imdbId}
                      cachedData={castData}
                      onLoaded={setCastData}
                    />
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