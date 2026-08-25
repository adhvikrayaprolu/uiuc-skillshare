import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save, Trash2 } from 'lucide-react';
import { shouldUseMocks } from '../lib/api';
import { defaultProfileForm, formFromProfile, type ProfileFormState } from '../lib/profilePersistence';
import { useAuth } from '../hooks/useAuth';
import { useCurrentProfile } from '../hooks/useProfileEditor';
import { useTaxonomy } from '../hooks/useTaxonomy';
import { useToast } from '../components/ui/ToastProvider';
import {
  createAvailability,
  createContactMethod,
  createCredential,
  createProfileSkill,
  deleteAvailability,
  deleteContactMethod,
  deleteCredential,
  deleteProfileSkill,
  getAvailability,
  getContactMethods,
  getCredentials,
  getProfileSkills,
  updateCurrentProfile,
} from '../lib/profilesApi';
import type { ContactMethodType, CredentialType, ProfileSkill, StudentYear } from '../types/api';

const tabs = ['Basic Info', 'Skills', 'Availability', 'Contact', 'Credentials', 'Privacy'];
const tabParamMap: Record<string, number> = {
  basic: 0,
  skills: 1,
  availability: 2,
  contact: 3,
  credentials: 4,
  privacy: 5,
};
const years: StudentYear[] = ['freshman', 'sophomore', 'junior', 'senior', 'graduate', 'alumni', 'other'];
const contactTypes: ContactMethodType[] = ['email', 'phone', 'instagram', 'linkedin', 'github', 'portfolio', 'website', 'other'];
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'flexible'];
const times = ['morning', 'afternoon', 'evening', 'night', 'flexible'];
const confidenceLevels: Array<ProfileSkill['confidence_level']> = ['beginner', 'intermediate', 'advanced', 'expert'];
const titleCase = (value: string) => value.replace(/(^|_)\w/g, (match) => match.replace('_', ' ').toUpperCase());

interface SkillDraft {
  id?: number;
  skill: number;
  confidence_level: ProfileSkill['confidence_level'];
  description: string;
  is_featured: boolean;
}

