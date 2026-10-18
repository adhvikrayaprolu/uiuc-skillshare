import {api} from './api';
import type { ContactMethodType, CredentialType, ProfileDetail, SkillTag, StudentYear } from '../types/api';

export interface ProfileFormState {
  learningGoalIds: number[];
  learningGoalNotes: string;
  shareContacts: boolean;
  embeddingConsent: boolean;
  skillDetails: Record<number, {confidence_level: "beginner" | "intermediate" | "advanced" | "expert"; description: string; is_featured?: boolean}>;
  displayName: string;
  major: string;
  year: StudentYear;
  headline: string;
  bio: string;
  interests: string;
  location: string;
  openToConnect: boolean;
  visibility: 'public' | 'private';
  preferredContactMethod: ContactMethodType;
  availabilityNotes: string;
  selectedSkillIds: number[];
  availability: Array<{ day_of_week: string; time_block: string; notes?: string }>;
  contacts: Array<{ type: ContactMethodType; value: string; is_public: boolean; label?: string }>;
  credentials: Array<{ credential_type: CredentialType; title: string; url: string; visibility: 'public' | 'private' | 'hidden' }>;
}

export function defaultProfileForm(email = ''): ProfileFormState {
  return {
    learningGoalIds: [], learningGoalNotes: '', shareContacts: false, embeddingConsent: false, skillDetails: {},
    displayName: '',
    major: '',
    year: 'other',
    headline: '',
    bio: '',
    interests: '',
    location: '',
    openToConnect: true,
    visibility: 'private',
    preferredContactMethod: 'email',
    availabilityNotes: '',
    selectedSkillIds: [],
    availability: [],
    contacts: [{ type: 'email', value: email, is_public: true, label: 'Illinois Email' }],
    credentials: [],
  };
}

export function formFromProfile(profile: ProfileDetail): ProfileFormState {
  return {
    learningGoalIds: profile.learning_goals || [], learningGoalNotes: profile.learning_goal_notes || "", shareContacts: profile.share_contacts || false, embeddingConsent: profile.embedding_consent || false,
    skillDetails: Object.fromEntries(profile.profile_skills.map(skill => [skill.skill, {confidence_level: skill.confidence_level, description: skill.description || "", is_featured: skill.is_featured}])),
    displayName: profile.display_name,
    major: profile.major,
    year: profile.year as StudentYear,
    headline: profile.headline,
    bio: profile.bio || '',
    interests: profile.interests || '',
    location: profile.location || '',
    openToConnect: profile.open_to_connect,
    visibility: profile.visibility || 'public',
    preferredContactMethod: profile.preferred_contact_method || 'email',
    availabilityNotes: profile.availability_notes || '',
    selectedSkillIds: profile.profile_skills?.map((skill) => skill.skill) || [],
    availability: profile.availability?.map(({ day_of_week, time_block, notes }) => ({ day_of_week, time_block, notes })) || [],
    contacts: profile.contact_methods?.map(({ type, value, is_public, label }) => ({ type, value, is_public, label })) || [],
    credentials: profile.credentials?.map(({ credential_type, title, url, visibility }) => ({
      credential_type,
      title,
      url: url || '',
      visibility,
    })) || [],
  };
}

export function validateProfileForm(form: ProfileFormState) {
  const errors: string[] = [];
  if (!form.displayName.trim()) errors.push('Display name is required.');
  if (!form.major.trim()) errors.push('Major is required.');
  if (!form.year) errors.push('Year is required.');
  if (!form.headline.trim()) errors.push('Headline is required.');
  if (!form.bio.trim()) errors.push('Describe how you can help in your bio.');
  if (!form.availability.length && !form.availabilityNotes.trim()) errors.push('Add availability.');
  if (!form.selectedSkillIds.length) errors.push('Add at least one skill.');
  if (form.shareContacts && !form.contacts.some((contact) => contact.value.trim() && contact.is_public)) errors.push('Add at least one contact method.');
  form.contacts.forEach((contact) => {
    if (contact.value && contact.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.value)) {
      errors.push('Enter a valid email contact.');
    }
  });
  form.credentials.forEach((credential) => {
    if (credential.url && !/^https?:\/\//i.test(credential.url)) {
      errors.push(`${credential.title || 'Credential'} URL must start with http:// or https://.`);
    }
  });
  return errors;
}

export async function saveProfileForm(form: ProfileFormState, rawSkills: SkillTag[] = []) {
  if (rawSkills.length && form.selectedSkillIds.some(id => !rawSkills.some(skill => skill.id === id))) throw new Error("Choose approved skills from the current list.");
  const profilePayload = {
    learning_goals: form.learningGoalIds, learning_goal_notes: form.learningGoalNotes.trim(), share_contacts: form.shareContacts, embedding_consent: form.embeddingConsent,
    display_name: form.displayName.trim(),
    major: form.major.trim(),
    year: form.year,
    headline: form.headline.trim(),
    bio: form.bio.trim(),
    interests: form.interests.trim(),
    location: form.location.trim(),
    open_to_connect: form.openToConnect,
    preferred_contact_method: form.preferredContactMethod,
    availability_notes: form.availabilityNotes.trim(),
    visibility: form.visibility,
  };

  const {data} = await api.put<ProfileDetail>('/profiles/me/aggregate/', {
    profile: profilePayload,
    skills: form.selectedSkillIds.map((skillId,index)=>({
      skill:skillId, confidence_level:form.skillDetails[skillId]?.confidence_level || 'intermediate',
      description:form.skillDetails[skillId]?.description || '',
      is_featured:form.skillDetails[skillId]?.is_featured ?? index<3,
    })),
    availability:form.availability.filter(item=>item.day_of_week && item.time_block),
    contacts:form.contacts.filter(item=>item.value.trim()).map(item=>({...item,value:item.value.trim()})),
    credentials:form.credentials.filter(item=>item.title.trim() && item.url.trim()).map(item=>({...item,title:item.title.trim(),url:item.url.trim()})),
  });
  return data;
}
