"use client";

interface TrailerPlayerProps {
  trailerId: string;
}

export function TrailerPlayer({ trailerId }: TrailerPlayerProps) {
  if (!trailerId) return null;

  return (
    <div className="trailer-container">
      <iframe
        width="100%"
        height="100%"
        src={`https://www.youtube.com/embed/${trailerId}?autoplay=1&mute=1&modestbranding=1&rel=0&iv_load_policy=3`}
        frameBorder="0"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Movie Trailer"
      />
    </div>
  );
}
