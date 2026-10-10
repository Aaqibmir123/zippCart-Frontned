import { useEffect, useRef, useState } from 'react';

const BATCH_SIZE = 6;
type PageQuery = {
  hasNextPage: boolean; isFetching: boolean; isFetchNextPageError: boolean;
  fetchNextPage: (options: { cancelRefetch: boolean }) => Promise<unknown>;
};

export function useProgressiveCatalog(key: string, total: number, query: PageQuery) {
  const [window, setWindow] = useState({ key, count: BATCH_SIZE });
  const armed = useRef(false);
  const fetching = useRef(false);
  const generation = useRef(0);
  const count = window.key === key ? window.count : BATCH_SIZE;
  useEffect(() => {
    armed.current = false;
    generation.current++;
    setWindow({ key, count: BATCH_SIZE });
  }, [key]);
  const hasMore = count < total || query.hasNextPage;

  async function loadMore(manual = false) {
    if ((!manual && !armed.current) || fetching.current || query.isFetching) return;
    if (!manual && query.isFetchNextPageError) return;
    armed.current = false;
    if (count < total) {
      setWindow({ key, count: count + BATCH_SIZE });
      return;
    }
    if (!query.hasNextPage) return;
    fetching.current = true;
    const requestGeneration = generation.current;
    try {
      await query.fetchNextPage({ cancelRefetch: false });
      if (requestGeneration !== generation.current) return;
      // Reveal only one batch, including filtered pages with no matches.
      setWindow((current) => current.key === key
        ? { key, count: Math.max(current.count, Math.min(count, total) + BATCH_SIZE) }
        : current);
    } catch {
      // The query owns the visible error and explicit retry state.
    } finally { fetching.current = false; }
  }

  return { count, hasMore, loadMore, arm: () => { armed.current = true; },
    reset: () => { armed.current = false; generation.current++; setWindow({ key, count: BATCH_SIZE }); } };
}
