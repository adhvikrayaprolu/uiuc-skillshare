export function formatRate(value: number | null) {
  return value === null ? '—' : `${Math.round(value * 100)}%`;
}

export function formatHours(value: number | null) {
  if (value === null) return '—';
  if (value < 1) return `${Math.max(1, Math.round(value * 60))} min`;
  if (value < 48) return `${value.toFixed(1)} h`;
  return `${Math.round(value / 24)} days`;
}
