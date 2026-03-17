"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchInput() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/movie?search=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to find movie");
      }

      router.push(`/movies/${data.imdbID}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Movie not found");
    } finally {
      setLoading(false);
    }
  };

  return (
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
  );
}
