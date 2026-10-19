const SITE = 'Illini SkillShare';

const titles: [RegExp, string][] = [
  [/^\/$/, `${SITE}: swap skills with Illinois students`],
  [/^\/login$/, 'Sign in'],
  [/^\/guidelines$/, 'Community guidelines'],
  [/^\/privacy$/, 'Privacy'],
  [/^\/terms$/, 'Terms of use'],
  [/^\/welcome\/matches$/, 'Your first matches'],
  [/^\/welcome$/, 'Set up your profile'],
  [/^\/home$/, 'Home'],
  [/^\/discover$/, 'Discover'],
  [/^\/profiles\/\d+$/, 'Profile'],
  [/^\/me\/edit$/, 'Edit profile'],
  [/^\/me$/, 'My profile'],
  [/^\/requests\/\d+$/, 'Request'],
  [/^\/requests$/, 'Requests'],
  [/^\/settings$/, 'Settings'],
  [/^\/analytics$/, 'Analytics'],
];

export function pageTitle(pathname: string) {
  const match = titles.find(([pattern]) => pattern.test(pathname.replace(/\/+$/, '') || '/'));
  if (!match) return `Page not found · ${SITE}`;
  return match[1].startsWith(SITE) ? match[1] : `${match[1]} · ${SITE}`;
}
