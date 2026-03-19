import Image from 'next/image';
import { CastMember } from '@/app/types';

interface CastGridProps {
  cast: CastMember[];
}

export function CastGrid({ cast }: CastGridProps) {
  // Guard clause: handle undefined or empty cast array
  if (!cast || cast.length === 0) return null;

  return (
    <div className="cast-grid-updated">
      {cast.slice(0, 12).map((actor: CastMember) => (
        <div key={actor.id || actor.name} className="cast-card-updated">
          <div className="cast-avatar-wrapper">
            {actor.image && actor.image.startsWith("http") ? (
            <Image 
              src={actor.image} 
              alt={actor.name} 
              width={80}
              height={80}
              className="cast-avatar-updated"
            />
            ) : (
              <div className="cast-avatar-placeholder">
                {actor.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="cast-name-updated">{actor.name}</div>
          {/* Only show character name if it exists (not all cast have character info) */}
          {actor.character && <div className="cast-character-updated">{actor.character}</div>}
        </div>
      ))}
    </div>
  );
}
