import { useState } from 'react';
import { api } from '../api.js';
import ErrorAlert, { FieldError, invalidProps } from './ErrorAlert.jsx';
import { CheckIcon, EyeIcon, EyeOffIcon, LockIcon, UserIcon, XIcon } from './icons.jsx';

const BIO_MAX = 500;
const INTERESTS_MAX = 20;

const memberSince = (date) => (date ? new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : null);

export default function Profile({ user, onUpdated }) {
  return (
    <div className="profile">
      <ProfileHero user={user} />
      <div className="profile-grid">
        <AboutForm user={user} onUpdated={onUpdated} />
        <PasswordForm />
      </div>
    </div>
  );
}

function ProfileHero({ user }) {
  const since = memberSince(user.createdAt);
  return (
    <section className="card profile-hero">
      <div className="profile-identity">
        <h2>{user.name}</h2>
        <div className="profile-sub">
          <span>{user.email}</span>
          <span className={`badge ${user.role?.name === 'admin' ? 'badge-admin' : ''}`}>{user.role?.name ?? 'no role'}</span>
          {since && <span className="cell-muted">Member since {since}</span>}
        </div>
      </div>
      {user.bio
        ? <p className="profile-bio">{user.bio}</p>
        : <p className="profile-bio profile-empty">No bio yet. Tell people a little about yourself below.</p>}
      {user.interests?.length > 0 && (
        <div className="chips profile-interests">
          {user.interests.map((i) => <span key={i} className="chip chip-interest">{i}</span>)}
        </div>
      )}
    </section>
  );
}

function AboutForm({ user, onUpdated }) {
  const [form, setForm] = useState({ name: user.name, bio: user.bio ?? '', interests: user.interests ?? [] });
  const [draft, setDraft] = useState(''); // the interest being typed
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const change = (patch) => { setSaved(false); setForm((f) => ({ ...f, ...patch })); };

  function addInterest(raw) {
    const value = raw.trim().toLowerCase();
    setDraft('');
    if (!value || form.interests.includes(value) || form.interests.length >= INTERESTS_MAX) return;
    change({ interests: [...form.interests, value.slice(0, 50)] });
  }

  function onInterestKey(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addInterest(draft);
    } else if (e.key === 'Backspace' && !draft && form.interests.length) {
      change({ interests: form.interests.slice(0, -1) });
    }
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const interests = draft.trim() ? [...new Set([...form.interests, draft.trim().toLowerCase()])] : form.interests;
      const res = await api('/auth/me', { method: 'PATCH', body: { name: form.name, bio: form.bio, interests } });
      onUpdated(res.user);
      setForm({ name: res.user.name, bio: res.user.bio ?? '', interests: res.user.interests ?? [] });
      setDraft('');
      setSaved(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="card-header">
        <h2 className="with-icon"><UserIcon />About you</h2>
        <span className="card-subtitle">Shown on your profile</span>
      </div>
      <form className="form" onSubmit={save} noValidate>
        <ErrorAlert error={error} onDismiss={() => setError(null)} />
        <label className="field">
          Name
          <input required maxLength={100} value={form.name} onChange={(e) => change({ name: e.target.value })}
            {...invalidProps(error, 'name', 'profile-name-error')} />
          <FieldError error={error} field="name" id="profile-name-error" />
        </label>
        <label className="field">
          <span className="field-row">Bio <span className={`char-count ${form.bio.length > BIO_MAX ? 'over' : ''}`}>{form.bio.length}/{BIO_MAX}</span></span>
          <textarea rows={4} placeholder="A few words about you, your work or what you write about…" value={form.bio}
            onChange={(e) => change({ bio: e.target.value })} {...invalidProps(error, 'bio', 'profile-bio-error')} />
          <FieldError error={error} field="bio" id="profile-bio-error" />
        </label>
        <div className="field">
          <span className="field-row">Interests <span className="char-count">{form.interests.length}/{INTERESTS_MAX}</span></span>
          <div className={`tag-input ${fieldHasError(error, 'interests') ? 'invalid' : ''}`}>
            {form.interests.map((i) => (
              <span key={i} className="chip chip-interest chip-removable">
                {i}
                <button type="button" aria-label={`Remove ${i}`} onClick={() => change({ interests: form.interests.filter((x) => x !== i) })}><XIcon /></button>
              </span>
            ))}
            <input aria-label="Add an interest" placeholder={form.interests.length ? 'Add another…' : 'e.g. hiking, chess — press Enter'}
              value={draft} disabled={form.interests.length >= INTERESTS_MAX}
              onChange={(e) => (e.target.value.endsWith(',') ? addInterest(e.target.value.slice(0, -1)) : setDraft(e.target.value))}
              onKeyDown={onInterestKey} onBlur={() => draft && addInterest(draft)} />
          </div>
          <span className="field-hint">Press Enter or comma to add. Interests group people on the Interests screen.</span>
          <FieldError error={error} field="interests" id="profile-interests-error" />
        </div>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
          {saved && <span className="success with-icon"><CheckIcon />Profile saved</span>}
        </div>
      </form>
    </section>
  );
}

