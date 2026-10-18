import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PageControlsProps {
  label: string;
  pageText: string;
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

const buttonClass =
  'inline-flex items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#0F172A] transition-colors hover:border-[#13294B] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[#E2E8F0]';

export function PageControls({ label, pageText, canPrevious, canNext, onPrevious, onNext }: PageControlsProps) {
  return (
    <nav aria-label={label} className="mt-6 flex items-center justify-between gap-4">
      <button type="button" className={buttonClass} disabled={!canPrevious} onClick={onPrevious}>
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        Previous page
      </button>
      <span className="text-sm text-[#475569]">{pageText}</span>
      <button type="button" className={buttonClass} disabled={!canNext} onClick={onNext}>
        Next page
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
}

export function ListPagination({ page, totalPages, setPage }: { page: number; totalPages: number; setPage: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <PageControls
      label="List pages"
      pageText={`Page ${page} of ${totalPages}`}
      canPrevious={page > 1}
      canNext={page < totalPages}
      onPrevious={() => setPage(page - 1)}
      onNext={() => setPage(page + 1)}
    />
  );
}
