import { useDebouncedValue } from '../hooks.js';
import Dropdown from './Dropdown.jsx';
import { ArchiveIcon, ArrowDownIcon, ArrowUpIcon, ClockIcon, FolderIcon, HashIcon, HistoryIcon, InboxIcon, LayersIcon, SearchIcon } from './icons.jsx';

/** isArchived: 'false' (not archived, the API default), 'true' (the archive) or 'all'. */
export const NO_FILTERS = { q: '', isArchived: 'false', category_id: '', tag_id: '', sort: 'createdAt:desc' };

const ARCHIVE_OPTIONS = [
  { value: 'false', label: 'Active notes', description: 'Everything not archived', icon: <InboxIcon /> },
  { value: 'true', label: 'Archived', description: 'Notes you put away', icon: <ArchiveIcon /> },
  { value: 'all', label: 'All notes', description: 'Active and archived', icon: <LayersIcon /> },
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
  for (const key of ['q', 'isArchived', 'category_id', 'tag_id']) {
    const value = debounced[key].trim();
    if (value) params.set(key, value);
  }
  params.set('sort', sort);
  params.set('order', order);
  return `/notes?${params}`;
}

/** True when anything beyond the view's default archive setting narrows the list. */
export const isFiltered = (f, defaults = NO_FILTERS) =>
  Boolean(f.q.trim() || f.category_id || f.tag_id || f.isArchived !== defaults.isArchived);

/**
 * categories / tags: [{ _id, name, noteCount? }] offered in the category and tag filters.
 * defaults: the view's starting filters (Clear goes back to them).
 */
export default function NoteFilters({ filters, onChange, categories, tags, defaults = NO_FILTERS }) {
  const choose = (key) => (value) => onChange({ ...filters, [key]: value });
  return (
    <div className="toolbar">
      <label className="toolbar-search input-icon">
        <SearchIcon />
        <input type="search" placeholder="Search title and content…" aria-label="Search notes" value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })} />
      </label>
      <Dropdown label="Show" value={filters.isArchived} options={ARCHIVE_OPTIONS} onChange={choose('isArchived')} />
      <Dropdown label="Filter by category" value={filters.category_id} onChange={choose('category_id')}
        className={filters.category_id ? '' : 'dropdown-placeholder'}
        options={[{ value: '', label: 'Any category', short: 'Category', icon: <FolderIcon /> }, ...labelOptions(categories, <FolderIcon />)]} />
      <Dropdown label="Filter by tag" value={filters.tag_id} onChange={choose('tag_id')}
        className={filters.tag_id ? '' : 'dropdown-placeholder'}
        options={[{ value: '', label: 'Any tag', short: 'Tag', icon: <HashIcon /> }, ...labelOptions(tags, <HashIcon />)]} />
      <Dropdown className="dropdown-sort" label="Sort notes" prefix="Sort" value={filters.sort} options={SORT_OPTIONS} onChange={choose('sort')} />
      {isFiltered(filters, defaults) && (
        <button type="button" className="btn btn-ghost" onClick={() => onChange({ ...defaults, sort: filters.sort })}>Clear</button>
      )}
    </div>
  );
}
