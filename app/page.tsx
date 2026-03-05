"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingSpinner } from "./components";

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Handle movie search form submission
  // 1. Prevent default form behavior
  // 2. Validate input is not empty
  // 3. Call API with search query
  // 4. Navigate to movie page on success
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent empty searches
    if (!query.trim()) return;

    setLoading(true);
    setError("");

    try {
      // Encode query to handle special characters in IMDb IDs (e.g., tt0133093)
      const res = await fetch(`/api/movie?search=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to find movie");
      }

      // Navigate to the movie details page using the returned IMDb ID
      router.push(`/movies/${data.imdbID}`);
    } catch (err) {
      // Handle both Error objects and plain values for robustness
      setError(err instanceof Error ? err.message : "Movie not found");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page">
      <div className="home-logo">
        <span className="home-logo-icon">Brew</span>
        <span className="home-logo-text">AI Movie Insights</span>
      </div>
      
      <h1 className="home-headline">
        Discover Your<br />Favorite Movies
      </h1>
      <p className="home-subheadline">
        Get comprehensive insights, cast details, and AI-powered sentiment analysis for any film.
      </p>

      <div className="home-search-container" id="search">
        <form onSubmit={handleSearch} className="home-search-form">
          <input
            type="text"
            className="home-search-input"
            placeholder="Enter IMDb ID (e.g., tt0133093)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="home-search-btn" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
        {error && <p className="error-message" style={{ marginTop: "16px" }}>{error}</p>}
      </div>
    </div>
  );
}
