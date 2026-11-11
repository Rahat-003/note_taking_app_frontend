import { useEffect } from 'react';
import { XIcon } from './icons.jsx';

/** A short message at the bottom of the screen with an optional action (e.g. Undo); hides itself. */
export default function Toast({ message, actionLabel, onAction, onDismiss, timeout = 6000 }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, timeout);
    return () => clearTimeout(timer);
  }, [message, onDismiss, timeout]);

  return (
    <div className="toast" role="status" aria-live="polite">
      <span>{message}</span>
      {onAction && <button type="button" className="toast-action" onClick={onAction}>{actionLabel}</button>}
      <button type="button" className="toast-close" aria-label="Dismiss" onClick={onDismiss}><XIcon /></button>
    </div>
  );
}
