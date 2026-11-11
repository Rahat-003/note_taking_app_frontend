import { useEffect, useState } from 'react';

// Minimal history-based routing: usePath() re-renders on navigate() and on back/forward.
const listeners = new Set();

export function navigate(path, { replace = false } = {}) {
  if (path === window.location.pathname) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
  listeners.forEach((listener) => listener(path));
}

export function usePath() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    listeners.add(setPath);
    window.addEventListener('popstate', onPopState);
    return () => {
      listeners.delete(setPath);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);
  return path;
}

export function Link({ to, children, ...props }) {
  function onClick(e) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // let the browser open a new tab
    e.preventDefault();
    navigate(to);
  }
  return <a href={to} onClick={onClick} {...props}>{children}</a>;
}
