import { useState } from 'react';
export function useListPage<T>(rows: T[], key = '') {
  const [selection, setSelection] = useState({ key, page: 1 });
  const totalPages = Math.max(1, Math.ceil(rows.length / 20));
  const page = selection.key === key ? Math.min(selection.page, totalPages) : 1;
  const setPage = (next: number) => setSelection({ key, page: Math.max(1, Math.min(next, totalPages)) });
  return { items: rows.slice((page - 1) * 20, page * 20), page, totalPages, setPage };
}
