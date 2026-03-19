// app/movies/[id]/error.tsx  
"use client";  
import { useEffect } from "react";  
import { ErrorDisplay } from "@/app/components";  
  
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {  
  useEffect(() => { console.error(error); }, [error]);  
  return <ErrorDisplay message={error.message} onRetry={reset} />;  
}