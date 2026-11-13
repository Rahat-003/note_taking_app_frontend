import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import ErrorAlert, { FieldError, invalidProps } from './ErrorAlert.jsx';
import { CheckIcon, LockIcon, ShieldIcon } from './icons.jsx';

// Permission keys are "<area>.<action>"; the editor groups them by area.
const AREAS = { notes: 'Notes', posts: 'Posts', users: 'Users', roles: 'Roles' };
const areaOf = (key) => key.split('.')[0];

const NEW = 'new';

/**
 * Admin roles screen: every role on the left; clicking one shows all permissions with a switch each.
 * A switch is "on" when the role grants the permission and the grant is active. For a permission the role
 * already has, the switch pauses / resumes that grant (role_permissions.isActive); for one it lacks,
 * switching it on adds the grant. You can only change permissions you hold yourself (the API enforces it too).
 */
export default function Roles({ onError, myPermissions, onChanged }) {
  const [roles, setRoles] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  async function loadRoles() {
    try {
      const res = await api('/roles?limit=100');
      setRoles(res.data);
      return res.data;
    } catch (err) {
      onError(err);
      return [];
    }
  }

  useEffect(() => {
    api('/permissions?limit=100').then((res) => setCatalog(res.data)).catch(onError);
    loadRoles().then((list) => setSelectedId((id) => id ?? list[0]?._id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = selectedId === NEW ? null : roles?.find((r) => r._id === selectedId) ?? null;

  async function afterSave(roleId) {
    await loadRoles();
    if (roleId) setSelectedId(roleId);
    onChanged();
  }

  async function afterDelete() {
    const list = await loadRoles();
    setSelectedId(list[0]?._id ?? null);
  }

  return (
    <div className="roles-layout">
      <section className="card roles-list-card">
        <div className="card-header">
          <h2 className="with-icon"><ShieldIcon />Roles</h2>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setSelectedId(NEW)}>+ New role</button>
        </div>
        <ul className="roles-list" aria-label="Roles">
          {roles === null && <li className="cell-muted">Loading…</li>}
          {roles?.length === 0 && <li className="cell-muted">No roles yet.</li>}
          {roles?.map((r) => {
            const on = r.grants.filter((g) => g.isActive).length;
            return (
              <li key={r._id}>
                <button type="button" className={`role-item ${selectedId === r._id ? 'selected' : ''}`}
                  aria-current={selectedId === r._id ? 'true' : undefined} onClick={() => setSelectedId(r._id)}>
                  <span className="role-item-head">
                    <span className="role-item-name">{r.name}</span>
                    {r.system && <span className="badge">system</span>}
                  </span>
                  {r.description && <span className="role-item-desc">{r.description}</span>}
                  <span className="role-item-meter" aria-label={`${on} of ${catalog.length} permissions on`}>
                    <span className="meter"><span style={{ width: catalog.length ? `${(on / catalog.length) * 100}%` : 0 }} /></span>
                    <span className="cell-muted">{on}/{catalog.length || '–'}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {selectedId === NEW && (
        <RoleEditor key="new" role={null} catalog={catalog} myPermissions={myPermissions}
          onSaved={afterSave} onDeleted={afterDelete} onCancel={() => setSelectedId(roles?.[0]?._id ?? null)} />
      )}
      {selected && (
        <RoleEditor key={selected._id + JSON.stringify(selected.grants)} role={selected} catalog={catalog}
          myPermissions={myPermissions} onSaved={afterSave} onDeleted={afterDelete} />
      )}
      {!selected && selectedId !== NEW && (
        <section className="card roles-empty"><p className="cell-muted">Select a role to see its permissions.</p></section>
      )}
    </div>
  );
}

function RoleEditor({ role, catalog, myPermissions, onSaved, onDeleted, onCancel }) {
  const creating = !role;
  const isAdminRole = role?.system && role.name === 'admin';
  const grantsByKey = useMemo(() => new Map((role?.grants ?? []).map((g) => [g.key, g])), [role]);
  const initialOn = useMemo(() => new Set((role?.grants ?? []).filter((g) => g.isActive).map((g) => g.key)), [role]);

  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [on, setOn] = useState(initialOn);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const changedKeys = catalog.map((p) => p.key).filter((k) => on.has(k) !== initialOn.has(k));
  const dirty = creating || changedKeys.length > 0 || name !== (role?.name ?? '') || description !== (role?.description ?? '');

  const groups = useMemo(() => {
    const byArea = new Map();
    for (const p of catalog) {
      const area = areaOf(p.key);
      if (!byArea.has(area)) byArea.set(area, []);
      byArea.get(area).push(p);
    }
    return [...byArea.entries()];
  }, [catalog]);

  function toggle(key) {
    setSaved(false);
    setOn((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function reset() {
    setName(role?.name ?? '');
    setDescription(role?.description ?? '');
    setOn(initialOn);
    setError(null);
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (creating) {
        const created = await api('/roles', { method: 'POST', body: { name, description, permissions: [...on] } });
        await onSaved(created._id);
        return;
      }
      // 1) Name / description and any newly granted permissions (existing grants keep their on/off state).
      const added = [...on].filter((k) => !grantsByKey.has(k));
      const body = {};
      if (!role.system && name !== role.name) body.name = name;
      if (description !== (role.description ?? '')) body.description = description;
      if (added.length) body.permissions = [...grantsByKey.keys(), ...added];
      if (Object.keys(body).length) await api(`/roles/${role._id}`, { method: 'PATCH', body });
      // 2) Existing grants switched on or off.
      for (const key of changedKeys) {
        const grant = grantsByKey.get(key);
        if (grant) {
          await api(`/roles/${role._id}/permissions/${grant.permission_id}`, { method: 'PATCH', body: { isActive: on.has(key) } });
        }
      }
      setSaved(true);
      await onSaved(role._id);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api(`/roles/${role._id}`, { method: 'DELETE' });
      await onDeleted();
    } catch (err) {
      setError(err);
      setBusy(false);
      setConfirmDelete(false);
    }
  }

  return (
    <section className="card role-editor">
      <form className="form" onSubmit={save}>
        <div className="card-header">
          <div>
            <h2>{creating ? 'New role' : role.name}</h2>
            <span className="card-subtitle">
              {creating ? 'Name the role and switch on what it may do.' : `${on.size} of ${catalog.length} permissions on`}
            </span>
          </div>
          {role?.system && <span className="badge with-icon"><LockIcon />system role</span>}
        </div>

        <ErrorAlert error={error} onDismiss={() => setError(null)} />
        {saved && !dirty && <div className="success-callout" role="status"><CheckIcon />Saved. Users with this role get the change on their next request.</div>}

        <div className="form-grid">
          <label className="field">
            Name
            <input required placeholder="e.g. moderator" disabled={role?.system} value={name}
              onChange={(e) => { setSaved(false); setName(e.target.value); }} {...invalidProps(error, 'name', 'role-name-error')} />
            <FieldError error={error} field="name" id="role-name-error" />
          </label>
          <label className="field">
            Description
            <input placeholder="What this role is for (optional)" disabled={isAdminRole} value={description}
              onChange={(e) => { setSaved(false); setDescription(e.target.value); }} {...invalidProps(error, 'description', 'role-desc-error')} />
            <FieldError error={error} field="description" id="role-desc-error" />
          </label>
        </div>

        {isAdminRole && <p className="role-note">The admin role always has every permission. It can’t be changed.</p>}

        <div className="perm-groups">
          {groups.map(([area, perms]) => (
            <fieldset key={area} className="perm-group">
              <legend>{AREAS[area] ?? area}</legend>
              {perms.map((p) => {
                const notHeld = !myPermissions.includes(p.key);
                const locked = isAdminRole || notHeld;
                const isOn = isAdminRole || on.has(p.key);
                const changed = !isAdminRole && on.has(p.key) !== initialOn.has(p.key);
                return (
                  <label key={p.key} className={`perm-row ${locked ? 'locked' : ''} ${changed ? 'changed' : ''}`}
                    title={notHeld && !isAdminRole ? 'You can only grant permissions you hold yourself' : undefined}>
                    <span className="perm-text">
                      <span className="perm-desc">{p.description}</span>
                      <code className="perm-key">{p.key}</code>
                    </span>
                    {changed && <span className="perm-changed">{isOn ? 'will turn on' : 'will turn off'}</span>}
                    <span className="switch">
                      <input type="checkbox" role="switch" checked={isOn} disabled={locked} onChange={() => toggle(p.key)}
                        aria-label={`${p.description} (${p.key})`} />
                      <span className="switch-track" aria-hidden="true"><span className="switch-thumb" /></span>
                    </span>
                  </label>
                );
              })}
            </fieldset>
          ))}
        </div>

        {!isAdminRole && (
          <div className="form-actions role-actions">
            <button className="btn btn-primary" disabled={busy || !dirty || (creating && !name.trim())}>
              {busy ? 'Saving…' : creating ? 'Create role' : 'Save changes'}
            </button>
            {!creating && dirty && <button type="button" className="btn btn-ghost" onClick={reset}>Discard changes</button>}
            {creating && <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>}
            {!creating && dirty && <span className="unsaved-pill">Unsaved changes</span>}
            <span className="modal-spacer" />
            {!creating && !role.system && !confirmDelete && (
              <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>Delete role</button>
            )}
            {confirmDelete && (
              <>
                <button type="button" className="btn btn-danger-solid" autoFocus disabled={busy} onClick={remove}>Confirm delete</button>
                <button type="button" className="btn" onClick={() => setConfirmDelete(false)}>Cancel</button>
              </>
            )}
          </div>
        )}
      </form>
    </section>
  );
}
