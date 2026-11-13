import { Fragment, useCallback, useState } from 'react';
import { api, fmtDate, splitList } from '../api.js';
import { useList, usePaginated } from '../hooks.js';
import CategoryPicker from './CategoryPicker.jsx';
import { ArchiveIcon, PinIcon, PinOffIcon, UnarchiveIcon } from './icons.jsx';
import NoteFilters, { NO_FILTERS, isFiltered, useNotesQuery } from './NoteFilters.jsx';
import NoteModal from './NoteModal.jsx';
import Toast from './Toast.jsx';
import Pager, { EmptyRow } from './Pager.jsx';

const EMPTY = { title: '', content: '', category_id: '', tags: '' };

// Admins see everyone's notes, archived ones included (dimmed), unless they filter.
const ALL_NOTES_DEFAULTS = { ...NO_FILTERS, isArchived: 'all' };

function emptyMessage(filters, defaults, fallback) {
  if (filters.isArchived === 'true' && !filters.q.trim() && !filters.category_id && !filters.tag_id) return 'No archived notes.';
  return isFiltered(filters, defaults) ? 'No notes match these filters.' : fallback;
}

/** Archive / unarchive a note; returns the toast offering Undo. */
function useArchiving(onChanged, onError) {
  const [toast, setToast] = useState(null);
  const dismiss = useCallback(() => setToast(null), []);

  async function setArchived(note, isArchived, undoable = true) {
    try {
      await api(`/notes/${note._id}`, { method: 'PATCH', body: { isArchived } });
      onChanged();
      setToast(undoable
        ? { message: `“${note.title}” ${isArchived ? 'archived' : 'moved out of the archive'}`, undo: () => setArchived(note, !isArchived, false) }
        : null);
    } catch (err) { onError(err.message); }
  }

  const toastElement = toast && (
    <Toast message={toast.message} actionLabel="Undo" onAction={toast.undo} onDismiss={dismiss} />
  );
  return { setArchived, toastElement };
}

function ArchiveButton({ note, onArchive }) {
  return (
    <button type="button" className="btn btn-sm btn-with-icon" title={note.isArchived ? 'Move out of the archive' : 'Archive this note'}
      onClick={() => onArchive(note, !note.isArchived)}>
      {note.isArchived ? <><UnarchiveIcon />Unarchive</> : <><ArchiveIcon />Archive</>}
    </button>
  );
}

// Clicking anywhere on a row opens the note, except on the row's own buttons (tags, category, actions).
// The title button gets focus first, so it gets focus back when the modal closes.
const openFromRow = (open) => (e) => {
  if (e.target.closest('button, a, input')) return;
  e.currentTarget.querySelector('.note-title')?.focus();
  open();
};

function TitleCell({ note, onOpen, onTag }) {
  return (
    <td>
      {note.pinned_at && <PinIcon className="pin-marker" aria-label="Pinned" role="img" />}
      <button type="button" className="note-title" onClick={onOpen}>{note.title}</button>
      <NoteMeta note={note} onTag={onTag} />
    </td>
  );
}

// Pinning applies to the active list; archived notes are never pinned (archiving unpins).
async function setPinned(note, pinned, onChanged, onError) {
  try {
    await api(`/notes/${note._id}`, { method: 'PATCH', body: { pinned } });
    onChanged();
  } catch (err) { onError(err.message); }
}

function PinButton({ note, onPin }) {
  const pinned = Boolean(note.pinned_at);
  return (
    <button type="button" className={`btn btn-sm btn-icon-sm ${pinned ? 'btn-pinned' : ''}`} aria-pressed={pinned}
      aria-label={pinned ? 'Unpin note' : 'Pin note'} title={pinned ? 'Unpin' : 'Pin to the top'} onClick={() => onPin(note, !pinned)}>
      {pinned ? <PinOffIcon /> : <PinIcon />}
    </button>
  );
}

/** A "Pinned" / "Others" heading row before each group, when the page has pinned notes. */
function GroupRow({ notes, index, colSpan }) {
  const pinned = Boolean(notes[index].pinned_at);
  const startsGroup = index === 0 || pinned !== Boolean(notes[index - 1].pinned_at);
  if (!startsGroup || !notes.some((n) => n.pinned_at)) return null;
  return (
    <tr className="group-row">
      <td colSpan={colSpan}>{pinned ? <><PinIcon /> Pinned</> : 'Others'}</td>
    </tr>
  );
}

