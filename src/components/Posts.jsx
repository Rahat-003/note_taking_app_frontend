import { useState } from 'react';
import { api, fmtDate } from '../api.js';
import { usePaginated } from '../hooks.js';
import Pager, { EmptyRow } from './Pager.jsx';

export default function Posts({ onError, canCreate, selectedUser, onSelectUser }) {
  const feed = usePaginated('/posts', onError);
  const [form, setForm] = useState({ title: '', body: '' });

  async function publish(e) {
    e.preventDefault();
    try {
      await api('/posts', { method: 'POST', body: form });
      setForm({ title: '', body: '' });
      feed.reloadFirstPage();
    } catch (err) { onError(err.message); }
  }

  return (
    <>
      {canCreate && <section className="card">
        <div className="card-header">
          <h2>New post</h2>
          <span className="card-subtitle">Posts are visible to everyone</span>
        </div>
        <form className="form" onSubmit={publish}>
          <input placeholder="Title" required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea placeholder="What's on your mind?" required value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <div className="form-actions">
            <button className="btn btn-primary">Publish</button>
          </div>
        </form>
      </section>}

      {selectedUser && <UserPosts userId={selectedUser} onError={onError} onClose={() => onSelectUser(null)} />}

      <section className="card">
        <div className="card-header">
          <h2>All posts</h2>
          <span className="card-subtitle">Click an author to see their posts</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Title</th><th>Body</th><th>Author</th></tr></thead>
            <tbody>
              {feed.result?.data.length === 0 && <EmptyRow colSpan={3}>No posts yet.</EmptyRow>}
              {feed.result?.data.map((p) => (
                <tr key={p._id}>
                  <td className="cell-title">{p.title}</td>
                  <td><div className="clamp">{p.body}</div></td>
                  <td>
                    {p.user
                      ? <button className="btn-link" onClick={() => onSelectUser(p.user_id)}>{p.user.name}</button>
                      : <span className="cell-muted">(deleted)</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager result={feed.result} setPage={feed.setPage} />
      </section>
    </>
  );
}

// Aggregation Scenario 2: GET /api/users/:id/posts ($lookup).
function UserPosts({ userId, onError, onClose }) {
  const { result, setPage } = usePaginated(`/users/${userId}/posts`, onError, 5);
  if (!result) return null;
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>Posts by {result.user.name}</h2>
          <span className="card-subtitle">Loaded with a single $lookup aggregation</span>
        </div>
        <button className="btn btn-sm btn-ghost" onClick={onClose}>Close</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Title</th><th>Body</th><th>Created</th></tr></thead>
          <tbody>
            {result.data.length === 0 && <EmptyRow colSpan={3}>This user hasn't posted yet.</EmptyRow>}
            {result.data.map((p) => (
              <tr key={p._id}>
                <td className="cell-title">{p.title}</td>
                <td><div className="clamp">{p.body}</div></td>
                <td className="cell-muted">{fmtDate(p.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager result={result} setPage={setPage} />
    </section>
  );
}
