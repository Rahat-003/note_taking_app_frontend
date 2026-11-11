import { useEffect, useRef, useState } from 'react';
import { api, fmtDate, splitList } from '../api.js';
import CategoryPicker from './CategoryPicker.jsx';
import Modal from './Modal.jsx';
import { ArchiveIcon, PencilIcon, TrashIcon, UnarchiveIcon } from './icons.jsx';

const toForm = (n) => ({
  title: n.title,
  content: n.content || '',
  category_id: n.category_id || '',
  tags: (n.tags || []).map((t) => t.name).join(', '),
});
const sameForm = (a, b) => Object.keys(a).every((k) => a[k] === b[k]);

/**
 * Shows one note; when `canEdit`, it can be edited and deleted in place.
 * `note` is the row from the list (shown at once); the full note is then loaded from the API.
 */
export default function NoteModal({ note: initial, canEdit, startEditing = false, categories, onCategoryCreated, onClose, onChanged, onArchive, onError }) {
  const [note, setNote] = useState(initial);
  const [editing, setEditing] = useState(canEdit && startEditing);
  const [form, setForm] = useState(() => toForm(initial));
  const [busy, setBusy] = useState(false);
  // null | 'delete' | 'discard-close' (close the modal) | 'discard-edit' (back to viewing)
  const [confirm, setConfirm] = useState(null);
  const [error, setError] = useState('');
  const dirty = editing && !sameForm(form, toForm(note));
  const rootRef = useRef(null);
  const hadConfirm = useRef(false);

  // When a confirmation is dismissed its buttons disappear; put focus back on the form (or the Edit
  // button) so keyboard users are not left on <body>.
  useEffect(() => {
    if (confirm) hadConfirm.current = true;
    else if (hadConfirm.current) {
      hadConfirm.current = false;
      const dialog = rootRef.current?.closest('dialog');
      (dialog?.querySelector('#note-edit-form textarea') ?? dialog?.querySelector('.modal-footer .btn-primary'))?.focus();
    }
  }, [confirm]);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  useEffect(() => {
    api(`/notes/${initial._id}`).then(setNote).catch((err) => setError(err.message));
  }, [initial._id]);

  function requestClose() {
    if (dirty) setConfirm('discard-close');
    else onClose();
  }

  function startEdit() {
    setForm(toForm(note));
    setError('');
    setEditing(true);
  }

  function cancelEdit() {
    if (dirty) setConfirm('discard-edit');
    else setEditing(false);
  }

  function discard() {
    const thenClose = confirm === 'discard-close';
    setConfirm(null);
    setEditing(false);
    if (thenClose) onClose();
  }

  async function save(e) {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const updated = await api(`/notes/${note._id}`, {
        method: 'PATCH',
        body: { ...form, tags: splitList(form.tags) },
      });
      setNote(updated);
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/notes/${note._id}`, { method: 'DELETE' });
      onChanged();
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
      setConfirm(null);
    }
  }

  const dates = (
    <>
      Created {fmtDate(note.createdAt)}
      {note.updatedAt !== note.createdAt && <> · Edited {fmtDate(note.updatedAt)}</>}
      {note.user && !canEdit && <> · by {note.user.name}</>}
    </>
  );

  let footer;
  if (confirm === 'delete') {
    footer = (
      <div className="modal-confirm" role="alert">
        <span>Delete this note? This cannot be undone.</span>
        <button type="button" className="btn btn-danger-solid" disabled={busy} onClick={remove}>Delete note</button>
        <button type="button" className="btn btn-ghost" autoFocus onClick={() => setConfirm(null)}>Keep it</button>
      </div>
    );
  } else if (confirm) {
    footer = (
      <div className="modal-confirm" role="alert">
        <span>Discard your unsaved changes?</span>
        <button type="button" className="btn btn-danger-solid" onClick={discard}>Discard</button>
        <button type="button" className="btn btn-ghost" autoFocus onClick={() => setConfirm(null)}>Keep editing</button>
      </div>
    );
  } else if (editing) {
    footer = (
      <>
        <span className="modal-hint">Ctrl / ⌘ + Enter to save</span>
        <button type="button" className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
        <button type="submit" form="note-edit-form" className="btn btn-primary" disabled={busy || !form.title.trim()}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </>
    );
  } else {
    footer = (
      <>
        {canEdit && (
          <button type="button" className="btn btn-danger btn-with-icon" onClick={() => setConfirm('delete')}><TrashIcon />Delete</button>
        )}
        {canEdit && (
          // Archiving closes the modal; the list shows a toast with Undo.
          <button type="button" className="btn btn-with-icon" onClick={() => { onArchive(note, !note.isArchived); onClose(); }}>
            {note.isArchived ? <><UnarchiveIcon />Unarchive</> : <><ArchiveIcon />Archive</>}
          </button>
        )}
        <span className="modal-spacer" />
        <button type="button" className="btn btn-ghost" onClick={onClose}>Close</button>
        {canEdit && <button type="button" className="btn btn-primary btn-with-icon" autoFocus onClick={startEdit}><PencilIcon />Edit</button>}
      </>
    );
  }

  return (
    <Modal title={editing ? 'Edit note' : note.title} subtitle={dates} onClose={requestClose} footer={footer} size="lg">
      <span ref={rootRef} hidden />
      {error && <div className="alert" role="alert">{error}</div>}
      {editing ? (
        <form id="note-edit-form" className="form" onSubmit={save}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) save(e); }}>
          <label className="field">
            Title
            <input required autoFocus maxLength={200} value={form.title} onChange={set('title')} />
          </label>
          <div className="form-grid">
            <CategoryPicker value={form.category_id} categories={categories} onError={setError} onCreated={onCategoryCreated}
              onChange={(category_id) => setForm((f) => ({ ...f, category_id }))} />
            <input placeholder="Tags, comma separated" aria-label="Tags" value={form.tags} onChange={set('tags')} />
          </div>
          <label className="field">
            Content
            <textarea className="modal-textarea" value={form.content} onChange={set('content')} placeholder="Write something…" />
          </label>
        </form>
      ) : (
        <>
          <div className="note-meta modal-meta">
            {note.isArchived
              ? <span className="badge badge-archived">archived</span>
              : <span className="badge badge-active">active</span>}
            {note.category && <span className="badge badge-category">{note.category.name}</span>}
            {note.tags?.map((t) => <span key={t._id} className="chip">#{t.name}</span>)}
          </div>
          {note.content
            ? <div className="note-content">{note.content}</div>
            : <p className="cell-muted">This note has no content{canEdit ? ' yet. Click Edit to add some.' : '.'}</p>}
        </>
      )}
    </Modal>
  );
}
