/** Page numbers to show: always the first, last and the pages around the current one, with gaps as '…'. */
function pageItems(page, totalPages) {
  const shown = new Set([1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages));
  // Show a single hidden page instead of an ellipsis standing in for it.
  if (shown.has(3) && !shown.has(2) && totalPages >= 3) shown.add(2);
  if (shown.has(totalPages - 2) && !shown.has(totalPages - 1) && totalPages >= 3) shown.add(totalPages - 1);
  const pages = [...shown].sort((a, b) => a - b);
  const items = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) items.push(`gap-${p}`);
    items.push(p);
  });
  return items;
}

export default function Pager({ result, setPage }) {
  if (!result || result.total === 0) return null;
  const { page, total } = result;
  const totalPages = Math.max(1, result.totalPages);
  return (
    <nav className="pager" aria-label="Pagination">
      <span>Page {page} of {totalPages} · {total} total</span>
      <div className="pager-pages">
        {pageItems(page, totalPages).map((item) => (typeof item === 'number'
          ? (
            <button key={item} type="button" className={`btn btn-sm pager-page ${item === page ? 'btn-primary' : ''}`}
              aria-label={`Page ${item}`} aria-current={item === page ? 'page' : undefined}
              disabled={item === page} onClick={() => setPage(item)}>
              {item}
            </button>
          )
          : <span key={item} className="pager-gap" aria-hidden="true">…</span>))}
      </div>
      <div className="pager-buttons">
        <button type="button" className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
        <button type="button" className="btn btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next →</button>
      </div>
    </nav>
  );
}

export function EmptyRow({ colSpan, children }) {
  return (
    <tr>
      <td className="empty" colSpan={colSpan}>{children}</td>
    </tr>
  );
}
