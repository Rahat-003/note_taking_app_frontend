import { useState } from 'react';
import { usePaginated } from '../hooks.js';
import Pager, { EmptyRow } from './Pager.jsx';

// Aggregation Scenario 1: GET /api/users/interests (single aggregate call on the backend).
export default function Interests({ onError }) {
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState('');
  const path = filter ? `/users/interests?interest=${encodeURIComponent(filter)}` : '/users/interests';
  const { result, setPage } = usePaginated(path, onError);

  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h2>Users grouped by interest</h2>
          <span className="card-subtitle">Computed with a single aggregation pipeline</span>
        </div>
      </div>
      <form className="form-actions" onSubmit={(e) => { e.preventDefault(); setFilter(input.trim()); }}>
        <input style={{ flex: 1, minWidth: 180 }} placeholder="Filter by interest (optional)" value={input}
          onChange={(e) => setInput(e.target.value)} />
        <button className="btn btn-primary">Filter</button>
        {filter && (
          <button type="button" className="btn btn-ghost" onClick={() => { setInput(''); setFilter(''); }}>Clear</button>
        )}
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Interest</th><th>Users</th><th>Members</th></tr></thead>
          <tbody>
            {result?.data.length === 0 && <EmptyRow colSpan={3}>No matching interests.</EmptyRow>}
            {result?.data.map((g) => (
              <tr key={g.interest}>
                <td className="cell-title">{g.interest}</td>
                <td className="count">{g.count}</td>
                <td>
                  <div className="chips">{g.users.map((u) => <span key={u._id} className="chip">{u.name}</span>)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pager result={result} setPage={setPage} />
    </section>
  );
}
