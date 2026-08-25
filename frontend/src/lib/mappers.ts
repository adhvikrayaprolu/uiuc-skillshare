import type { HelpRequest as ApiHelpRequest, ProfileDetail, ProfileListItem } from '../types/api';
import type { Availability, Contact, Credential, HelpRequest, Profile, Review, Skill } from '../data/mockData';

const titleCase = (value: string) => value.replace(/(^|[_\s-])\w/g, (match) => match.toUpperCase()).replace(/_/g, ' ');

export function getInitials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function normalizeYear(value?: string) {
  return value ? titleCase(value) : 'Other';
}

export function normalizeUrgency(value?: string): 'Low' | 'Medium' | 'High' {
  if (value === 'high') return 'High';
  if (value === 'low') return 'Low';
  return 'Medium';
}

export function normalizeStatus(value?: string): HelpRequest['status'] {
  const status = titleCase(value || 'pending') as HelpRequest['status'];
  return status;
}

export function normalizeContactType(value?: string) {
  return value || 'email';
}

export function normalizeCredentialType(value?: string) {
  return value || 'other';
}

function splitInterests(value?: string): string[] {
  if (!value) return [];
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function mapAvailability(items?: ProfileDetail['availability']): Availability[] {
  return (items || []).map((item) => ({
    day: normalizeYear(item.day_of_week),
    timeBlock: normalizeYear(item.time_block),
    notes: item.notes,
  }));
}

function mapContacts(items?: ProfileDetail['contact_methods']): Contact[] {
  return (items || []).map((item) => ({
    id: item.id,
    type: item.type,
    value: item.value,
    preferred: false,
    visibility: item.is_public ? 'public' : 'private',
  }));
}

function mapCredentials(items?: ProfileDetail['credentials']): Credential[] {
  return (items || []).map((item) => ({
    type: item.credential_type,
    title: item.title,
    url: item.url || '#',
    visibility: item.visibility === 'public' ? 'public' : 'private',
  }));
}

function mapReviews(items?: ProfileDetail['reviews_preview']): Review[] {
  return (items || []).map((item) => ({
    id: item.id,
    reviewer: item.reviewer_name || 'Verified student',
    rating: item.rating,
    comment: item.comment,
    date: item.created_at?.slice(0, 10) || '',
  }));
}

function mapProfileSkills(detail?: ProfileDetail): Skill[] {
  if (!detail?.profile_skills?.length) {
    return (detail?.top_skills || []).map((name) => ({ name, category: 'Skill', confidence: 'Intermediate' }));
  }
  return detail.profile_skills.map((item) => ({
    name: item.skill_detail?.name || `Skill ${item.skill}`,
    category: item.skill_detail?.category_detail?.name || 'Skill',
    confidence: titleCase(item.confidence_level) as Skill['confidence'],
    featured: item.is_featured,
    description: item.description,
  }));
}

export function mapBackendProfileListItemToProfileCard(item: ProfileListItem): Profile {
  const matchReasons = item.semantic_reasons?.length ? item.semantic_reasons : (item.match_reasons || []);
  return {
    id: item.id,
    name: item.display_name,
    major: item.major,
    year: normalizeYear(item.year),
    headline: item.headline,
    bio: item.bio || item.headline,
    skills: (item.top_skills || []).map((name) => ({ name, category: 'Skill', confidence: 'Intermediate' })),
    availability: [],
    matchReasons,
    openToConnect: item.open_to_connect,
    location: item.location,
    credentials: item.has_resume ? [{ type: 'resume', title: 'Resume', url: '#', visibility: 'public' }] : [],
    contacts: [],
    interests: [],
    reviews: [],
  };
}

export function mapBackendProfileDetailToProfile(detail: ProfileDetail): Profile {
  return {
    id: detail.id,
    name: detail.display_name,
    major: detail.major,
    year: normalizeYear(detail.year),
    headline: detail.headline,
    bio: detail.bio || detail.headline,
    skills: mapProfileSkills(detail),
    availability: mapAvailability(detail.availability),
    matchReasons: detail.match_reasons || [],
    openToConnect: detail.open_to_connect,
    location: detail.location,
    credentials: mapCredentials(detail.credentials),
    contacts: mapContacts(detail.contact_methods),
    interests: splitInterests(detail.interests),
    reviews: mapReviews(detail.reviews_preview),
  };
}

function profileFromHelpParticipant(
  profileId: number | null | undefined,
  displayName: string,
  detail?: ProfileListItem | null,
): Profile {
  if (detail) {
    return mapBackendProfileListItemToProfileCard(detail);
  }
  return minimalHelpProfile(profileId ?? 0, displayName);
}

function minimalHelpProfile(id: number, name: string): Profile {
  return {
    id,
    name: name || 'Verified student',
    major: 'Illinois student',
    year: '',
    headline: '',
    bio: '',
    skills: [],
    availability: [],
    openToConnect: true,
    credentials: [],
    contacts: [],
    interests: [],
  };
}

export function mapBackendHelpRequestToRequestCard(item: ApiHelpRequest): HelpRequest {
  const seekerName = item.seeker_display_name || item.seeker_email || 'Student';
  const helperName = item.helper_display_name || 'Student';
  const requester = profileFromHelpParticipant(item.seeker_profile_id, seekerName, item.seeker_profile_detail);
  const helper = profileFromHelpParticipant(item.helper_profile, helperName, item.helper_profile_detail);
  return {
    id: item.id,
    requester,
    helper,
    topic: item.topic,
    relatedSkill: item.related_skill_name || (item.related_skill ? `Skill #${item.related_skill}` : 'General'),
    message: item.message,
    urgency: normalizeUrgency(item.urgency),
    status: normalizeStatus(item.status),
    createdAt: item.created_at?.slice(0, 10) || '',
  };
}

export function mapBackendSkillToSkillChip(name?: string) {
  return name || 'General';
}
