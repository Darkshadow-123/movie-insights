"use client";

interface TrailerPlayerProps {
  trailerId: string;
}

export function TrailerPlayer({ trailerId }: TrailerPlayerProps) {
  // Guard clause: don't render if no trailer ID provided
  if (!trailerId) return null;

  // YouTube embed parameters explained:
  // autoplay=1: Start playing automatically (requires mute for most browsers)
  // mute=1: Mute audio (required for autoplay to work in most browsers)
  // modestbranding=1: Remove YouTube logo from controls
  // rel=0: Only show related videos from same channel
  // iv_load_policy=3: Hide video annotations
  const embedUrl = `https://www.youtube.com/embed/${trailerId}?autoplay=1&mute=1&modestbranding=1&rel=0&iv_load_policy=3`;

  return (
    <div className="trailer-container">
      <iframe
        width="100%"
        height="100%"
        src={embedUrl}
        frameBorder="0"
        allow="autoplay; accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Movie Trailer"
      />
    </div>
  );
}
