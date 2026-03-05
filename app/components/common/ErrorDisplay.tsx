interface ErrorDisplayProps {
  message: string;
  onRetry: () => void;
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="error-card">
      <div className="error-icon">🎬</div>
      <h2 className="error-title">Oops! Something went wrong</h2>
      <p className="error-message">{message}</p>
      <button className="retry-btn" onClick={onRetry}>Try Again</button>
    </div>
  );
}
