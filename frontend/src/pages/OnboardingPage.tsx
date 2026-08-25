import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { shouldUseMocks } from '../lib/api';
import { defaultProfileForm, saveProfileForm, validateProfileForm } from '../lib/profilePersistence';
import { useAuth } from '../hooks/useAuth';
import { useTaxonomy } from '../hooks/useTaxonomy';
import { useToast } from '../components/ui/ToastProvider';
import type { ContactMethodType, CredentialType, StudentYear } from '../types/api';

const steps = ['Basic Info', 'Skills & Experiences', 'Availability', 'Contact Methods', 'Optional Credentials', 'Preview & Publish'];
const years: StudentYear[] = ['freshman', 'sophomore', 'junior', 'senior', 'graduate', 'alumni', 'other'];
const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday', 'flexible'];
const times = ['morning', 'afternoon', 'evening', 'night', 'flexible'];
const contactTypes: ContactMethodType[] = ['email', 'linkedin', 'github', 'instagram', 'portfolio', 'website', 'phone', 'other'];

const titleCase = (value: string) => value.replace(/(^|_)\w/g, (match) => match.replace('_', ' ').toUpperCase());

export function OnboardingPage() {
  const auth = useAuth();
  const taxonomy = useTaxonomy();
  const toast = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState(() => defaultProfileForm(auth.user?.email || ''));
  const [isPublishing, setIsPublishing] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const update = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));

  const publish = async () => {
    const nextErrors = validateProfileForm(form);
    setErrors(nextErrors);
    if (nextErrors.length) {
      toast.error(nextErrors[0]);
      setCurrentStep(0);
      return;
    }

    if (shouldUseMocks() || auth.isDemo) {
      toast.success('Demo profile published.');
      navigate('/dashboard');
      return;
    }

    setIsPublishing(true);
    try {
      await saveProfileForm(form, taxonomy.data?.rawSkills || []);
      toast.success('Onboarding complete. Your profile is live.');
      navigate('/dashboard');
    } catch {
      toast.error('Could not publish your profile. Check the fields and try again.');
    } finally {
      setIsPublishing(false);
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      void publish();
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((_, idx) => (
              <div key={idx} className="flex items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${idx < currentStep ? 'bg-[#16A34A] text-white' : idx === currentStep ? 'bg-[#13294B] text-white' : 'bg-[#E2E8F0] text-[#64748B]'}`}>
                  {idx < currentStep ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                </div>
                {idx < steps.length - 1 && <div className={`mx-2 h-1 w-12 ${idx < currentStep ? 'bg-[#16A34A]' : 'bg-[#E2E8F0]'}`} />}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[#64748B]">Step {currentStep + 1} of {steps.length}: {steps[currentStep]}</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-lg">
          <h2 className="mb-6 text-2xl font-bold text-[#0F172A]">{steps[currentStep]}</h2>
          {errors.length > 0 && (
            <div className="mb-5 rounded-xl border border-[#DC2626]/20 bg-[#FEF2F2] p-4 text-sm text-[#7F1D1D]">
              {errors[0]}
            </div>
          )}

          <div className="mb-8">
            {currentStep === 0 && (
              <div className="space-y-4">
                <Input label="Display Name *" value={form.displayName} onChange={(value) => update('displayName', value)} placeholder="Riya Patel" />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input label="Major *" value={form.major} onChange={(value) => update('major', value)} placeholder="Computer Science" />
                  <Select label="Year *" value={form.year} options={years} onChange={(value) => update('year', value as StudentYear)} />
                </div>
                <Input label="Headline *" value={form.headline} onChange={(value) => update('headline', value)} placeholder="Product-minded CS student interested in design systems" />
                <Textarea label="Bio" value={form.bio} onChange={(value) => update('bio', value)} placeholder="Tell other students about yourself and how you can help..." />
                <Input label="Interests" value={form.interests} onChange={(value) => update('interests', value)} placeholder="Product, startups, research" />
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-[#64748B]">Select the skills and experiences you can help others with.</p>
                <div className="flex max-h-72 flex-wrap gap-2 overflow-y-auto">
                  {(taxonomy.data?.rawSkills || []).slice(0, 80).map((skill) => {
                    const selected = form.selectedSkillIds.includes(skill.id);
                    return (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => update('selectedSkillIds', selected ? form.selectedSkillIds.filter((id) => id !== skill.id) : [...form.selectedSkillIds, skill.id])}
                        className={`rounded-full border px-4 py-2 text-sm transition-colors ${selected ? 'border-[#13294B] bg-[#13294B] text-white' : 'border-[#E2E8F0] bg-[#F8FAFC] text-[#0F172A] hover:bg-[#E8EEF7]'}`}
                      >
                        {skill.name}
                      </button>
                    );
                  })}
                </div>
                <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#64748B]">Selected Skills: {form.selectedSkillIds.length}</p>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Select label="Day" value={form.availability[0]?.day_of_week || 'monday'} options={days} onChange={(value) => update('availability', [{ ...(form.availability[0] || {}), day_of_week: value, time_block: form.availability[0]?.time_block || 'evening' }])} />
                  <Select label="Time block" value={form.availability[0]?.time_block || 'evening'} options={times} onChange={(value) => update('availability', [{ ...(form.availability[0] || {}), day_of_week: form.availability[0]?.day_of_week || 'monday', time_block: value }])} />
                </div>
                <Textarea label="Availability notes" value={form.availabilityNotes} onChange={(value) => update('availabilityNotes', value)} placeholder="Best after 6pm, flexible around exams..." />
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                {form.contacts.map((contact, index) => (
                  <div key={index} className="rounded-xl border border-[#E2E8F0] p-4">
                    <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-[160px_1fr_120px]">
                      <select className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" value={contact.type} onChange={(event) => {
                        const contacts = [...form.contacts];
                        contacts[index] = { ...contact, type: event.target.value as ContactMethodType };
                        update('contacts', contacts);
                      }}>{contactTypes.map((type) => <option key={type} value={type}>{titleCase(type)}</option>)}</select>
                      <input className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm" value={contact.value} onChange={(event) => {
                        const contacts = [...form.contacts];
                        contacts[index] = { ...contact, value: event.target.value };
                        update('contacts', contacts);
                      }} placeholder="Contact value" />
                      <label className="flex items-center gap-2 text-sm text-[#64748B]"><input type="checkbox" checked={contact.is_public} onChange={(event) => {
                        const contacts = [...form.contacts];
                        contacts[index] = { ...contact, is_public: event.target.checked };
                        update('contacts', contacts);
                      }} /> Public</label>
                    </div>
                  </div>
                ))}
                <button type="button" className="w-full rounded-xl border-2 border-dashed border-[#E2E8F0] px-4 py-3 text-sm font-medium text-[#64748B] hover:border-[#13294B]" onClick={() => update('contacts', [...form.contacts, { type: 'linkedin', value: '', is_public: true }])}>Add Contact Method</button>
                <Select label="Preferred contact method" value={form.preferredContactMethod} options={contactTypes} onChange={(value) => update('preferredContactMethod', value as ContactMethodType)} />
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                {form.credentials.map((credential, index) => (
                  <div key={index} className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] p-4 md:grid-cols-[150px_1fr_120px]">
                    <input className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm" value={credential.title} onChange={(event) => {
                      const credentials = [...form.credentials];
                      credentials[index] = { ...credential, title: event.target.value };
                      update('credentials', credentials);
                    }} />
                    <input className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm" value={credential.url} onChange={(event) => {
                      const credentials = [...form.credentials];
                      credentials[index] = { ...credential, url: event.target.value };
                      update('credentials', credentials);
                    }} placeholder="https://..." />
                    <select className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" value={credential.visibility} onChange={(event) => {
                      const credentials = [...form.credentials];
                      credentials[index] = { ...credential, visibility: event.target.value as 'public' | 'private' | 'hidden' };
                      update('credentials', credentials);
                    }}><option value="public">Public</option><option value="private">Private</option><option value="hidden">Hidden</option></select>
                  </div>
                ))}
                <button type="button" className="w-full rounded-xl border-2 border-dashed border-[#E2E8F0] px-4 py-3 text-sm font-medium text-[#64748B] hover:border-[#13294B]" onClick={() => update('credentials', [...form.credentials, { credential_type: 'portfolio' as CredentialType, title: 'Portfolio', url: '', visibility: 'public' }])}>Add Credential Link</button>
              </div>
            )}

            {currentStep === 5 && (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8EEF7]"><CheckCircle2 className="h-8 w-8 text-[#13294B]" /></div>
                <h3 className="mb-2 text-2xl font-bold text-[#0F172A]">You're all set</h3>
                <p className="mb-6 text-[#64748B]">Publish your profile so other verified students can discover and connect with you.</p>
                <label className="mb-6 flex cursor-pointer items-center justify-center gap-2">
                  <input type="checkbox" className="h-5 w-5 rounded" checked={form.openToConnect} onChange={(event) => update('openToConnect', event.target.checked)} />
                  <span className="text-sm text-[#0F172A]">I'm open to connect with other students</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-6">
            <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} disabled={currentStep === 0 || isPublishing} className="flex items-center gap-2 rounded-xl border-2 border-[#E2E8F0] px-6 py-3 font-medium text-[#64748B] transition-colors hover:border-[#13294B] hover:text-[#0F172A] disabled:cursor-not-allowed disabled:opacity-50"><ChevronLeft className="h-5 w-5" />Back</button>
            <div className="text-sm text-[#64748B]">{currentStep + 1} of {steps.length}</div>
            <button onClick={nextStep} disabled={isPublishing} className="flex items-center gap-2 rounded-xl bg-[#13294B] px-6 py-3 font-medium text-white transition-colors hover:bg-[#1a3a6b] disabled:opacity-60">{currentStep === steps.length - 1 ? (isPublishing ? 'Publishing...' : 'Publish Profile') : 'Continue'}<ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block text-sm font-medium text-[#0F172A]">{label}<input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-[#E2E8F0] px-4 py-3 focus:border-[#13294B] focus:outline-none" /></label>;
}

function Textarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="block text-sm font-medium text-[#0F172A]">{label}<textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-[#E2E8F0] px-4 py-3 focus:border-[#13294B] focus:outline-none" /></label>;
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium text-[#0F172A]">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-[#E2E8F0] px-4 py-3 focus:border-[#13294B] focus:outline-none">{options.map((option) => <option key={option} value={option}>{titleCase(option)}</option>)}</select></label>;
}
