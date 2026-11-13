import { useState } from 'react';
import { api } from '../api.js';
import Dropdown from './Dropdown.jsx';
import { FolderIcon, PlusIcon } from './icons.jsx';

const NEW = '__new__';

/** Category dropdown for the note form, with "New category…" to create one inline. */
export default function CategoryPicker({ value, onChange, categories, onCreated, onError }) {
  const [draft, setDraft] = useState(null); // null = picking, string = typing a new category

  async function create() {
    try {
      const category = await api('/categories', { method: 'POST', body: { name: draft } });
      await onCreated();
      onChange(category._id);
      setDraft(null);
    } catch (err) { onError(err); }
  }

  if (draft !== null) {
    return (
      <div className="inline-create">
        <input autoFocus placeholder="New category name" maxLength={50} value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); if (draft.trim()) create(); }
            if (e.key === 'Escape') { e.preventDefault(); setDraft(null); }
          }} />
        <button type="button" className="btn btn-primary" disabled={!draft.trim()} onClick={create}>Add</button>
        <button type="button" className="btn btn-ghost" onClick={() => setDraft(null)}>Cancel</button>
      </div>
    );
  }

  return (
    <Dropdown label="Category" prefix="Category" value={value}
      onChange={(v) => (v === NEW ? setDraft('') : onChange(v))}
      options={[
        { value: '', label: 'None', icon: <FolderIcon /> },
        ...categories.map((c) => ({ value: c._id, label: c.name, icon: <FolderIcon /> })),
        { value: NEW, label: 'New category…', description: 'Create a category and use it', icon: <PlusIcon /> },
      ]} />
  );
}
