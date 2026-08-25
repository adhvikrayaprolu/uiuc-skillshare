/** Map dashboard `next_actions` copy to useful routes (and edit-profile tabs). */
export function linkForDashboardAction(text: string): string {
  const t = text.toLowerCase();
  if (t.includes('create your profile')) return '/onboarding';
  if (t.includes('github')) return '/profile/edit?tab=contact';
  if (t.includes('complete')) return '/profile/edit';
  if (t.includes('skill')) return '/profile/edit?tab=skills';
  if (t.includes('availability')) return '/profile/edit?tab=availability';
  if (t.includes('credential') || t.includes('linkedin')) return '/profile/edit?tab=credentials';
  if (t.includes('contact')) return '/profile/edit?tab=contact';
  if (t.includes('search') || t.includes('collaborat')) return '/discover';
  if (t.includes('help request') || t.includes('request')) return '/requests';
  return '/profile/edit';
}
