import { useEffect, useState } from 'react';
import { api, splitList } from '../api.js';
import { usePaginated } from '../hooks.js';
import Dropdown from './Dropdown.jsx';
import { ShieldIcon } from './icons.jsx';
import Pager, { EmptyRow } from './Pager.jsx';

const EMPTY = { id: '', name: '', email: '', password: '', role: '', interests: '' };

export default function Users({ onError, currentUserId, canManage }) {
  const { result, setPage, reload } = usePaginated('/users', onError);
  const [roles, setRoles] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  useEffect(() => {
    if (!canManage) return;
    api('/roles?limit=100').then((res) => setRoles(res.data)).catch((err) => onError(err));
  }, [canManage, onError]);

  async function save(e) {
    e.preventDefault();
    try {
      const body = { interests: splitList(form.interests) };
      if (form.role) body.role_id = form.role;
      if (form.name) body.name = form.name;
      if (form.email) body.email = form.email;
      if (form.password) body.password = form.password;
      if (form.id) await api(`/users/${form.id}`, { method: 'PATCH', body });
      else await api('/users', { method: 'POST', body });
      setForm(EMPTY);
      reload();
    } catch (err) { onError(err); }
  }

  async function setActive(user, isActive) {
    try {
      await api(`/users/${user._id}/status`, { method: 'PATCH', body: { isActive } });
      reload();
    } catch (err) { onError(err); }
  }

  const defaultRoleId = roles.find((r) => r.name === 'user')?._id ?? '';

  const edit = (u) => setForm({
    id: u._id, name: u.name, email: u.email, password: '', role: u.role_id ?? '', interests: (u.interests || []).join(', '),
  });

  return (
    <>
      {canManage && (
        <section className="card">
          <div className="card-header">
            <h2>{form.id ? `Edit ${form.name || 'user'}` : 'Add user'}</h2>
          </div>
          <form className="form" onSubmit={save}>
            <div className="form-grid">
              <input placeholder="Name" required={!form.id} value={form.name} onChange={set('name')} />
              <input type="email" placeholder="Email" required={!form.id} value={form.email} onChange={set('email')} />
              <input type="password" placeholder={form.id ? 'New password (optional)' : 'Password'}
                required={!form.id} minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
              {/* New users default to the "user" role, as the API does when no role_id is sent. */}
              <Dropdown label="Role" prefix="Role" value={form.role || defaultRoleId} onChange={(role) => setForm({ ...form, role })}
                options={roles.map((r) => ({ value: r._id, label: r.name, description: r.description || undefined, icon: <ShieldIcon /> }))} />
            </div>
            <input placeholder="Interests, comma separated" value={form.interests} onChange={set('interests')} />
            <div className="form-actions">
              <button className="btn btn-primary">{form.id ? 'Save changes' : 'Add user'}</button>
              {form.id && <button type="button" className="btn btn-ghost" onClick={() => setForm(EMPTY)}>Cancel</button>}
            </div>
          </form>
        </section>
      )}

      <section className="card">
        <div className="card-header">
          <h2>Users</h2>
          <span className="card-subtitle">Newest first</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Status</th><th>Interests</th><th></th></tr></thead>
            <tbody>
              {result?.data.length === 0 && <EmptyRow colSpan={5}>No users.</EmptyRow>}
              {result?.data.map((u) => (
                <tr key={u._id} className={u.isActive === false ? 'row-muted' : ''}>
                  <td>
                    <div className="cell-title">{u.name} {u._id === currentUserId && <span className="badge">you</span>}</div>
                    <div className="cell-muted">{u.email}</div>
                  </td>
                  <td>
                    <span className={`badge ${u.role?.name === 'admin' ? 'badge-admin' : ''}`}>{u.role?.name ?? 'none'}</span>
                  </td>
                  <td>
                    {u.isActive === false
                      ? <span className="badge badge-inactive"><span className="dot dot-off" />Deactivated</span>
                      : <span className="badge badge-active"><span className="dot dot-on" />Active</span>}
                  </td>
                  <td>
                    <div className="chips">{(u.interests || []).map((i) => <span key={i} className="chip">{i}</span>)}</div>
                  </td>
                  <td>
                    <div className="row-actions">
                      {canManage && u._id !== currentUserId && (
                        <>
                          <button className="btn btn-sm" onClick={() => edit(u)}>Edit</button>
                          {u.isActive === false && (
                            <button className="btn btn-sm btn-success" onClick={() => setActive(u, true)}>Activate</button>
                          )}
                          {u.isActive !== false && (
                            <button className="btn btn-sm btn-warning" title="Signs the user out on their next request and blocks sign-in"
                              onClick={() => setActive(u, false)}>Deactivate</button>
                          )}
                        </>
                      )}
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
