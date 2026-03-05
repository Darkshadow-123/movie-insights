import { CastMember } from '@/app/types';

interface CastGridProps {
  cast: CastMember[];
}

export function CastGrid({ cast }: CastGridProps) {
  // Guard clause: handle undefined or empty cast array
  if (!cast || cast.length === 0) return null;

  return (
    <div className="cast-grid-updated">
      {/* Limit display to first 12 cast members for cleaner UI */}
      {cast.slice(0, 12).map((actor: CastMember, i: number) => (
        <div key={i} className="cast-card-updated">
          {actor.image ? (
            // Use cast member's photo if available
            <img src={actor.image} alt={actor.name} className="cast-avatar-updated" />
          ) : (
            // Fallback: show first letter of name in a circle placeholder
            <div className="cast-avatar-placeholder" style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              margin: '0 auto 14px',
              background: 'var(--bg-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              color: 'var(--text-muted)',
              border: '2px solid var(--glass-border)'
            }}>
              {actor.name.charAt(0)}
            </div>
          )}
          <div className="cast-name-updated">{actor.name}</div>
          {/* Only show character name if it exists (not all cast have character info) */}
          {actor.character && <div className="cast-character-updated">{actor.character}</div>}
        </div>
      ))}
    </div>
  );
}
