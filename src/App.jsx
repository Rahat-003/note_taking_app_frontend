import { useCallback, useEffect, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js';
import LoginPage from './components/LoginPage.jsx';
import RegisterPage from './components/RegisterPage.jsx';
import { MyNotes, AllNotes, ArchivedNotes } from './components/Notes.jsx';
import Posts from './components/Posts.jsx';
import Profile from './components/Profile.jsx';
import Users from './components/Users.jsx';
import Interests from './components/Interests.jsx';
import Roles from './components/Roles.jsx';
import ErrorAlert from './components/ErrorAlert.jsx';
import { navigate, usePath } from './router.jsx';

const AUTH_PAGES = ['/login', '/register'];

// A tab is shown when the user holds any of its permissions (empty list = everyone).
const TABS = [
  { id: 'notes', label: 'My notes', perms: ['notes.manage_own'] },
  { id: 'archive', label: 'Archive', perms: ['notes.manage_own'] },
  { id: 'posts', label: 'Posts', perms: [] },
  { id: 'profile', label: 'Profile', perms: [] },
  { id: 'all-notes', label: 'All notes', perms: ['notes.read_all'] },
  { id: 'users', label: 'Users', perms: ['users.read', 'users.manage'] },
  { id: 'interests', label: 'Interests', perms: ['users.read'] },
  { id: 'roles', label: 'Roles', perms: ['roles.manage'] },
];

export default function App() {
  const [session, setSession] = useState(null); // { user, permissions }
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [tab, setTab] = useState(null);
  const [error, setError] = useState(null); // ApiError | string, shown as a floating callout
  const [signedOutBecause, setSignedOutBecause] = useState(null); // why the session ended, shown on the sign-in page
  const path = usePath();

  // reason: the ApiError that ended the session (expired token, deactivated account); none for "Log out".
  const logout = useCallback((reason) => {
    setSignedOutBecause(reason instanceof Error ? reason : null);
    setError(null);
    setToken(null);
    setSession(null);
    setTab(null);
    navigate('/login');
  }, []);

  const refreshSession = useCallback(
    () => api('/auth/me').then(setSession).catch(() => logout()),
    [logout],
  );

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (getToken()) refreshSession().finally(() => setLoading(false));
  }, [logout, refreshSession]);

  // Signed out: only /login and /register exist. Signed in: those pages redirect to the app.
  useEffect(() => {
    if (loading) return;
    if (!session && !AUTH_PAGES.includes(path)) navigate('/login', { replace: true });
    if (session && AUTH_PAGES.includes(path)) navigate('/', { replace: true });
  }, [loading, session, path]);

  const onError = useCallback((err) => setError(err), []);


  function onAuth({ token, user, permissions }) {
    setToken(token);
    setSession({ user, permissions });
    setError(null);
    setSignedOutBecause(null);
  }

  function selectTab(id) {
    setError(null);
    setTab(id);
  }

  if (loading) return <div className="loading">Loading…</div>;
  if (!session) return path === '/register' ? <RegisterPage onAuth={onAuth} /> : <LoginPage onAuth={onAuth} notice={signedOutBecause} />;

  const { user, permissions } = session;
  const can = (p) => permissions.includes(p);
  const tabs = TABS.filter((t) => !t.perms.length || t.perms.some(can));
  const current = tabs.some((t) => t.id === tab) ? tab : tabs[0].id;
  const roleName = user.role?.name ?? 'no role';

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <span className="brand"><span className="brand-mark">NT</span>Note Taking App</span>
          <div className="user">
            <strong>{user.name}</strong>
            <span className={`badge ${roleName === 'admin' ? 'badge-admin' : ''}`}>{roleName}</span>
            <button className="btn btn-sm" onClick={logout}>Log out</button>
          </div>
        </div>
        <nav className="tabs">
          {tabs.map((t) => (
            <button key={t.id} className="tab" aria-pressed={current === t.id} onClick={() => selectTab(t.id)}>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="container">
        {error && // Floats over the page, so it is seen wherever the action was; dismisses itself (paused on hover).
          <ErrorAlert className="app-error" error={error} onDismiss={() => setError(null)} autoDismissMs={error.fields?.length ? 15000 : 8000} />}

        {current === 'notes' && <MyNotes onError={onError} />}
        {current === 'archive' && <ArchivedNotes onError={onError} />}
        {current === 'posts' && (
          <Posts me={user} canCreate={can('posts.create')} canPickUser={can('users.read')} onError={onError} />
        )}
        {current === 'profile' && (
          <Profile user={user} onUpdated={(u) => setSession({ ...session, user: u })} onError={onError} />
        )}
        {current === 'all-notes' && <AllNotes onError={onError} currentUserId={user._id} />}
        {current === 'users' && (
          <Users onError={onError} currentUserId={user._id} canManage={can('users.manage')} />
        )}
        {current === 'interests' && <Interests onError={onError} />}
        {current === 'roles' && <Roles onError={onError} myPermissions={permissions} onChanged={refreshSession} />}
      </main>
    </>
  );
}
