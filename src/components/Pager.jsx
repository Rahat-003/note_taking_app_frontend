export default function Pager({ result, setPage }) {
  if (!result || result.total === 0) return null;
  const { page, totalPages, total } = result;
  return (
    <div className="pager">
      <span>Page {page} of {Math.max(1, totalPages)} · {total} total</span>
      <div className="pager-buttons">
        <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
        <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
      </div>
    </div>
  );
}

export function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td className="empty" colSpan={colSpan}>{children}</td>
    </tr>
  );
}
