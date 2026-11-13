import { useState } from 'react';
import { api, fmtDate } from '../api.js';
import { usePaginated } from '../hooks.js';
import ErrorAlert, { FieldError, invalidProps } from './ErrorAlert.jsx';
import Pager from './Pager.jsx';
import UserPicker from './UserPicker.jsx';

const EMPTY = { title: '', body: '' };

/**
 * Posts are visible to everyone signed in. The tab opens on the feed of everyone's posts (GET /api/posts,
 * newest first). Clicking an author, or "My posts", shows one user's posts through Aggregation Scenario 2
 * (GET /api/users/:id/posts, a single $lookup pipeline). With users.read you can also pick any user by email.
 * With posts.create you can write a post; your own posts can be edited (posts.update_own) and deleted
 * (posts.delete_own); posts.delete_any (admins) can delete anyone's post. An admin switches each permission on or off per role on the Roles screen.
 */
export default function Posts({ me, canCreate, canUpdate, canDelete, canDeleteAny, canPickUser, onError }) {
  const [author, setAuthor] = useState(null); // null = everyone's posts; otherwise { _id, name }
  const { result, setPage, reload, reloadFirstPage } = usePaginated(author ? `/users/${author._id}/posts` : '/posts', onError);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const showAuthor = (user) => user && setAuthor({ _id: user._id, name: user.name });

  async function publish(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/posts', { method: 'POST', body: form });
      setForm(EMPTY);
      reloadFirstPage();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const mine = author?._id === me._id;
  const heading = !author ? 'All posts' : mine ? 'My posts' : `Posts by ${result?.user?.name ?? author.name}`;
  return (
    <>
      {canCreate && (
        <section className="card">
          <div className="card-header">
            <h2>New post</h2>
            <span className="card-subtitle">Posts are visible to everyone</span>
          </div>
          <form className="form" onSubmit={publish} noValidate>
            <ErrorAlert error={error} onDismiss={() => setError(null)} />
            <input placeholder="Title" aria-label="Title" maxLength={200} value={form.title} onChange={set('title')}
              {...invalidProps(error, 'title', 'post-title-error')} />
            <FieldError error={error} field="title" id="post-title-error" />
            <textarea placeholder="What do you want to share?" aria-label="Body" value={form.body} onChange={set('body')}
              {...invalidProps(error, 'body', 'post-body-error')} />
            <FieldError error={error} field="body" id="post-body-error" />
            <div className="form-actions">
              <button className="btn btn-primary" disabled={busy}>{busy ? 'Publishing…' : 'Publish'}</button>
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="card-header">
          <div>
            <h2>{heading}</h2>
            <span className="card-subtitle">Newest first{result ? ` · ${result.total} ${result.total === 1 ? 'post' : 'posts'}` : ''}</span>
          </div>
          <div className="posts-author">
            <div className="segmented" role="group" aria-label="Whose posts">
              <button type="button" className="btn btn-sm" aria-pressed={!author} onClick={() => setAuthor(null)}>All posts</button>
              <button type="button" className="btn btn-sm" aria-pressed={mine} onClick={() => showAuthor(me)}>My posts</button>
            </div>
            {canPickUser && (
              <UserPicker value={author && !mine ? author : null} onChange={(u) => (u ? showAuthor(u) : setAuthor(null))}
                onError={onError} label="Show posts by" />
            )}
          </div>
        </div>
        {result?.data.length === 0 && (
          <p className="empty">
            {!author ? 'No posts yet.' : mine ? (canCreate ? 'No posts yet. Write your first one above.' : 'No posts yet.') : 'This user has no posts yet.'}
          </p>
        )}
        <div className="post-list">
          {result?.data.map((p) => {
            // The feed carries each post's author; Scenario 2 returns the user once, beside the posts.
            const by = author ? result.user : p.user;
            const own = by?._id === me._id;
            // Your own posts: edit and delete with posts.update_own / posts.delete_own. Anyone's: delete with posts.delete_any.
            const mayUpdate = own && canUpdate;
            const mayDelete = canDeleteAny || (own && canDelete);
            return (
              <article key={p._id} className="post">
                {(mayUpdate || mayDelete) && (
                  <PostActions post={p} canUpdate={mayUpdate} canDelete={mayDelete} onChanged={reload} onError={onError} />
                )}
                <h3 className="post-title">{p.title}</h3>
                <div className="post-meta">
                  {by
                    ? author
                      ? <span>{by.name}</span>
                      : <button type="button" className="post-author" title={`Show ${by.name}'s posts`} onClick={() => showAuthor(by)}>{by.name}</button>
                    : <span>(deleted user)</span>}
                  {' · '}{fmtDate(p.createdAt)}
                </div>
                <p className="post-body">{p.body}</p>
              </article>
            );
          })}
        </div>
        <Pager result={result} setPage={setPage} />
      </section>
    </>
  );
}

/** Edit (inline form) and Delete (asks once) for one of your own posts. */
function PostActions({ post, canUpdate, canDelete, onChanged, onError }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ title: post.title, body: post.body });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/posts/${post._id}`, { method: 'PATCH', body: form });
      setEditing(false);
      onChanged();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/posts/${post._id}`, { method: 'DELETE' });
      onChanged();
    } catch (err) {
      onError(err);
      setBusy(false);
      setConfirming(false);
    }
  }

  if (editing) {
    return (
      <form className="form post-edit" onSubmit={save} noValidate>
        <ErrorAlert error={error} onDismiss={() => setError(null)} />
        <input aria-label="Title" maxLength={200} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
          {...invalidProps(error, 'title', `post-${post._id}-title-error`)} />
        <FieldError error={error} field="title" id={`post-${post._id}-title-error`} />
        <textarea aria-label="Body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
          {...invalidProps(error, 'body', `post-${post._id}-body-error`)} />
        <FieldError error={error} field="body" id={`post-${post._id}-body-error`} />
        <div className="form-actions">
          <button className="btn btn-primary btn-sm" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setEditing(false); setError(null); setForm({ title: post.title, body: post.body }); }}>Cancel</button>
        </div>
      </form>
    );
  }
  return (
    <div className="post-actions">
      {canUpdate && <button type="button" className="btn btn-sm" onClick={() => setEditing(true)}>Edit</button>}
      {canDelete && !confirming && <button type="button" className="btn btn-sm btn-danger" onClick={() => setConfirming(true)}>Delete</button>}
      {confirming && (
        <>
          <button type="button" className="btn btn-sm btn-danger-solid" autoFocus disabled={busy} onClick={remove}>Confirm delete</button>
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
        </>
      )}
    </div>
  );
}
