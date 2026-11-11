import { useState } from 'react';
import { api, fmtDate, splitList } from '../api.js';
import { useList, usePaginated } from '../hooks.js';
import CategoryPicker from './CategoryPicker.jsx';
import Dropdown from './Dropdown.jsx';
import NoteFilters, { NO_FILTERS, STATUS_OPTIONS, isFiltered, useNotesQuery } from './NoteFilters.jsx';
import Pager, { EmptyRow } from './Pager.jsx';

const EMPTY = { id: '', title: '', content: '', status: 'active', category_id: '', tags: '' };

// Status and tags under a note's title; clicking a tag filters by it.
function NoteMeta({ note, onTag }) {
  return (
    <div className="note-meta">
      {note.status === 'archived' && <span className="badge">archived</span>}
      {note.tags?.map((t) => (
        <button key={t._id} type="button" className="chip chip-toggle" title={`Show notes tagged “${t.name}”`} onClick={() => onTag(t._id)}>
          #{t.name}
        </button>
      ))}
    </div>
  );
}

function CategoryCell({ note, onCategory }) {
  return (
    <td>
      {note.category
        ? <button type="button" className="badge badge-category badge-button" title={`Show notes in “${note.category.name}”`}
            onClick={() => onCategory(note.category._id)}>{note.category.name}</button>
        : <span className="cell-muted">—</span>}
    </td>
  );
}

function Dates({ note }) {
  return (
    <td className="cell-muted">
      <div>{fmtDate(note.createdAt)}</div>
      {note.updatedAt !== note.createdAt && <div className="cell-sub">edited {fmtDate(note.updatedAt)}</div>}
    </td>
  );
}

export function MyNotes({ onError }) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const { result, setPage, reload, reloadFirstPage } = usePaginated(useNotesQuery(filters), onError);
  const allCategories = useList('/categories', onError); // the form can use any category
  const myCategories = useList('/categories/mine', onError); // filters: the categories my notes use, with counts
  const myTags = useList('/tags/mine', onError);
  const [form, setForm] = useState(EMPTY);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const reloadLabels = () => Promise.all([myCategories.reload(), myTags.reload()]);

  async function save(e) {
    e.preventDefault();
    try {
      const body = { title: form.title, content: form.content, status: form.status, category_id: form.category_id, tags: splitList(form.tags) };
      if (form.id) await api(`/notes/${form.id}`, { method: 'PATCH', body });
      else await api('/notes', { method: 'POST', body });
      setForm(EMPTY);
      if (form.id) reload();
      else reloadFirstPage();
      reloadLabels();
    } catch (err) { onError(err.message); }
  }

  async function remove(id) {
    try {
      await api(`/notes/${id}`, { method: 'DELETE' });
      if (form.id === id) setForm(EMPTY);
      reload();
      reloadLabels();
    } catch (err) { onError(err.message); }
  }

  const edit = (n) => setForm({
    id: n._id, title: n.title, content: n.content || '', status: n.status,
    category_id: n.category_id || '', tags: (n.tags || []).map((t) => t.name).join(', '),
  });

  return (
    <>
      <section className="card">
        <div className="card-header">
          <h2>{form.id ? 'Edit note' : 'New note'}</h2>
        </div>
        <form className="form" onSubmit={save}>
          <input placeholder="Title" required value={form.title} onChange={set('title')} />
          <textarea placeholder="Write something…" value={form.content} onChange={set('content')} />
          <div className="form-grid">
            <Dropdown label="Note status" prefix="Status" value={form.status} options={STATUS_OPTIONS}
              onChange={(status) => setForm({ ...form, status })} />
            <CategoryPicker value={form.category_id} categories={allCategories.items} onError={onError}
              onCreated={allCategories.reload} onChange={(category_id) => setForm((f) => ({ ...f, category_id }))} />
            <input placeholder="Tags, comma separated" value={form.tags} onChange={set('tags')} />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary">{form.id ? 'Save changes' : 'Add note'}</button>
            {form.id && <button type="button" className="btn btn-ghost" onClick={() => setForm(EMPTY)}>Cancel</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>My notes</h2>
          {result && <span className="card-subtitle">{result.total} {result.total === 1 ? 'note' : 'notes'}</span>}
        </div>
        <NoteFilters filters={filters} onChange={setFilters} categories={myCategories.items} tags={myTags.items} />
        <div className="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Category</th><th>Content</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {result?.data.length === 0 && (
                <EmptyRow colSpan={5}>{isFiltered(filters) ? 'No notes match these filters.' : 'No notes yet. Add your first one above.'}</EmptyRow>
              )}
              {result?.data.map((n) => (
                <tr key={n._id} className={n.status === 'archived' ? 'row-muted' : ''}>
                  <td>
                    <div className="cell-title">{n.title}</div>
                    <NoteMeta note={n} onTag={(tag_id) => setFilters({ ...filters, tag_id })} />
                  </td>
                  <CategoryCell note={n} onCategory={(category_id) => setFilters({ ...filters, category_id })} />
                  <td><div className="clamp">{n.content}</div></td>
                  <Dates note={n} />
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm" onClick={() => edit(n)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => remove(n._id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager result={result} setPage={setPage} />
      </section>
    </>
  );
}

export function AllNotes({ onError }) {
  const [filters, setFilters] = useState(NO_FILTERS);
  const { result, setPage } = usePaginated(useNotesQuery(filters, { all: 'true' }), onError);
  const categories = useList('/categories', onError);
  const tags = useList('/tags', onError);
  return (
    <section className="card">
      <div className="card-header">
        <h2>Everyone's notes</h2>
        <span className="card-subtitle">Admin view · all users{result ? ` · ${result.total} notes` : ''}</span>
      </div>
      <NoteFilters filters={filters} onChange={setFilters} categories={categories.items} tags={tags.items} />
      <div className="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Category</th><th>Content</th><th>Owner</th><th>Created</th></tr></thead>
          <tbody>
            {result?.data.length === 0 && <EmptyRow colSpan={5}>{isFiltered(filters) ? 'No notes match these filters.' : 'No notes yet.'}</EmptyRow>}
            {result?.data.map((n) => (
              <tr key={n._id} className={n.status === 'archived' ? 'row-muted' : ''}>
                <td>
                  <div className="cell-title">{n.title}</div>
                  <NoteMeta note={n} onTag={(tag_id) => setFilters({ ...filters, tag_id })} />
                </td>
                <CategoryCell note={n} onCategory={(category_id) => setFilters({ ...filters, category_id })} />
                <td><div className="clamp">{n.content}</div></td>
                <td>
                  {n.user ? <>{n.user.name}<div className="cell-muted">{n.user.email}</div></> : <span className="cell-muted">(deleted)</span>}
                </td>
                <Dates note={n} />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager result={result} setPage={setPage} />
    </section>
  );
}
