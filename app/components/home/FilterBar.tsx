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

  const handleGenreChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('genre', value);
    } else {
      params.delete('genre');
    }
    params.delete('page');
    params.delete('q'); // Clear search query when browsing genres
    router.push(`/?${params.toString()}`);
  };

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', value);
    params.delete('page');
    router.push(`/?${params.toString()}`);
  };

  return (
    <div className="filter-bar">
      <div className="filter-group">
        <label htmlFor="genre-select" style={{ marginRight: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Genre:</label>
        <CustomSelect
          id="genre-select"
          value={currentGenre}
          onChange={handleGenreChange}
          options={[
            { value: '', label: 'All Genres' },
            ...(genres || []).map(g => ({ value: g.id.toString(), label: g.name }))
          ]}
        />
      </div>

      <div className="filter-group">
        <label htmlFor="sort-select" style={{ marginRight: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>Sort By:</label>
        <CustomSelect
          id="sort-select"
          value={currentSort}
          onChange={handleSortChange}
          options={[
            { value: 'popularity_desc', label: 'Most Popular' },
            { value: 'popularity_asc', label: 'Least Popular' },
            { value: 'release_date_desc', label: 'Newest Releases' },
            { value: 'release_date_asc', label: 'Oldest Releases' }
          ]}
        />
      </div>
    </div>
  );
}
