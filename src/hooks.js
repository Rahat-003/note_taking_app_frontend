import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';

// Loads a paginated endpoint ({ data, page, totalPages, total }); the page resets to 1 when the path changes.
export function usePaginated(path, onError, limit = 10) {
  const [pageState, setPageState] = useState({ path, page: 1 });
  const page = pageState.path === path ? pageState.page : 1;
  const [result, setResult] = useState(null);

  const setPage = useCallback((p) => setPageState({ path, page: p }), [path]);

  const reload = useCallback(async () => {
    try {
      const sep = path.includes('?') ? '&' : '?';
      setResult(await api(`${path}${sep}page=${page}&limit=${limit}`));
    } catch (err) {
      onError(err.message);
    }
  }, [path, page, limit, onError]);

  useEffect(() => { reload(); }, [reload]);

  // After creating an item, show the first page (newest first).
  const reloadFirstPage = useCallback(() => (page === 1 ? reload() : setPage(1)), [page, reload, setPage]);

  return { result, setPage, reload, reloadFirstPage };
}

// Returns `value` once it has stopped changing for `delay` ms (e.g. to search while typing).
export function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// Loads a short list endpoint in one request (first 100 items), e.g. categories for a dropdown.
export function useList(path, onError) {
  const [items, setItems] = useState([]);
  const reload = useCallback(async () => {
    try {
      setItems((await api(`${path}?limit=100`)).data);
    } catch (err) {
      onError(err.message);
    }
  }, [path, onError]);
  useEffect(() => { reload(); }, [reload]);
  return { items, reload };
}
