"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { Genre } from '@/app/types';
import { CustomSelect } from '../common/CustomSelect';

interface FilterBarProps {
  genres: Genre[];
}

export function FilterBar({ genres }: FilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentGenre = searchParams.get('genre') || '';
  const currentSort = searchParams.get('sort') || 'popularity_desc';
  const currentQuery = searchParams.get('q') || '';

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(name, value);
      } else {
        params.delete(name);
      }
      params.delete('page');
      // Remove query when genre is selected (handled in previous logic)
      if (name === 'genre' && params.has('q')) {
        params.delete('q');
      }
      return params.toString();
    },
    [searchParams]
  );

  const handleGenreChange = (newGenre: string) => {
    router.push(`/?${createQueryString('genre', newGenre)}`);
  };

  const handleSortChange = (newSort: string) => {
    router.push(`/?${createQueryString('sort', newSort)}`);
  };

  const handleClearFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('genre');
    params.delete('sort');
    params.delete('page');
    params.delete('q');
    router.push(`/?${params.toString()}`);
  };

  const sortOptions = [
    { value: 'popularity_desc', label: 'Most Popular' },
    { value: 'popularity_asc', label: 'Least Popular' },
    { value: 'release_date_desc', label: 'Newest First' },
    { value: 'release_date_asc', label: 'Oldest First' },
  ];

  const genreOptions = [
    { value: '', label: 'All Genres' },
    ...(genres || []).map(g => ({ value: g.id.toString(), label: g.name }))
  ];

  const hasActiveFilters = currentGenre !== '' || currentSort !== 'popularity_desc' || currentQuery !== '';

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label htmlFor="genre-select" className="filter-label">Genre:</label>
        <div title={currentQuery ? "Genre filters are disabled during text search." : ""}>
          <CustomSelect
            id="genre-select"
            value={currentGenre}
            options={genreOptions}
            onChange={handleGenreChange}
            disabled={!!currentQuery}
          />
        </div>
      </div>
      <div className="filter-group">
        <label htmlFor="sort-select" className="filter-label">Sort By:</label>
        <CustomSelect
          id="sort-select"
          value={currentSort}
          options={sortOptions}
          onChange={handleSortChange}
        />
      </div>
      {hasActiveFilters && (
        <button className="clear-filters-btn" onClick={handleClearFilters} style={{ alignSelf: 'center', marginLeft: 'auto', background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '10px 16px', borderRadius: 'var(--radius-md)', transition: 'all 0.2s ease' }} onMouseOver={(e) => (e.currentTarget.style.color = 'var(--text-primary)')} onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
          Clear Filters
        </button>
      )}
    </div>
  );
}
