"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./Navbar.module.css";

export function Navbar() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(true);
  // Use ref to track previous scroll position without triggering re-renders
  const lastScrollY = useRef(0);
  const router = useRouter();
  // Note: pathname is imported but not currently used - could be used for active link styling

  // Hide navbar when scrolling down, show when scrolling up
  // Only triggers after scrolling past 100px to avoid initial hide
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Hide: scrolling down AND past threshold (100px)
      // Show: scrolling up (regardless of position) or at top
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/movie?search=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Movie not found");
        return;
      }

      router.push(`/movies/${data.imdbID}`);
      setQuery("");
    } catch (err) {
      alert("Failed to search");
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className={`${styles.navbar} ${visible ? styles.visible : styles.hidden}`}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoIcon}>Brew</span>
          <span className={styles.logoText}>AI Movie Insights</span>
        </Link>

        <form onSubmit={handleSearch} className={styles.searchForm}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Enter IMDb ID (e.g., tt0133093)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className={styles.searchBtn} disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </form>
      </div>
    </nav>
  );
}
