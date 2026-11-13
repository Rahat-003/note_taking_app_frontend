import { useState } from 'react';
import { api, fmtDate } from '../api.js';
import { usePaginated } from '../hooks.js';
import ErrorAlert, { FieldError, invalidProps } from './ErrorAlert.jsx';
import Pager from './Pager.jsx';
import UserPicker from './UserPicker.jsx';

const EMPTY = { title: '', body: '' };

/**
 * Posts are visible to everyone. Shows one user's posts, newest first, through Aggregation Scenario 2
 * (GET /api/users/:id/posts, a single $lookup pipeline). You start on your own posts; with users.read you can
 * pick anyone. With posts.create you can write a post.
 */
export default function Posts({ me, canCreate, canPickUser, onError }) {
  const [author, setAuthor] = useState(null); // null = me
  const shown = author ?? me;
  const { result, setPage, reloadFirstPage } = usePaginated(`/users/${shown._id}/posts`, onError);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function publish(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/posts', { method: 'POST', body: form });
      setForm(EMPTY);
      if (author && author._id !== me._id) setAuthor(null); // show the new post among your own
      else reloadFirstPage();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const mine = shown._id === me._id;
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
            <h2>{mine ? 'My posts' : `Posts by ${result?.user?.name ?? shown.name}`}</h2>
            <span className="card-subtitle">Newest first{result ? ` · ${result.total} ${result.total === 1 ? 'post' : 'posts'}` : ''}</span>
          </div>
          {canPickUser && (
            <div className="posts-author">
              <UserPicker value={author} onChange={setAuthor} onError={onError} label="Show posts by" />
              {author && <button type="button" className="btn btn-ghost" onClick={() => setAuthor(null)}>My posts</button>}
            </div>
          )}
        </div>
        {result?.data.length === 0 && (
          <p className="empty">{mine ? (canCreate ? 'No posts yet. Write your first one above.' : 'No posts yet.') : 'This user has no posts yet.'}</p>
        )}
        <div className="post-list">
          {result?.data.map((p) => (
            <article key={p._id} className="post">
              <h3 className="post-title">{p.title}</h3>
              <div className="post-meta">{result.user.name} · {fmtDate(p.createdAt)}</div>
              <p className="post-body">{p.body}</p>
            </article>
          ))}
        </div>
        <Pager result={result} setPage={setPage} />
      </section>
    </>
  );
}
