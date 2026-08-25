export function InsightChips({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-xs font-medium text-[#0F172A]"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
