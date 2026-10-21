export function inviteUrl(origin = typeof window === 'undefined' ? '' : window.location.origin) {
  return `${origin}/`;
}

export function inviteMessage(url: string) {
  return `I'm swapping skills with other Illinois students on Illini SkillShare. Teach what you know, learn what you want: ${url}`;
}
