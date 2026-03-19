// app/components/common/ErrorDisplay.tsx  
"use client";  
  
import Link from "next/link";  
  
interface ErrorDisplayProps {  
  message: string;  
  title?: string;  
  onRetry?: () => void;  
}  
  
export function ErrorDisplay({  
  message,  
  title = "Something went wrong",  
  onRetry = () => window.location.reload(),  
}: ErrorDisplayProps) {  
  return (  
    <div className="error-card" style={{ margin: "40px auto", maxWidth: "500px" }}>  
      <div className="error-icon">🎬</div>  
      <h2 className="error-title">{title}</h2>  
      <p className="error-message">{message}</p>  
      <button className="retry-btn" onClick={onRetry}>Try Again</button>  
      <Link href="/" style={{ display: "block", marginTop: "12px", color: "var(--text-muted)" }}>  
        Go Home  
      </Link>  
    </div>  
  );  
}