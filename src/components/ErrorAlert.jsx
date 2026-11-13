import { describeError, fieldMessages } from '../errors.js';
import { AlertIcon, ClockIcon, LockIcon, OfflineIcon, SearchIcon, XIcon } from './icons.jsx';

const ICONS = { alert: AlertIcon, lock: LockIcon, clock: ClockIcon, search: SearchIcon, offline: OfflineIcon };

/**
 * Shows an API error (or a plain message) as a titled callout: what happened, why, and for validation
 * errors each field with its problems. `onDismiss` adds a close button.
 */
export default function ErrorAlert({ error, onDismiss, className = '' }) {
  const info = describeError(error);
  if (!info) return null;
  const Icon = ICONS[info.icon] ?? AlertIcon;
  return (
    <div className={`error-alert error-alert-${info.tone} ${className}`} role="alert" aria-live="assertive">
      <span className="error-alert-icon"><Icon /></span>
      <div className="error-alert-body">
        <strong className="error-alert-title">{info.title}</strong>
        {info.message && <p className="error-alert-message">{info.message}</p>}
        {info.fields.length > 0 && (
          <ul className="error-alert-fields">
            {info.fields.map((f) => (
              <li key={f.field}><span className="error-alert-field">{f.label}</span> {f.messages.join(', ')}</li>
            ))}
          </ul>
        )}
        {info.permission && (
          <p className="error-alert-hint">
            Ask an admin to turn on <code className="error-alert-permission">{info.permission}</code> for your role.
          </p>
        )}
      </div>
      {onDismiss && (
        <button type="button" className="btn btn-sm btn-ghost error-alert-close" onClick={onDismiss} aria-label="Dismiss"><XIcon /></button>
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

/** Props that mark an input invalid and link it to its FieldError. */
export const invalidProps = (error, field, id) =>
  (fieldMessages(error, field).length ? { 'aria-invalid': true, 'aria-describedby': id } : {});
