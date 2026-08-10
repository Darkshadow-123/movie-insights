import { SentimentData } from '../../types';

interface SentimentCardProps {
  // null = still loading.
  //
  // This works because of WHERE `sentiment` comes from, not just
  // because this component has a loading variant. SentimentCardClient
  // renders <SentimentCard sentiment={null} /> on mount, then calls
  // fetchSentimentAction and does setSentiment(result) in a useEffect —
  // that's a normal React state update on the SAME component instance,
  // so this SentimentCard never unmounts; React just re-renders it in
  // place and patches the .sentiment-bar div's width attribute on the
  // DOM node that was already there.
  //
  // That's the detail that matters for the CSS `transition: width` in
  // globals.css to actually animate: a transition only fires when one
  // persistent DOM node changes a style value across two renders. If
  // this were instead the fallback/children of a <Suspense> boundary
  // (the initial design), React would unmount the fallback's
  // <SentimentCard> entirely and mount a brand-new one for the
  // resolved content — a fresh element has no "previous width" to
  // transition from, so it would just snap straight to its final
  // width with no animation, no matter what this component's own code
  // does. Fetching client-side after mount, into local state on one
  // instance, is what makes the transition possible at all.
  sentiment: SentimentData | null;
  isFallback?: boolean;
}

export function SentimentCard({ sentiment, isFallback }: SentimentCardProps) {
  const loading = sentiment === null;

  return (
    <div className="sentiment-card">
      <div className="sentiment-header">
        <h3 className="section-title">
          AI Sentiment Analysis
          {isFallback && <span className="fallback-badge"> (Fallback)</span>}
        </h3>
        {!loading && (
          <span className={`sentiment-badge ${sentiment.classification}`}>
            {sentiment.classification === 'positive' && 'Positive'}
            {sentiment.classification === 'mixed' && 'Mixed'}
            {sentiment.classification === 'negative' && 'Negative'}
          </span>
        )}
      </div>
      <div className="sentiment-bars">
        {(['positive', 'mixed', 'negative'] as const).map((type) => (
          <div key={type} className="sentiment-bar-container">
            <span className="sentiment-label">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
            <div className="sentiment-bar-wrapper">
              <div
                className={`sentiment-bar ${type}`}
                style={{ width: loading ? '0%' : `${sentiment[type]}%` }}
              ></div>
            </div>
            <span className="sentiment-percentage">
              {loading ? '—' : `${sentiment[type]}%`}
            </span>
          </div>
        ))}
      </div>
      <div className="ai-summary">
        <div className="ai-summary-title">AI Summary</div>
        {loading ? (
          <p className="ai-summary-text sentiment-summary-loading">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </p>
        ) : (
          <p className="ai-summary-text">{sentiment.summary}</p>
        )}
      </div>
    </div>
  );
}