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
      const response = await fetch('http://localhost:3000/api/sql', {
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

  const paginatedData = allResults && allResults.data ? {
    ...allResults,
    data: allResults.data.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  } : null;

  const totalPages = allResults && allResults.data
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
                    {paginatedData.data.length > 0 &&
                      Object.keys(paginatedData.data[0]).map((key) => (
                        <th key={key}>{key.replace(/_/g, ' ').toUpperCase()}</th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.data.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((value, cellIdx) => (
                        <td key={cellIdx}>
                          {value === null || value === undefined
                            ? '-'
                            : typeof value === 'number' && !Number.isInteger(value)
                            ? value.toFixed(1)
                            : String(value)}
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
