import { useDebouncedValue } from '../hooks.js';
import Dropdown from './Dropdown.jsx';
import { ArrowDownIcon, ArrowUpIcon, ClockIcon, Dot, FolderIcon, HashIcon, HistoryIcon, LayersIcon, SearchIcon } from './icons.jsx';

export const NO_FILTERS = { q: '', status: '', category_id: '', tag_id: '', sort: 'createdAt:desc' };

export const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', description: 'In use and shown normally', icon: <Dot tone="success" /> },
  { value: 'archived', label: 'Archived', description: 'Kept, but out of the way', icon: <Dot tone="warning" /> },
];

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'Any status', description: 'Active and archived', icon: <LayersIcon /> },
  ...STATUS_OPTIONS,
];

const SORT_OPTIONS = [
  { value: 'createdAt:desc', label: 'Newest first', group: 'Created date', icon: <ArrowDownIcon /> },
  { value: 'createdAt:asc', label: 'Oldest first', group: 'Created date', icon: <ArrowUpIcon /> },
  { value: 'updatedAt:desc', label: 'Recently updated', group: 'Updated date', icon: <ClockIcon /> },
  { value: 'updatedAt:asc', label: 'Least recently updated', short: 'Least recent', group: 'Updated date', icon: <HistoryIcon /> },
];

const countLabel = (n) => (n === undefined ? undefined : `${n} ${n === 1 ? 'note' : 'notes'}`);

/** Dropdown options for categories / tags; `noteCount` (from /mine) is shown as the description. */
export const labelOptions = (labels, icon) =>
  labels.map((l) => ({ value: l._id, label: l.name, description: countLabel(l.noteCount), icon }));

// Query string for GET /api/notes from the filter state; empty filters are left out.
export function useNotesQuery(filters, base = {}) {
  const debounced = useDebouncedValue(filters);
  const [sort, order] = debounced.sort.split(':');
  const params = new URLSearchParams(base);
  for (const key of ['q', 'status', 'category_id', 'tag_id']) {
    const value = debounced[key].trim();
    if (value) params.set(key, value);
  }
  params.set('sort', sort);
  params.set('order', order);
  return `/notes?${params}`;
}

export const isFiltered = (f) => Boolean(f.q.trim() || f.status || f.category_id || f.tag_id);

/** categories / tags: [{ _id, name, noteCount? }] offered in the category and tag filters. */
export default function NoteFilters({ filters, onChange, categories, tags }) {
  const choose = (key) => (value) => onChange({ ...filters, [key]: value });
  return (
    <div className="toolbar">
      <label className="toolbar-search input-icon">
        <SearchIcon />
        <input type="search" placeholder="Search title and content…" aria-label="Search notes" value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })} />
      </label>
      <Dropdown label="Filter by status" value={filters.status} options={STATUS_FILTER_OPTIONS} onChange={choose('status')} />
      <Dropdown label="Filter by category" value={filters.category_id} onChange={choose('category_id')}
        className={filters.category_id ? '' : 'dropdown-placeholder'}
        options={[{ value: '', label: 'Any category', short: 'Category', icon: <FolderIcon /> }, ...labelOptions(categories, <FolderIcon />)]} />
      <Dropdown label="Filter by tag" value={filters.tag_id} onChange={choose('tag_id')}
        className={filters.tag_id ? '' : 'dropdown-placeholder'}
        options={[{ value: '', label: 'Any tag', short: 'Tag', icon: <HashIcon /> }, ...labelOptions(tags, <HashIcon />)]} />
      <Dropdown className="dropdown-sort" label="Sort notes" prefix="Sort" value={filters.sort} options={SORT_OPTIONS} onChange={choose('sort')} />
      {isFiltered(filters) && (
        <button type="button" className="btn btn-ghost" onClick={() => onChange({ ...NO_FILTERS, sort: filters.sort })}>Clear</button>
      )}
    </div>
  );
}
