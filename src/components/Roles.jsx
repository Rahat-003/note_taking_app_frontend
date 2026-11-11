import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { usePaginated } from '../hooks.js';
import Pager, { EmptyRow } from './Pager.jsx';

const EMPTY = { id: '', name: '', description: '', permissions: [], system: false };

export default function Roles({ onError, myPermissions, onChanged }) {
  const { result, setPage, reload } = usePaginated('/roles', onError, 20);
  const [catalog, setCatalog] = useState([]);
  const [form, setForm] = useState(EMPTY);

  useEffect(() => {
    api('/permissions?limit=100').then((res) => setCatalog(res.data)).catch((err) => onError(err.message));
  }, [onError]);

  const isAdminRole = form.system && form.name === 'admin';

  function toggle(key) {
    const has = form.permissions.includes(key);
    setForm({ ...form, permissions: has ? form.permissions.filter((p) => p !== key) : [...form.permissions, key] });
  }

  async function save(e) {
    e.preventDefault();
    try {
      const body = { description: form.description, permissions: form.permissions };
      if (!form.system) body.name = form.name;
      if (form.id) await api(`/roles/${form.id}`, { method: 'PATCH', body });
      else await api('/roles', { method: 'POST', body });
      setForm(EMPTY);
      reload();
      onChanged();
    } catch (err) { onError(err.message); }
  }

  async function remove(id) {
    try {
      await api(`/roles/${id}`, { method: 'DELETE' });
      if (form.id === id) setForm(EMPTY);
      reload();
    } catch (err) { onError(err.message); }
  }

  // Inactive grants stay checked: unchecking removes the grant, the chip toggle only pauses it.
  const edit = (r) => setForm({
    id: r._id, name: r.name, description: r.description || '', permissions: r.grants.map((g) => g.key), system: r.system,
  });

  async function setActive(role, grant) {
    try {
      await api(`/roles/${role._id}/permissions/${grant.permission_id}`, { method: 'PATCH', body: { isActive: !grant.isActive } });
      reload();
      onChanged();
    } catch (err) { onError(err.message); }
  }

  return (
    <>
      <section className="card">
        <div className="card-header">
          <div>
            <h2>{form.id ? `Edit role “${form.name}”` : 'New role'}</h2>
            <span className="card-subtitle">Pick the permissions this role grants. Users get them through their role.</span>
          </div>
        </div>
        <form className="form" onSubmit={save}>
          <div className="form-grid">
            <input placeholder="Role name (e.g. moderator)" required disabled={form.system} value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input placeholder="Description (optional)" disabled={isAdminRole} value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="perm-grid">
            {catalog.map((p) => {
              const notHeld = !myPermissions.includes(p.key);
              return (
                <label key={p.key} className={`perm ${notHeld || isAdminRole ? 'perm-disabled' : ''}`}>
                  <input type="checkbox" checked={form.permissions.includes(p.key)}
                    disabled={notHeld || isAdminRole} onChange={() => toggle(p.key)} />
                  <span>
                    <code>{p.key}</code>
                    <span className="cell-muted">{p.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {isAdminRole && <span className="card-subtitle">The admin role always has every permission.</span>}
          <div className="form-actions">
            <button className="btn btn-primary" disabled={isAdminRole}>{form.id ? 'Save changes' : 'Create role'}</button>
            {form.id && <button type="button" className="btn btn-ghost" onClick={() => setForm(EMPTY)}>Cancel</button>}
          </div>
        </form>
      </section>

      <section className="card">
        <div className="card-header">
          <h2>Roles</h2>
          <span className="card-subtitle">Click a permission to turn it on or off for the role</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Role</th><th>Permissions</th><th></th></tr></thead>
            <tbody>
              {result?.data.length === 0 && <EmptyRow colSpan={3}>No roles.</EmptyRow>}
              {result?.data.map((r) => (
                <tr key={r._id}>
                  <td>
                    <div className="cell-title">{r.name} {r.system && <span className="badge">system</span>}</div>
                    <div className="cell-muted">{r.description}</div>
                  </td>
                  <td>
                    <div className="chips">
                      {r.grants.length === 0 && <span className="cell-muted">none</span>}
                      {r.grants.map((g) => (
                        <button key={g.key} type="button" className={`chip chip-toggle ${g.isActive ? '' : 'chip-off'}`}
                          disabled={r.name === 'admin' || !myPermissions.includes(g.key)}
                          aria-pressed={g.isActive}
                          title={g.isActive ? 'Active: click to turn off' : 'Inactive: click to turn on'}
                          onClick={() => setActive(r, g)}>
                          {g.key}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm" onClick={() => edit(r)}>{r.name === 'admin' ? 'View' : 'Edit'}</button>
                      {!r.system && <button className="btn btn-sm btn-danger" onClick={() => remove(r._id)}>Delete</button>}
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
