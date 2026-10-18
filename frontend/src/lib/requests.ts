import type { ContactMethod, HelpRequest, RequestBucket } from '../types/api';

export function contactHref(type: string, value: string) {
  if (type === 'email') return `mailto:${value}`;
  if (type === 'phone') return `tel:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function requestErrorMessage(error: unknown, fallback: string) {
  const response = (error as { response?: { status?: number; data?: unknown } }).response;
  if (response?.status === 409) return 'This request changed while you were looking at it. The latest version is now shown.';
  const data = response?.data as Record<string, unknown> | string[] | undefined;
  const first = (value: unknown): string | undefined => (typeof value === 'string' ? value : Array.isArray(value) ? first(value[0]) : undefined);
  if (Array.isArray(data)) return first(data) ?? fallback;
  return first(data?.detail) ?? first(data?.non_field_errors) ?? (data ? Object.values(data).map(first).find(Boolean) : undefined) ?? fallback;
}

export function formatDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export interface RequestView {
  sent: boolean;
  isSwap: boolean;
  peerName: string;
  peerFirstName: string;
  peerProfileId: number | null;
  youLearn: string | null;
  youTeach: string | null;
  contacts: ContactMethod[];
}

export function requestView(row: HelpRequest): RequestView {
  const sent = row.my_role !== 'helper';
  const isSwap = row.kind === 'swap';
  const peerName = (sent ? row.helper_display_name : row.seeker_display_name) || 'Member';
  return {
    sent,
    isSwap,
    peerName,
    peerFirstName: peerName.split(' ')[0],
    peerProfileId: sent ? (row.helper_profile_detail ? row.helper_profile : null) : row.seeker_profile_id ?? null,
    youLearn: sent ? row.related_skill_name ?? null : isSwap ? row.offered_skill_name ?? null : null,
    youTeach: sent ? (isSwap ? row.offered_skill_name ?? null : null) : row.related_skill_name ?? null,
    contacts: (sent ? row.helper_contact_methods : row.seeker_contact_methods) ?? [],
  };
}

export function nextStep(row: HelpRequest, bucket?: RequestBucket) {
  const view = requestView(row);
  switch (row.status) {
    case 'pending':
      return view.sent ? `Waiting for ${view.peerFirstName} to reply` : `Reply to ${view.peerFirstName}`;
    case 'accepted':
      return 'Meet up, then mark it complete';
    case 'completed':
      if (bucket === 'needs_action' || row.feedback?.can_review) return `Leave feedback for ${view.peerFirstName}`;
      return 'Completed';
    case 'declined':
      return 'Declined';
    default:
      return 'Cancelled';
  }
}

export const statusLabels: Record<HelpRequest['status'], string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  completed: 'Completed',
  cancelled: 'Cancelled',
};
