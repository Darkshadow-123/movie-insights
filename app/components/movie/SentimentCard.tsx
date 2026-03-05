import { SentimentData } from '../../types';

interface SentimentCardProps {
  sentiment: SentimentData;
  isFallback?: boolean;
}

export function SentimentCard({ sentiment, isFallback }: SentimentCardProps) {
  return (
    <div className="sentiment-card">
      <div className="sentiment-header">
        <h3 className="section-title">
          AI Sentiment Analysis
          {isFallback && <span className="fallback-badge"> (Fallback)</span>}
        </h3>
        <span className={`sentiment-badge ${sentiment.classification}`}>
          {sentiment.classification === 'positive' && 'Positive'}
          {sentiment.classification === 'mixed' && 'Mixed'}
          {sentiment.classification === 'negative' && 'Negative'}
        </span>
      </div>
      <div className="sentiment-bars">
        {(['positive', 'mixed', 'negative'] as const).map((type) => (
          <div key={type} className="sentiment-bar-container">
            <span className="sentiment-label">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
            <div className="sentiment-bar-wrapper">
              <div className={`sentiment-bar ${type}`} style={{ width: `${sentiment[type]}%` }}></div>
            </div>
            <span className="sentiment-percentage">{sentiment[type]}%</span>
          </div>
        ))}
      </div>
      <div className="ai-summary">
        <div className="ai-summary-title">AI Summary</div>
        <p className="ai-summary-text">{sentiment.summary}</p>
      </div>
    </div>
  );
}
