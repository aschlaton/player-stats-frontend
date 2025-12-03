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

      const response = await fetch(`http://localhost:3000/api/boxscores?${queryString}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();

      // Append new data to existing results
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
      const response = await fetch('http://localhost:3000/api/query', {
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

  const paginatedData = allResults ? {
    ...allResults,
    data: allResults.data.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  } : null;

  const totalPages = allResults
    ? allResults.explicit_limit
      ? Math.ceil(allResults.data.length / pageSize)
      : Math.ceil(allResults.total / pageSize)
    : 0;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.searchForm}>
          <div className={styles.searchWrapper}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about NBA stats..."
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
              Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, allResults?.data.length || 0)} of {allResults && !allResults.explicit_limit && allResults.total > allResults.limit ? allResults.total : allResults?.data.length || 0} result{(allResults && !allResults.explicit_limit && allResults.total > allResults.limit ? allResults.total : allResults?.data.length || 0) === 1 ? '' : 's'}
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Player</th>
                    <th>Team</th>
                    <th>Matchup</th>
                    <th>PTS</th>
                    <th>REB</th>
                    <th>AST</th>
                    <th>STL</th>
                    <th>BLK</th>
                    <th>FG%</th>
                    <th>3P%</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.data.map((game) => (
                    <tr key={`${game.player_id}-${game.game_id}`}>
                      <td>{game.game_date}</td>
                      <td>{game.player}</td>
                      <td>{game.team}</td>
                      <td>{game.match_up}</td>
                      <td>{game.pts ?? '-'}</td>
                      <td>{game.reb ?? '-'}</td>
                      <td>{game.ast ?? '-'}</td>
                      <td>{game.stl ?? '-'}</td>
                      <td>{game.blk ?? '-'}</td>
                      <td>{game.fg_percent?.toFixed(1) ?? '-'}</td>
                      <td>{game.three_p_percent?.toFixed(1) ?? '-'}</td>
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
                Previous
              </button>
              <button
                onClick={handleNext}
                disabled={currentPage >= totalPages - 1}
                className={styles.paginationButton}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