// Status and tags under a note's title; clicking a tag filters by it.
function NoteMeta({ note, onTag }) {
  return (
    <div className="note-meta">
      {note.isArchived && <span className="badge badge-archived">archived</span>}
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
  const [open, setOpen] = useState(null); // { note, editing } shown in the modal
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const reloadLabels = () => Promise.all([myCategories.reload(), myTags.reload()]);

  async function create(e) {
    e.preventDefault();
    try {
      await api('/notes', { method: 'POST', body: { ...form, tags: splitList(form.tags) } });
      setForm(EMPTY);
      reloadFirstPage();
      reloadLabels();
    } catch (err) { onError(err.message); }
  }

  function onModalChanged() {
    reload();
    reloadLabels();
  }

  const { setArchived, toastElement } = useArchiving(onModalChanged, onError);
  const pin = (note, pinned) => setPinned(note, pinned, onModalChanged, onError);

  return (
    <>
      <section className="card">
        <div className="card-header">
          <h2>New note</h2>
          <span className="card-subtitle">Click a note below to open, edit or delete it</span>
        </div>
        <form className="form" onSubmit={create}>
          <input placeholder="Title" required value={form.title} onChange={set('title')} />
          <textarea placeholder="Write something…" value={form.content} onChange={set('content')} />
          <div className="form-grid">
            <CategoryPicker value={form.category_id} categories={allCategories.items} onError={onError}
              onCreated={allCategories.reload} onChange={(category_id) => setForm((f) => ({ ...f, category_id }))} />
            <input placeholder="Tags, comma separated" value={form.tags} onChange={set('tags')} />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary">Add note</button>
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
          <table className="notes-table">
            <thead><tr><th>Title</th><th>Category</th><th>Content</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {result?.data.length === 0 && (
                <EmptyRow colSpan={5}>{emptyMessage(filters, NO_FILTERS, 'No notes yet. Add your first one above.')}</EmptyRow>
              )}
              {result?.data.map((n, i) => (
                <Fragment key={n._id}>
                <GroupRow notes={result.data} index={i} colSpan={5} />
                <tr className={`row-clickable ${n.isArchived ? 'row-muted' : ''}`}
                  onClick={openFromRow(() => setOpen({ note: n, editing: false }))}>
                  <TitleCell note={n} onOpen={() => setOpen({ note: n, editing: false })} onTag={(tag_id) => setFilters({ ...filters, tag_id })} />
                  <CategoryCell note={n} onCategory={(category_id) => setFilters({ ...filters, category_id })} />
                  <td><div className="clamp">{n.content}</div></td>
                  <Dates note={n} />
                  <td>
                    <div className="row-actions">
                      {!n.isArchived && <PinButton note={n} onPin={pin} />}
                      <button className="btn btn-sm" onClick={() => setOpen({ note: n, editing: true })}>Edit</button>
                      <ArchiveButton note={n} onArchive={setArchived} />
                    </div>
                  </td>
                </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        <Pager result={result} setPage={setPage} />
      </section>

      {open && (
        <NoteModal key={open.note._id} note={open.note} canEdit startEditing={open.editing} categories={allCategories.items}
          onCategoryCreated={allCategories.reload} onChanged={onModalChanged} onArchive={setArchived}
          onClose={() => setOpen(null)} onError={onError} />
      )}
      {toastElement}
    </>
  );
}

export function AllNotes({ onError, currentUserId }) {
  const [filters, setFilters] = useState(ALL_NOTES_DEFAULTS);
  const { result, setPage, reload } = usePaginated(useNotesQuery(filters, { all: 'true' }), onError);
  const categories = useList('/categories', onError);
  const tags = useList('/tags', onError);
  const [open, setOpen] = useState(null);
  const { setArchived, toastElement } = useArchiving(reload, onError);
  return (
    <section className="card">
      <div className="card-header">
        <h2>Everyone's notes</h2>
        <span className="card-subtitle">Admin view · all users{result ? ` · ${result.total} notes` : ''}</span>
      </div>
      <NoteFilters filters={filters} onChange={setFilters} categories={categories.items} tags={tags.items} defaults={ALL_NOTES_DEFAULTS} />
      <div className="table-wrap">
        <table className="notes-table">
          <thead><tr><th>Title</th><th>Category</th><th>Content</th><th>Owner</th><th>Created</th></tr></thead>
          <tbody>
            {result?.data.length === 0 && <EmptyRow colSpan={5}>{emptyMessage(filters, ALL_NOTES_DEFAULTS, 'No notes yet.')}</EmptyRow>}
            {result?.data.map((n) => (
              <tr key={n._id} className={`row-clickable ${n.isArchived ? 'row-muted' : ''}`}
                onClick={openFromRow(() => setOpen(n))}>
                <TitleCell note={n} onOpen={() => setOpen(n)} onTag={(tag_id) => setFilters({ ...filters, tag_id })} />
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

      {open && (
        // The API lets you edit only your own notes; everyone else's open read-only.
        <NoteModal key={open._id} note={open} canEdit={open.user_id === currentUserId} categories={categories.items}
          onCategoryCreated={categories.reload} onChanged={reload} onArchive={setArchived} onClose={() => setOpen(null)} onError={onError} />
      )}
      {toastElement}
    </section>
  );
}
