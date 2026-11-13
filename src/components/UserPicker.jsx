import { useEffect, useId, useRef, useState } from 'react';
import { api } from '../api.js';
import { useDebouncedValue } from '../hooks.js';
import { CheckIcon, ChevronDownIcon, SearchIcon, UserIcon } from './icons.jsx';

const LIMIT = 8;

/**
 * Searchable user dropdown: a button that opens a search box over GET /api/users?q= (email prefix).
 * value: the selected user ({ _id, name, email }) or null for "Any user"; onChange gets the same.
 * Keyboard in the search box: arrows move, Enter picks, Escape closes.
 */
export default function UserPicker({ value, onChange, onError, label = 'Filter by user' }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const id = useId();
  const search = useDebouncedValue(query.trim(), 250);

  // Fetch matching users while the menu is open.
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ limit: String(LIMIT) });
    if (search) params.set('q', search);
    api(`/users?${params}`)
      .then((res) => { if (!cancelled) { setUsers(res.data); setTotal(res.total); setActive(0); } })
      .catch((err) => { if (!cancelled) onError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, search, onError]);

  // Close on a click outside.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Option 0 is "Any user"; then the matching users.
  const options = [null, ...users];
  const optionId = (i) => `${id}-option-${i}`;

  function toggle() {
    if (open) return setOpen(false);
    setQuery('');
    setOpen(true);
  }

  function choose(user) {
    onChange(user);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onKeyDown(e) {
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); break;
      case 'ArrowUp': e.preventDefault(); setActive((a) => Math.max(0, a - 1)); break;
      case 'Enter': e.preventDefault(); choose(options[active] ?? null); break;
      case 'Escape': e.preventDefault(); setOpen(false); triggerRef.current?.focus(); break;
      case 'Tab': setOpen(false); break;
      default:
    }
  }

  return (
    <div ref={rootRef} className={`dropdown user-picker ${open ? 'open' : ''} ${value ? '' : 'dropdown-placeholder'}`}>
      <button ref={triggerRef} type="button" className="dropdown-trigger" aria-label={label} aria-haspopup="dialog"
        aria-expanded={open} title={value ? `${value.name} (${value.email})` : 'Any user'} onClick={toggle}>
        <span className="dropdown-icon"><UserIcon /></span>
        <span className="dropdown-value">{value ? value.name : 'User'}</span>
        <ChevronDownIcon className="dropdown-chevron" />
      </button>

      {open && (
        <div className="dropdown-menu user-picker-menu" role="dialog" aria-label={label}>
          <label className="input-icon user-picker-search">
            <SearchIcon />
            <input type="search" autoFocus placeholder="Search by email…" value={query} role="combobox"
              aria-label="Search users" aria-expanded="true" aria-controls={`${id}-listbox`} aria-autocomplete="list"
              aria-activedescendant={optionId(active)} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown} />
          </label>
          <ul id={`${id}-listbox`} role="listbox" aria-label="Users" className="user-picker-list">
            {options.map((user, i) => (
              <li key={user?._id ?? 'any'} id={optionId(i)} role="option" aria-selected={(user?._id ?? null) === (value?._id ?? null)}
                className={`dropdown-option ${i === active ? 'active' : ''}`}
                onPointerEnter={() => setActive(i)} onPointerDown={(e) => e.preventDefault()} onClick={() => choose(user)}>
                <span className="dropdown-option-icon"><UserIcon /></span>
                <span className="dropdown-option-text">
                  <span className="dropdown-option-label">{user ? user.name : 'Any user'}</span>
                  <span className="dropdown-option-desc">{user ? user.email : 'Notes of every user'}</span>
                </span>
                <CheckIcon className="dropdown-check" />
              </li>
            ))}
            {!loading && users.length === 0 && <li className="user-picker-empty" role="presentation">No users match “{search}”.</li>}
            {total > users.length && (
              <li className="user-picker-empty" role="presentation">Showing {users.length} of {total}. Type to narrow down.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
