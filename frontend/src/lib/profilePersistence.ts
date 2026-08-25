import {
  createAvailability,
  createContactMethod,
  createCredential,
  createCurrentProfile,
  createProfileSkill,
  deleteAvailability,
  deleteContactMethod,
  deleteCredential,
  deleteProfileSkill,
  getAvailability,
  getContactMethods,
  getCredentials,
  getCurrentProfile,
  getProfileSkills,
  updateCurrentProfile,
} from './profilesApi';
import type { ContactMethodType, CredentialType, ProfileDetail, SkillTag, StudentYear } from '../types/api';

export interface ProfileFormState {
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
    displayName: '',
    major: 'Computer Science',
    year: 'junior',
    headline: '',
    bio: '',
    interests: '',
    location: 'Urbana-Champaign, IL',
    openToConnect: true,
    visibility: 'public',
    preferredContactMethod: 'email',
    availabilityNotes: '',
    selectedSkillIds: [],
    availability: [{ day_of_week: 'monday', time_block: 'evening', notes: '' }],
    contacts: [{ type: 'email', value: email, is_public: true, label: 'Illinois Email' }],
    credentials: [],
  };
}

export function formFromProfile(profile: ProfileDetail): ProfileFormState {
  return {
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
  if (!form.selectedSkillIds.length) errors.push('Add at least one skill.');
  if (!form.contacts.some((contact) => contact.value.trim())) errors.push('Add at least one contact method.');
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
  const profilePayload = {
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

  let profile: ProfileDetail;
  let hasProfile = false;
  try {
    await getCurrentProfile();
    hasProfile = true;
  } catch {
    hasProfile = false;
  }

  if (hasProfile) {
    profile = await updateCurrentProfile(profilePayload);
  } else {
    profile = await createCurrentProfile(profilePayload);
  }

  const [skills, availability, contacts, credentials] = await Promise.all([
    getProfileSkills(),
    getAvailability(),
    getContactMethods(),
    getCredentials(),
  ]);

  await Promise.all([
    ...skills.map((skill) => deleteProfileSkill(skill.id)),
    ...availability.map((item) => deleteAvailability(item.id)),
    ...contacts.map((contact) => deleteContactMethod(contact.id)),
    ...credentials.map((credential) => deleteCredential(credential.id)),
  ]);

  await Promise.all([
    ...form.selectedSkillIds.map((skillId, index) => {
      const skill = rawSkills.find((item) => item.id === skillId);
      return createProfileSkill({
        skill: skillId,
        confidence_level: index === 0 ? 'advanced' : 'intermediate',
        description: skill ? `Happy to help with ${skill.name}.` : '',
        is_featured: index < 3,
      });
    }),
    ...form.availability
      .filter((item) => item.day_of_week && item.time_block)
      .map((item) => createAvailability(item)),
    ...form.contacts
      .filter((contact) => contact.value.trim())
      .map((contact) => createContactMethod({ ...contact, value: contact.value.trim() })),
    ...form.credentials
      .filter((credential) => credential.title.trim() && credential.url.trim())
      .map((credential) => createCredential({ ...credential, title: credential.title.trim(), url: credential.url.trim() })),
  ]);

  return profile;
}
