export function MovieGridSkeleton() {
  const cards = Array.from({ length: 20 });

  return (
    <div className="movie-grid">
      {cards.map((_, i) => (
        <div key={i} className="movie-card glass-card">
          <div className="movie-card-poster shimmer-bg"></div>
          <div className="movie-card-info">
            <div className="movie-card-header">
               <div className="skeleton-title shimmer-bg" style={{ width: '60%', height: '24px', borderRadius: '4px' }}></div>
               <div className="skeleton-meta shimmer-bg" style={{ width: '25%', height: '16px', borderRadius: '4px', marginTop: '6px' }}></div>
            </div>
            <div className="movie-card-meta-row" style={{ marginTop: 'auto', paddingTop: '12px', justifyContent: 'space-between' }}>
               <div className="skeleton-meta shimmer-bg" style={{ width: '25%', height: '16px', borderRadius: '4px' }}></div>
               <div className="skeleton-meta shimmer-bg" style={{ width: '45%', height: '16px', borderRadius: '4px' }}></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
