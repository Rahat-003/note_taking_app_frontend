import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { CheckIcon, ChevronDownIcon } from './icons.jsx';

const MENU_MAX_HEIGHT = 320;
const MENU_MAX_WIDTH = 320;

/**
 * Select-only combobox (WAI-ARIA pattern): a button that opens a listbox of options.
 * options: [{ value, label, short?, description?, icon?, group? }]; `short` replaces the label in the
 * closed trigger. Consecutive options with the same
 * `group` are shown under one heading. Keyboard: arrows, Home/End, Enter/Space, Escape, Tab, type-ahead.
 */
export default function Dropdown({ value, options, onChange, label, prefix, className = '' }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState({ up: false, right: false });
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const typeahead = useRef({ text: '', at: 0 });
  const id = useId();

  const selectedIndex = Math.max(0, options.findIndex((o) => o.value === value));
  const selected = options[selectedIndex];
  const optionId = (i) => `${id}-option-${i}`;

  // Close on a click outside.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => { if (!rootRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Keep the highlighted option visible while moving through a long list.
  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  function openMenu(index = selectedIndex) {
    // Open upwards when there is not enough room below; align right near the viewport edge.
    const rect = triggerRef.current.getBoundingClientRect();
    const height = Math.min(MENU_MAX_HEIGHT, options.length * 48 + 16);
    const below = window.innerHeight - rect.bottom;
    setPlacement({ up: below < height + 8 && rect.top > below, right: rect.left + MENU_MAX_WIDTH > window.innerWidth });
    setActive(index);
    setOpen(true);
  }

  function choose(index) {
    onChange(options[index].value);
    setOpen(false);
    triggerRef.current.focus();
  }

  function jumpToTyped(key) {
    const now = Date.now();
    const text = (now - typeahead.current.at < 600 ? typeahead.current.text : '') + key.toLowerCase();
    typeahead.current = { text, at: now };
    const match = options.findIndex((o) => o.label.toLowerCase().startsWith(text));
    if (match >= 0) {
      if (open) setActive(match);
      else onChange(options[match].value);
    }
  }

  function onKeyDown(e) {
    const last = options.length - 1;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        jumpToTyped(e.key);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((a) => Math.min(last, a + 1)); break;
      case 'ArrowUp': e.preventDefault(); setActive((a) => Math.max(0, a - 1)); break;
      case 'Home': e.preventDefault(); setActive(0); break;
      case 'End': e.preventDefault(); setActive(last); break;
      case 'Enter':
      case ' ': e.preventDefault(); choose(active); break;
      case 'Escape': e.preventDefault(); setOpen(false); break;
      case 'Tab': setOpen(false); break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) jumpToTyped(e.key);
    }
  }

  return (
    <div ref={rootRef} className={`dropdown ${open ? 'open' : ''} ${className}`}>
      <button
        ref={triggerRef}
        type="button"
        className="dropdown-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-listbox`}
        aria-activedescendant={open ? optionId(active) : undefined}
        title={selected?.label}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        {prefix && <span className="dropdown-prefix">{prefix}</span>}
        {selected?.icon && <span className="dropdown-icon">{selected.icon}</span>}
        <span className="dropdown-value">{selected?.short ?? selected?.label}</span>
        <ChevronDownIcon className="dropdown-chevron" />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-listbox`}
          role="listbox"
          aria-label={label}
          className={`dropdown-menu ${placement.up ? 'up' : ''} ${placement.right ? 'align-right' : ''}`}
        >
          {options.map((option, i) => (
            <Fragment key={String(option.value)}>
              {option.group && option.group !== options[i - 1]?.group && (
                <li role="presentation" className="dropdown-group">{option.group}</li>
              )}
              <li
                id={optionId(i)}
                data-index={i}
                role="option"
                aria-selected={i === selectedIndex}
                className={`dropdown-option ${i === active ? 'active' : ''}`}
                onPointerEnter={() => setActive(i)}
                onPointerDown={(e) => e.preventDefault() /* keep focus on the trigger */}
                onClick={() => choose(i)}
              >
                {option.icon && <span className="dropdown-option-icon">{option.icon}</span>}
                <span className="dropdown-option-text">
                  <span className="dropdown-option-label">{option.label}</span>
                  {option.description && <span className="dropdown-option-desc">{option.description}</span>}
                </span>
                <CheckIcon className="dropdown-check" />
              </li>
            </Fragment>
          ))}
        </ul>
      )}
    </div>
  );
}
