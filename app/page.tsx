'use client';

import { useState } from 'react';
import styles from './page.module.css';

interface BoxScore {
  player_id: string;
  game_id: string;
  team_id: string;
  season: string;
  player: string;
  team: string;
  match_up: string;
  game_date: string;
  w_l: string;
  min: number | null;
  pts: number | null;
  fgm: number | null;
  fga: number | null;
  fg_percent: number | null;
  three_pm: number | null;
  three_pa: number | null;
  three_p_percent: number | null;
  ftm: number | null;
  fta: number | null;
  ft_percent: number | null;
  oreb: number | null;
  dreb: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  pf: number | null;
  plus_minus: number | null;
  fp: number | null;
}

interface QueryResponse {
  data: BoxScore[];
  total: number;
  limit: number;
  offset: number;
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [allResults, setAllResults] = useState<QueryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setCurrentPage(0);

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
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setCurrentPage(prev => prev + 1);
  };

  const handlePrev = () => {
    setCurrentPage(prev => Math.max(0, prev - 1));
  };

  const paginatedData = allResults ? {
    ...allResults,
    data: allResults.data.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
  } : null;

  const totalPages = allResults ? Math.ceil(allResults.data.length / pageSize) : 0;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <form onSubmit={handleSubmit} className={styles.searchForm}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about NBA stats..."
            className={styles.searchInput}
            disabled={loading}
          />
        </form>

        {error && <div className={styles.error}>{error}</div>}

        {loading && <div className={styles.loading}>Loading...</div>}

        {paginatedData && (
          <div className={styles.results}>
            <div className={styles.resultsHeader}>
              Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, allResults?.data.length || 0)} of {allResults?.data.length} results
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
