import { useRef } from 'react';
import { describeError, fieldMessages } from '../errors.js';
import { AlertIcon, ArrowRightIcon, ClockIcon, LockIcon, OfflineIcon, SearchIcon, XIcon } from './icons.jsx';

const ICONS = { alert: AlertIcon, lock: LockIcon, clock: ClockIcon, search: SearchIcon, offline: OfflineIcon };

/**
 * An API error (or a plain message) as a callout: a tone-colored icon tile, a small eyebrow label, a
 * plain-language title and sentence. Validation errors list each field; clicking one focuses its input.
 * autoDismissMs: a countdown bar runs along the bottom (paused while hovered) and calls onDismiss at the end.
 */
export default function ErrorAlert({ error, onDismiss, autoDismissMs, className = '' }) {
  const rootRef = useRef(null);
  const info = describeError(error);
  if (!info) return null;
  const Icon = ICONS[info.icon] ?? AlertIcon;

  // Inputs marked by invalidProps() carry data-field; prefer the one in the same form.
  function focusField(field) {
    const scope = rootRef.current?.closest('form') ?? document;
    const input = scope.querySelector(`[data-field="${field}"]`) ?? document.querySelector(`[data-field="${field}"]`);
    input?.focus();
    input?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
  }

  return (
    <div ref={rootRef} className={`notice notice-${info.tone} ${info.fields.length ? 'notice-shake' : ''} ${className}`}
      role="alert" aria-live="assertive" key={error?.message ?? String(error)}>
      <span className="notice-tile" aria-hidden="true"><Icon /></span>
      <div className="notice-body">
        <span className="notice-eyebrow">{info.eyebrow}</span>
        <strong className="notice-title">{info.title}</strong>
        {info.message && <p className="notice-message">{info.message}</p>}
        {info.fields.length > 0 && (
          <ul className="notice-fields">
            {info.fields.map((f) => (
              <li key={f.field}>
                <button type="button" className="notice-field" onClick={() => focusField(f.field)}>
                  <span className="notice-field-name">{f.label}</span>
                  <span className="notice-field-msg">{f.messages.join(', ')}</span>
                  <ArrowRightIcon className="notice-field-go" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {onDismiss && (
        <button type="button" className="notice-close" onClick={onDismiss} aria-label="Dismiss"><XIcon /></button>
      )}
      {autoDismissMs && onDismiss && (
        <span className="notice-timer" style={{ animationDuration: `${autoDismissMs}ms` }} onAnimationEnd={onDismiss} aria-hidden="true" />
      )}
    </div>
  );
}

/** The messages for one field, shown under its input. */
export function FieldError({ error, field, id }) {
  const messages = fieldMessages(error, field);
  if (!messages.length) return null;
  return <span className="field-error" id={id} role="alert"><AlertIcon />{messages.join(', ')}</span>;
}

/** Props that mark an input invalid, link it to its FieldError, and let ErrorAlert focus it. */
export const invalidProps = (error, field, id) =>
  (fieldMessages(error, field).length ? { 'aria-invalid': true, 'aria-describedby': id, 'data-field': field } : { 'data-field': field });
