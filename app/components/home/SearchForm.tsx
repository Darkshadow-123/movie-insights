"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAutocompleteSuggestions } from '@/app/actions/discoverAction';
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue';
import { MovieSummary } from '@/app/types';
import { ImageWithFallback } from '../common/ImageWithFallback';

export function SearchForm() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<MovieSummary[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const debouncedQuery = useDebouncedValue(query, 600);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q !== null) {
      setQuery(q);
    } else {
      setQuery('');
    }
  }, [searchParams]);

  useEffect(() => {
    // Click outside to close dropdown
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchSuggestions = async () => {
      if (!debouncedQuery.trim()) {
        setSuggestions([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const res = await getAutocompleteSuggestions(debouncedQuery);

        if (!signal.aborted) {
          if (res.status === 'success' && res.data) {
            setSuggestions(res.data);
          } else {
            setSuggestions([]);
          }
        }
      } catch (err) {
        if (!signal.aborted) {
          console.error('Failed to fetch suggestions:', err);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchSuggestions();

    return () => {
      controller.abort();
    };
  }, [debouncedQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setIsFocused(false);
      const params = new URLSearchParams(searchParams.toString());
      params.set('q', query.trim());
      params.delete('page'); // Reset pagination
      router.push(`/?${params.toString()}`);
    }
  };

  const handleSuggestionClick = (movie: MovieSummary) => {
    setIsFocused(false);
    setQuery('');
    router.push(`/movies/${movie.imdbId}`);
  };

  return (
    <div className="home-search-container" id="search" ref={dropdownRef}>
      <form onSubmit={handleSubmit} className="home-search-form" style={{ position: 'relative' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsFocused(true);
          }}
          onFocus={() => setIsFocused(true)}
          className="home-search-input"
          placeholder="Search for movies..."
          autoComplete="off"
        />
        <button type="submit" className="home-search-btn">
          Search
        </button>

        {isFocused && query.trim() && (
          <div className="autocomplete-dropdown">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="autocomplete-item">
                  <div className="autocomplete-poster shimmer-bg" style={{ width: '70px', height: '80px', flexShrink: 0 }}></div>
                  <div className="autocomplete-info" style={{ gap: '8px', flex: 1 }}>
                    <div className="shimmer-bg" style={{ height: '18px', width: '75%', borderRadius: '4px' }}></div>
                    <div className="shimmer-bg" style={{ height: '14px', width: '40%', borderRadius: '4px' }}></div>
                  </div>
                </div>
              ))
            ) : suggestions.length > 0 ? (
              suggestions.map((movie) => (
                <div
                  key={movie.watchmodeId}
                  className="autocomplete-item"
                  onClick={() => handleSuggestionClick(movie)}
                >
                  <div className="autocomplete-poster">
                    <ImageWithFallback 
                      src={movie.poster || ''} 
                      alt={movie.title} 
                      loading="lazy" 
                      fallback={
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                          🎬
                        </div>
                      }
                    />
                  </div>
                  <div className="autocomplete-info">
                    <span className="autocomplete-title">{movie.title}</span>
                    <span className="autocomplete-year" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {movie.year || 'Unknown Year'}
                      {movie.type && (
                        <span style={{ fontSize: '11px', padding: '2px 6px', background: 'var(--glass-border)', borderRadius: '4px', textTransform: 'capitalize' }}>
                          {movie.type.replace('_', ' ')}
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '16px', color: 'var(--text-muted)', textAlign: 'center' }}>No suggestions found</div>
            )}
          </div>
        )}
      </form>
      {error && (
        <p className="error-message" style={{ marginTop: "16px" }}>
          {error}
        </p>
      )}
    </div>
  );
}
