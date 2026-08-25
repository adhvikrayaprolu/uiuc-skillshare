import type { Profile } from '../data/mockData';

/** Non-percentage labels for cards (replaces meaningless match scores in the UI). */
export function profileInsightLabels(profile: Profile): string[] {
  const labels: string[] = [];

  // Keep chips small and meaningful (no generic filler).
  if (profile.openToConnect) labels.push('Open to Connect');
  if (profile.credentials?.some((c) => c.type === 'resume' && c.visibility === 'public')) labels.push('Has Resume');

  const evening = profile.availability?.some((a) => String(a.timeBlock).toLowerCase().includes('evening'));
  if (evening) labels.push('Available Evenings');

  return [...new Set(labels)].slice(0, 2);
}
