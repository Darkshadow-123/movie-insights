"use client";  
   
import Image from 'next/image';
import { MovieData } from "@/app/types";  
import {  
  SentimentCard,  
  TrailerPlayer,  
  TrailerComments,  
  CastGrid,  
  YouTubeStatusBanner,  
  Tabs,  
} from "@/app/components";  
import { Navbar } from "@/app/components/layout";
  
export function MovieDetailsClient({ movie }: { movie: MovieData }) {  
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
                        isFallback={movie.sentimentStatus === "fallback"}
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