const fieldHasError = (error, field) => Boolean(error?.fields?.some((f) => f.field === field || f.field.startsWith(`${field}.`)));

/** 0–4 from length and character variety; only a hint, the server enforces 8–72 characters. */
function strength(password) {
  if (!password) return 0;
  let score = password.length >= 8 ? 1 : 0;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score += 1;
  return Math.min(4, score);
}
const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Good', 'Strong'];

const EMPTY_PASSWORDS = { currentPassword: '', newPassword: '', confirmPassword: '' };

function PasswordForm() {
  const [form, setForm] = useState(EMPTY_PASSWORDS);
  const [show, setShow] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const set = (key) => (e) => { setDone(false); setForm({ ...form, [key]: e.target.value }); };

  const score = strength(form.newPassword);
  const mismatch = form.confirmPassword !== '' && form.confirmPassword !== form.newPassword;
  const ready = form.currentPassword && form.newPassword.length >= 8 && form.newPassword === form.confirmPassword;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/auth/me/password', { method: 'POST', body: form });
      setForm(EMPTY_PASSWORDS);
      setDone(true);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const type = show ? 'text' : 'password';
  return (
    <section className="card">
      <div className="card-header">
        <h2 className="with-icon"><LockIcon />Change password</h2>
        <button type="button" className="btn btn-sm btn-ghost with-icon" onClick={() => setShow((s) => !s)} aria-pressed={show}>
          {show ? <><EyeOffIcon />Hide</> : <><EyeIcon />Show</>}
        </button>
      </div>
      <form className="form" onSubmit={submit} noValidate>
        <ErrorAlert error={error} onDismiss={() => setError(null)} />
        {done && <div className="success-callout" role="status"><CheckIcon />Your password was changed. Use the new one next time you sign in.</div>}
        <label className="field">
          Current password
          <input type={type} autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')}
            {...invalidProps(error, 'currentPassword', 'pw-current-error')} />
          <FieldError error={error} field="currentPassword" id="pw-current-error" />
        </label>
        <label className="field">
          New password
          <input type={type} autoComplete="new-password" maxLength={72} value={form.newPassword} onChange={set('newPassword')}
            {...invalidProps(error, 'newPassword', 'pw-new-error')} />
          {form.newPassword && (
            <span className={`strength strength-${score}`} aria-live="polite">
              <span className="strength-bar"><span style={{ width: `${(score / 4) * 100}%` }} /></span>
              {STRENGTH_LABELS[score]}
            </span>
          )}
          <span className="field-hint">8–72 characters. Mixing cases, numbers and symbols makes it stronger.</span>
          <FieldError error={error} field="newPassword" id="pw-new-error" />
        </label>
        <label className="field">
          Confirm new password
          <input type={type} autoComplete="new-password" maxLength={72} value={form.confirmPassword} onChange={set('confirmPassword')}
            aria-invalid={mismatch || fieldHasError(error, 'confirmPassword') || undefined} aria-describedby="pw-confirm-error" />
          {mismatch
            ? <span className="field-error" id="pw-confirm-error" role="alert">Passwords don’t match yet</span>
            : form.confirmPassword && form.confirmPassword === form.newPassword
              ? <span className="field-ok with-icon"><CheckIcon />Passwords match</span>
              : <FieldError error={error} field="confirmPassword" id="pw-confirm-error" />}
        </label>
        <div className="form-actions">
          <button className="btn btn-primary" disabled={busy || !ready}>{busy ? 'Changing…' : 'Change password'}</button>
        </div>
      </form>
    </section>
  );
}
