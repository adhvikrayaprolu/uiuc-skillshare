export function ListPagination({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return <nav aria-label="List pages" className="mt-5 flex items-center gap-4">
    <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous page</button>
    <span>Page {page} of {totalPages}</span>
    <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next page</button>
  </nav>;
}