export function EditProfilePage() {
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(0);
  const auth = useAuth();
  const toast = useToast();
  const currentProfile = useCurrentProfile();
  const taxonomy = useTaxonomy();
  const [form, setForm] = useState<ProfileFormState>(() => ({
    ...defaultProfileForm(auth.user?.email || ''),
  }));
  const [skillsDraft, setSkillsDraft] = useState<SkillDraft[]>([]);
  const [newSkill, setNewSkill] = useState<SkillDraft>({
    skill: 0,
    confidence_level: 'intermediate',
    description: '',
    is_featured: false,
  });
  const [newSkillId, setNewSkillId] = useState('');
  const [newSkillQuery, setNewSkillQuery] = useState('');
  const [showSkillResults, setShowSkillResults] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingSkill, setIsAddingSkill] = useState(false);

  useEffect(() => {
    const key = (searchParams.get('tab') || '').toLowerCase();
    const idx = tabParamMap[key];
    if (idx !== undefined) setActiveTab(idx);
  }, [searchParams]);

  useEffect(() => {
    if (currentProfile.data && !shouldUseMocks()) {
      setForm(formFromProfile(currentProfile.data));
      setSkillsDraft(
        currentProfile.data.profile_skills.map((skill) => ({
          id: skill.id,
          skill: skill.skill,
          confidence_level: skill.confidence_level,
          description: skill.description || '',
          is_featured: skill.is_featured,
        })),
      );
    }
  }, [currentProfile.data]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  const skillsById = useMemo(
    () => Object.fromEntries((taxonomy.data?.rawSkills || []).map((skill) => [skill.id, skill.name])),
    [taxonomy.data?.rawSkills],
  );
  const filteredSkills = useMemo(() => {
    const query = newSkillQuery.trim().toLowerCase();
    const base = taxonomy.data?.rawSkills || [];
    if (!query) return base.slice(0, 12);
    return base.filter((skill) => skill.name.toLowerCase().includes(query)).slice(0, 12);
  }, [newSkillQuery, taxonomy.data?.rawSkills]);
  const selectedSkillName = useMemo(
    () => (newSkillId ? skillsById[Number(newSkillId)] || '' : ''),
    [newSkillId, skillsById],
  );

  const saveBasicInfo = async () => {
    if (!form.displayName.trim() || !form.major.trim() || !form.headline.trim()) {
      throw new Error('Display name, major, and headline are required.');
    }
    await updateCurrentProfile({
      display_name: form.displayName.trim(),
      major: form.major.trim(),
      year: form.year,
      headline: form.headline.trim(),
      bio: form.bio.trim(),
      interests: form.interests.trim(),
      location: form.location.trim(),
      preferred_contact_method: form.preferredContactMethod,
    });
  };

  const saveSkills = async () => {
    const current = await getProfileSkills();
    await Promise.all(current.map((row) => deleteProfileSkill(row.id)));
    const rows = skillsDraft.filter((row) => row.skill);
    await Promise.all(
      rows.map((row) =>
        createProfileSkill({
          skill: row.skill,
          confidence_level: row.confidence_level,
          description: row.description,
          is_featured: row.is_featured,
        }),
      ),
    );
  };

  const saveAvailabilityTab = async () => {
    const current = await getAvailability();
    await Promise.all(current.map((row) => deleteAvailability(row.id)));
    const nextRows = form.availability.filter((row) => row.day_of_week && row.time_block);
    await Promise.all(
      nextRows.map((row) =>
        createAvailability({
          day_of_week: row.day_of_week,
          time_block: row.time_block,
          notes: row.notes || '',
        }),
      ),
    );
    await updateCurrentProfile({ availability_notes: form.availabilityNotes.trim() });
  };

  const saveContacts = async () => {
    if (!form.contacts.some((contact) => contact.value.trim())) {
      throw new Error('Add at least one contact method before saving this tab.');
    }
    const current = await getContactMethods();
    await Promise.all(current.map((row) => deleteContactMethod(row.id)));
    await Promise.all(
      form.contacts
        .filter((row) => row.value.trim())
        .map((row) =>
          createContactMethod({
            type: row.type,
            value: row.value.trim(),
            is_public: row.is_public,
            label: row.label || '',
          }),
        ),
    );
    await updateCurrentProfile({ preferred_contact_method: form.preferredContactMethod });
  };

  const saveCredentials = async () => {
    const current = await getCredentials();
    await Promise.all(current.map((row) => deleteCredential(row.id)));
    await Promise.all(
      form.credentials
        .filter((row) => row.title.trim() && row.url.trim())
        .map((row) =>
          createCredential({
            credential_type: row.credential_type,
            title: row.title.trim(),
            url: row.url.trim(),
            visibility: row.visibility,
          }),
        ),
    );
  };

  const savePrivacy = async () => {
    await updateCurrentProfile({
      visibility: form.visibility,
      open_to_connect: form.openToConnect,
      preferred_contact_method: form.preferredContactMethod,
    });
  };

  const handleSave = async () => {
    if (shouldUseMocks() || auth.isDemo) {
      toast.success('Demo profile changes saved locally for this session.');
      return;
    }
    setIsSaving(true);
    try {
      if (activeTab === 0) await saveBasicInfo();
      if (activeTab === 1) await saveSkills();
      if (activeTab === 2) await saveAvailabilityTab();
      if (activeTab === 3) await saveContacts();
      if (activeTab === 4) await saveCredentials();
      if (activeTab === 5) await savePrivacy();
      await currentProfile.refetch();
      toast.success(`${tabs[activeTab]} saved.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save this section.';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (currentProfile.isLoading && !shouldUseMocks()) {
    return <div className="mx-auto max-w-5xl rounded-2xl border border-[#E2E8F0] bg-white p-6 text-[#64748B]">Loading your profile...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-[#0F172A]">Edit Profile</h1>
        <p className="text-[#64748B]">Update your information to help students find and connect with you</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <div className="sticky top-6 rounded-2xl border border-[#E2E8F0] bg-white p-4">
            {tabs.map((tab, idx) => (
              <button key={tab} onClick={() => setActiveTab(idx)} className={`mb-1 w-full rounded-xl px-4 py-3 text-left text-sm font-medium transition-colors ${activeTab === idx ? 'bg-[#E8EEF7] text-[#13294B]' : 'text-[#64748B] hover:bg-[#F8FAFC]'}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 lg:col-span-3">
          <div className="rounded-2xl bg-gradient-to-br from-[#13294B] to-[#1a3a6b] p-6 text-white">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Profile Strength: {currentProfile.data?.profile_completeness ?? 75}%</h3>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">Live profile</span>
            </div>
            <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/20">
              <div className="h-full bg-white" style={{ width: `${currentProfile.data?.profile_completeness ?? 75}%` }} />
            </div>
            <p className="text-sm text-blue-100">Initials avatars only. No profile photos or upload fields.</p>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-6 text-xl font-semibold text-[#0F172A]">{tabs[activeTab]}</h2>

            {activeTab === 0 && (
              <div className="space-y-4">
                <Input label="Display Name" value={form.displayName} onChange={(value) => update('displayName', value)} />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label="Major" value={form.major} onChange={(value) => update('major', value)} />
                  <Select label="Year" value={form.year} options={years} onChange={(value) => update('year', value as StudentYear)} />
                </div>
                <Input label="Headline" value={form.headline} onChange={(value) => update('headline', value)} />
                <Textarea label="Bio" value={form.bio} onChange={(value) => update('bio', value)} />
                <Input label="Interests" value={form.interests} onChange={(value) => update('interests', value)} placeholder="Comma-separated interests" />
              </div>
            )}

            {activeTab === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-[#64748B]">Add your core skills with confidence and context.</p>

                {skillsDraft.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                    No skills added yet. Add your first skill below.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {skillsDraft.map((row, index) => (
                      <div key={`${row.skill}-${index}`} className="space-y-3 rounded-xl border border-[#E2E8F0] p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-[#0F172A]">{skillsById[row.skill] || `Skill ${row.skill}`}</p>
                          <button
                            type="button"
                            onClick={async () => {
                              const current = skillsDraft[index];
                              if (!shouldUseMocks() && current?.id) {
                                try {
                                  await deleteProfileSkill(current.id);
                                } catch {
                                  toast.error('Could not remove this skill.');
                                  return;
                                }
                              }
                              setSkillsDraft((cur) => cur.filter((_, i) => i !== index));
                              toast.success('Skill removed.');
                            }}
                            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#DC2626]"
                            aria-label="Remove skill"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[200px_1fr_auto]">
                          <select
                            value={row.confidence_level}
                            onChange={(event) =>
                              setSkillsDraft((cur) =>
                                cur.map((item, i) =>
                                  i === index
                                    ? { ...item, confidence_level: event.target.value as ProfileSkill['confidence_level'] }
                                    : item,
                                ),
                              )
                            }
                            className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
                          >
                            {confidenceLevels.map((level) => (
                              <option key={level} value={level}>
                                {titleCase(level)}
                              </option>
                            ))}
                          </select>
                          <input
                            value={row.description}
                            onChange={(event) =>
                              setSkillsDraft((cur) =>
                                cur.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)),
                              )
                            }
                            placeholder="Describe your experience with this skill"
                            className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm"
                          />
                          <label className="flex items-center gap-2 text-sm text-[#64748B]">
                            <input
                              type="checkbox"
                              checked={row.is_featured}
                              onChange={(event) =>
                                setSkillsDraft((cur) =>
                                  cur.map((item, i) => (i === index ? { ...item, is_featured: event.target.checked } : item)),
                                )
                              }
                            />
                            Featured
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                  <p className="text-sm font-semibold text-[#0F172A]">Add Skill</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="relative">
                      <input
                        value={newSkillQuery}
                        onFocus={() => setShowSkillResults(true)}
                        onChange={(event) => {
                          setNewSkillQuery(event.target.value);
                          setShowSkillResults(true);
                        }}
                        placeholder="Search skills, e.g. GitHub, Python, Resume Review"
                        className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm"
                      />
                      {showSkillResults && (
                        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-[#E2E8F0] bg-white shadow-lg">
                          {filteredSkills.length > 0 ? (
                            filteredSkills.map((skill) => (
                              <button
                                key={skill.id}
                                type="button"
                                onClick={() => {
                                  setNewSkillId(String(skill.id));
                                  setNewSkillQuery(skill.name);
                                  setNewSkill((cur) => ({ ...cur, skill: skill.id }));
                                  setShowSkillResults(false);
                                }}
                                className="block w-full border-b border-[#F1F5F9] px-3 py-2 text-left text-sm text-[#0F172A] last:border-b-0 hover:bg-[#F8FAFC]"
                              >
                                {skill.name}
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-2 text-sm text-[#64748B]">No skills found.</p>
                          )}
                        </div>
                      )}
                      {selectedSkillName && (
                        <p className="mt-2 text-xs font-medium text-[#13294B]">Selected: {selectedSkillName}</p>
                      )}
                    </div>
                    <select
                      value={newSkill.confidence_level}
                      onChange={(event) =>
                        setNewSkill((cur) => ({ ...cur, confidence_level: event.target.value as ProfileSkill['confidence_level'] }))
                      }
                      className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
                    >
                      {confidenceLevels.map((level) => (
                        <option key={level} value={level}>
                          {titleCase(level)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Textarea
                    label="Description"
                    value={newSkill.description}
                    onChange={(value) => setNewSkill((cur) => ({ ...cur, description: value }))}
                  />
                  <label className="flex items-center gap-2 text-sm text-[#64748B]">
                    <input
                      type="checkbox"
                      checked={newSkill.is_featured}
                      onChange={(event) => setNewSkill((cur) => ({ ...cur, is_featured: event.target.checked }))}
                    />
                    Mark as featured
                  </label>
                  <button
                    type="button"
                    disabled={isAddingSkill || !newSkillId}
                    onClick={async () => {
                      const skillId = Number(newSkillId || 0);
                      if (!skillId) {
                        toast.error('Pick a skill before adding.');
                        return;
                      }
                      if (skillsDraft.some((row) => row.skill === skillId)) {
                        toast.error('This skill is already listed.');
                        return;
                      }
                      const draft: SkillDraft = { ...newSkill, skill: skillId };
                      if (shouldUseMocks() || auth.isDemo) {
                        setSkillsDraft((cur) => [...cur, draft]);
                        setNewSkill({ skill: 0, confidence_level: 'intermediate', description: '', is_featured: false });
                        setNewSkillId('');
                        setNewSkillQuery('');
                        toast.success('Skill added.');
                        return;
                      }
                      setIsAddingSkill(true);
                      try {
                        const created = await createProfileSkill({
                          skill: draft.skill,
                          confidence_level: draft.confidence_level,
                          description: draft.description,
                          is_featured: draft.is_featured,
                        });
                        setSkillsDraft((cur) => [...cur, { ...draft, id: created.id }]);
                        setNewSkill({ skill: 0, confidence_level: 'intermediate', description: '', is_featured: false });
                        setNewSkillId('');
                        setNewSkillQuery('');
                        await currentProfile.refetch();
                        toast.success('Skill added.');
                      } catch {
                        toast.error('Could not add this skill.');
                      } finally {
                        setIsAddingSkill(false);
                      }
                    }}
                    className="rounded-xl bg-[#13294B] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3a6b] disabled:opacity-60"
                  >
                    {isAddingSkill ? 'Adding...' : 'Add Skill'}
                  </button>
                </div>
              </div>
            )}

            {activeTab === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Select label="Day" value={form.availability[0]?.day_of_week || 'flexible'} options={days} onChange={(value) => update('availability', [{ ...(form.availability[0] || {}), day_of_week: value, time_block: form.availability[0]?.time_block || 'flexible' }])} />
                  <Select label="Time block" value={form.availability[0]?.time_block || 'flexible'} options={times} onChange={(value) => update('availability', [{ ...(form.availability[0] || {}), day_of_week: form.availability[0]?.day_of_week || 'flexible', time_block: value }])} />
                </div>
                <Textarea label="Availability notes" value={form.availabilityNotes} onChange={(value) => update('availabilityNotes', value)} />
              </div>
            )}

            {activeTab === 3 && (
              <div className="space-y-4">
                {form.contacts.map((contact, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] p-4 md:grid-cols-[150px_1fr_100px]">
                    <select value={contact.type} onChange={(event) => {
                      const contacts = [...form.contacts];
                      contacts[index] = { ...contact, type: event.target.value as ContactMethodType };
                      update('contacts', contacts);
                    }} className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm">{contactTypes.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select>
                    <input value={contact.value} onChange={(event) => {
                      const contacts = [...form.contacts];
                      contacts[index] = { ...contact, value: event.target.value };
                      update('contacts', contacts);
                    }} className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm" />
                    <label className="flex items-center gap-2 text-sm text-[#64748B]"><input type="checkbox" checked={contact.is_public} onChange={(event) => {
                      const contacts = [...form.contacts];
                      contacts[index] = { ...contact, is_public: event.target.checked };
                      update('contacts', contacts);
                    }} /> Public</label>
                  </div>
                ))}
                <button type="button" onClick={() => update('contacts', [...form.contacts, { type: 'linkedin', value: '', is_public: true }])} className="w-full rounded-xl border-2 border-dashed border-[#E2E8F0] px-4 py-3 text-[#64748B] hover:border-[#13294B]">Add Contact Method</button>
                <Select label="Preferred contact method" value={form.preferredContactMethod} options={contactTypes} onChange={(value) => update('preferredContactMethod', value as ContactMethodType)} />
              </div>
            )}

            {activeTab === 4 && (
              <div className="space-y-4">
                {form.credentials.map((credential, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] p-4 md:grid-cols-[150px_1fr_120px]">
                    <input value={credential.title} onChange={(event) => {
                      const credentials = [...form.credentials];
                      credentials[index] = { ...credential, title: event.target.value };
                      update('credentials', credentials);
                    }} className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm" />
                    <input value={credential.url} onChange={(event) => {
                      const credentials = [...form.credentials];
                      credentials[index] = { ...credential, url: event.target.value };
                      update('credentials', credentials);
                    }} placeholder="https://..." className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm" />
                    <select value={credential.visibility} onChange={(event) => {
                      const credentials = [...form.credentials];
                      credentials[index] = { ...credential, visibility: event.target.value as 'public' | 'private' | 'hidden' };
                      update('credentials', credentials);
                    }} className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"><option value="public">Public</option><option value="private">Private</option><option value="hidden">Hidden</option></select>
                  </div>
                ))}
                <button type="button" onClick={() => update('credentials', [...form.credentials, { credential_type: 'portfolio' as CredentialType, title: 'Portfolio', url: '', visibility: 'public' }])} className="w-full rounded-xl border-2 border-dashed border-[#E2E8F0] px-4 py-3 text-[#64748B] hover:border-[#13294B]">Add Credential Link</button>
              </div>
            )}

            {activeTab === 5 && (
              <div className="space-y-6">
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E2E8F0] p-4 hover:bg-[#F8FAFC]">
                  <input type="checkbox" checked={form.visibility === 'public'} onChange={(event) => update('visibility', event.target.checked ? 'public' : 'private')} className="h-5 w-5 rounded" />
                  <div><p className="font-medium text-[#0F172A]">Profile Visibility</p><p className="text-sm text-[#64748B]">Make my profile visible to all verified students</p></div>
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[#E2E8F0] p-4 hover:bg-[#F8FAFC]">
                  <input type="checkbox" checked={form.openToConnect} onChange={(event) => update('openToConnect', event.target.checked)} className="h-5 w-5 rounded" />
                  <div><p className="font-medium text-[#0F172A]">Open to Connect</p><p className="text-sm text-[#64748B]">Show that I am available to help other students</p></div>
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 rounded-xl bg-[#13294B] px-6 py-3 font-medium text-white transition-colors hover:bg-[#1a3a6b] disabled:opacity-60">
              <Save className="h-5 w-5" />{isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block text-sm font-medium text-[#0F172A]">{label}<input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-[#E2E8F0] px-4 py-3 focus:border-[#13294B] focus:outline-none" /></label>;
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium text-[#0F172A]">{label}<textarea rows={5} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-[#E2E8F0] px-4 py-3 focus:border-[#13294B] focus:outline-none" /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium text-[#0F172A]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-[#E2E8F0] px-4 py-3 focus:border-[#13294B] focus:outline-none">{options.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select></label>;
}
