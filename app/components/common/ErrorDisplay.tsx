"use client"
interface ErrorDisplayProps {
  message: string;
}

export function ErrorDisplay({ message }: ErrorDisplayProps) {
  return (
    <div className="error-card">
      <div className="error-icon">🎬</div>
      <h2 className="error-title">Oops! Something went wrong</h2>
      <p className="error-message">{message}</p>
      <button className="retry-btn" onClick={() => window.location.reload()}>Try Again</button>
    </div>
  );
}
