'use client';

import { useState } from 'react';
import styles from './page.module.css';
import type { BoxScore, QueryParams, QueryResponse } from './types';

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [allResults, setAllResults] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [serverPage, setServerPage] = useState(0);
  const [jumpPageInput, setJumpPageInput] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);
  const [queryMode, setQueryMode] = useState<'sql' | 'structured'>('sql');
  const pageSize = 10;

  const fetchWithParams = async (params: QueryParams, isBackground = false) => {
    if (isBackground) {
      setBackgroundLoading(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const queryString = new URLSearchParams(
        Object.entries(params)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => [key, String(value)])
      ).toString();

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/boxscores?${queryString}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();

      setAllResults(prev => {
        if (!prev) return data;
        return {
          ...data,
          data: [...prev.data, ...data.data]
        };
      });
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      if (isBackground) {
        setBackgroundLoading(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const endpoint = queryMode === 'sql' ? '/api/sql' : '/api/query';
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      setAllResults(data);
      setCurrentPage(0);
      setServerPage(0);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const shouldPrefetch = (pageNumber: number): boolean => {
    if (!allResults || allResults.explicit_limit || backgroundLoading) return false;

    const totalFetchedPages = Math.ceil(allResults.data.length / pageSize);
    const isNearEnd = pageNumber >= totalFetchedPages - 2;
    const hasMoreData = allResults.data.length < allResults.total;

    return isNearEnd && hasMoreData;
  };

  const prefetch = async () => {
    if (!allResults) return;

    const newServerPage = serverPage + 1;
    const newOffset = newServerPage * allResults.limit;

    const params = {
      ...allResults.query_params,
      offset: newOffset,
    };

    await fetchWithParams(params, true);
    setServerPage(newServerPage);
  };

  const handleNext = async () => {
    if (!allResults) return;

    const nextClientPage = currentPage + 1;
    setCurrentPage(nextClientPage);

    if (shouldPrefetch(nextClientPage)) {
      await prefetch();
    }
  };

  const handlePrev = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    if (jumpPageInput) {
      const pageNum = parseInt(jumpPageInput) - 1;
      if (!isNaN(pageNum) && pageNum >= 0 && pageNum < totalPages) {
        setCurrentPage(pageNum);
      }
    }
    setJumpPageInput(null);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else if (sortDirection === 'asc') {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
    setCurrentPage(0);
  };

  const getSortedData = (data: any[]) => {
    if (!sortColumn) return data;

    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      const comparison = aStr.localeCompare(bStr);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const COLUMN_ORDER = [
    'player', 'team', 'match_up', 'game_date', 'season', 'w_l',
    'min', 'pts', 'reb', 'ast', 'stl', 'blk', 'tov', 'pf',
    'fgm', 'fga', 'fg_percent',
    'three_pm', 'three_pa', 'three_p_percent',
    'ftm', 'fta', 'ft_percent',
    'oreb', 'dreb', 'plus_minus', 'fp',
    'player_id', 'game_id', 'team_id'
  ];

  const getOrderedColumns = (data: any[]) => {
    if (data.length === 0) return [];
    const availableKeys = Object.keys(data[0]);
    const ordered = COLUMN_ORDER.filter(col => availableKeys.includes(col));
    const unknown = availableKeys.filter(key => !COLUMN_ORDER.includes(key));
    return [...ordered, ...unknown];
  };

  const sortedData = allResults && allResults.data ? getSortedData(allResults.data) : [];

  const paginatedData = sortedData.length > 0 ? {
    ...allResults!,
    data: sortedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  } : null;

  const orderedColumns = paginatedData ? getOrderedColumns(paginatedData.data) : [];

  const totalPages = allResults && allResults.data
    ? allResults.explicit_limit
      ? Math.ceil(allResults.data.length / pageSize)
      : Math.ceil(allResults.total / pageSize)
    : 0;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.searchForm}>
          <div className={styles.modeToggle}>
            <label>
              <input
                type="radio"
                value="sql"
                checked={queryMode === 'sql'}
                onChange={(e) => setQueryMode(e.target.value as 'sql' | 'structured')}
              />
              raw SQL
            </label>
            <label>
              <input
                type="radio"
                value="structured"
                checked={queryMode === 'structured'}
                onChange={(e) => setQueryMode(e.target.value as 'sql' | 'structured')}
              />
              structured output
            </label>
          </div>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Show me Brooklyn Nets box scores..."
              className={styles.searchInput}
              disabled={loading}
            />
            {(loading || backgroundLoading) && (
              <div className={styles.loadingSpinner}></div>
            )}
          </div>
        </form>

        {error && <div className={styles.error}>{error}</div>}

        {paginatedData && (
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              {(() => {
                const total = allResults && !allResults.explicit_limit && allResults.total > allResults.limit ? allResults.total : allResults?.data.length || 0;
                if (total === 0) return 'No results found';
                const start = currentPage * pageSize + 1;
                const end = Math.min((currentPage + 1) * pageSize, allResults?.data.length || 0);
                return `Showing ${start}-${end} of ${total} result${total === 1 ? '' : 's'}`;
              })()}
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {orderedColumns.map((key) => (
                      <th key={key} onClick={() => handleSort(key)} className={styles.sortableHeader}>
                        {key.replace(/_/g, ' ').toUpperCase()}
                        <span className={styles.sortIndicator}>
                          {sortColumn === key ? (sortDirection === 'asc' ? ' ▲' : ' ▼') : ''}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.data.map((row, idx) => (
                    <tr key={idx}>
                      {orderedColumns.map((key) => (
                        <td key={key}>
                          {row[key] === null || row[key] === undefined
                            ? '-'
                            : typeof row[key] === 'number' && !Number.isInteger(row[key])
                            ? row[key].toFixed(1)
                            : String(row[key])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={styles.pagination}>
              <button
                onClick={handlePrev}
                disabled={currentPage === 0}
                className={styles.paginationButton}
              >
                ‹
              </button>
              {jumpPageInput !== null ? (
                <form onSubmit={handlePageJump} className={styles.pageJumpForm}>
                  <input
                    type="text"
                    value={jumpPageInput}
                    onChange={(e) => setJumpPageInput(e.target.value)}
                    onBlur={(e) => {
                      if (e.relatedTarget?.tagName !== 'BUTTON') {
                        setJumpPageInput(null);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        setJumpPageInput(null);
                      }
                    }}
                    autoFocus
                    className={styles.pageJumpInput}
                  />
                  <span> / {totalPages}</span>
                </form>
              ) : (
                <button
                  onClick={() => setJumpPageInput(String(currentPage + 1))}
                  className={styles.pageNumber}
                >
                  {currentPage + 1} / {totalPages}
                </button>
              )}
              <button
                onClick={handleNext}
                disabled={currentPage >= totalPages - 1}
                className={styles.paginationButton}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
