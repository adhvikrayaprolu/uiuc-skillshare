import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { isAxiosError } from 'axios';
import { shouldUseMocks } from '../lib/api';
import {
  defaultProfileForm, formFromProfile, saveProfileForm, validateSetupStep,
  type FieldErrors, type ProfileFormState, type SetupStep,
} from '../lib/profilePersistence';
import { useAuth } from '../hooks/useAuth';
import { useTaxonomy } from '../hooks/useTaxonomy';
import { useCurrentProfile } from '../hooks/useProfileEditor';
import { useToast } from '../components/ui/ToastProvider';
import { SkillPicker } from '../components/profile/SkillPicker';
import { SkillSuggestion } from '../components/profile/SkillSuggestion';
import { AvailabilityGrid } from '../components/profile/AvailabilityGrid';
import { SkillChip } from '../components/ui/SkillChip';
import { InitialsAvatar } from '../components/ui/InitialsAvatar';
import { apiErrorMessage } from '../lib/errors';
import { APP_HOME, SETUP_MATCHES } from '../lib/routes';
import type { ContactMethodType, ProfileSkill, StudentYear } from '../types/api';

const steps: { key: SetupStep; title: string; intro: string }[] = [
  { key: 'about', title: 'About you', intro: 'This is what other students see first.' },
  { key: 'teach', title: 'What you can teach', intro: 'Pick the skills you could help someone with. You can add more later.' },
  { key: 'learn', title: 'What you want to learn', intro: 'We use these to find people who can teach you, and people you could swap with.' },
  { key: 'availability', title: 'Availability and contact', intro: 'Last step. Tell people when you are usually free, then go live.' },
];
const years: StudentYear[] = ['freshman', 'sophomore', 'junior', 'senior', 'graduate', 'alumni', 'other'];
const levels: ProfileSkill['confidence_level'][] = ['beginner', 'intermediate', 'advanced', 'expert'];
const contactTypes: ContactMethodType[] = ['email', 'linkedin', 'instagram', 'phone', 'github', 'website', 'other'];
const contactPlaceholders: Partial<Record<ContactMethodType, string>> = {
  email: 'you@illinois.edu', linkedin: 'https://linkedin.com/in/you', instagram: '@yourhandle', phone: '+1 217 555 0100', github: 'https://github.com/you', website: 'https://…',
};
const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

interface Draft { step: number; form: ProfileFormState }

const draftKey = (userId?: number) => `illini-skillshare:setup-draft:${userId ?? 'anonymous'}`;

function readDraft(userId?: number): Draft | null {
  try {
    const raw = sessionStorage.getItem(draftKey(userId));
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

function firstIncompleteStep(form: ProfileFormState) {
  const index = steps.findIndex((step) => Object.keys(validateSetupStep(form, step.key)).length > 0);
  return index === -1 ? steps.length - 1 : index;
}

export function SetupPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const taxonomy = useTaxonomy();
  const currentProfile = useCurrentProfile();
  const noProfileYet = currentProfile.isError && isAxiosError(currentProfile.error) && currentProfile.error.response?.status === 404;
  const profileReady = shouldUseMocks() || currentProfile.isSuccess || noProfileYet;

  const [state, setState] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (state || !profileReady) return;
    const draft = readDraft(auth.user?.id);
    if (draft) {
      setState(draft);
      return;
    }
    const form = currentProfile.data ? { ...formFromProfile(currentProfile.data), visibility: 'public' as const } : defaultProfileForm(auth.user?.email || '');
    if (!form.contacts.length) form.contacts = [{ type: 'email', value: auth.user?.email || '', is_public: true }];
    setState({ step: currentProfile.data ? firstIncompleteStep(form) : 0, form });
  }, [auth.user?.email, auth.user?.id, currentProfile.data, profileReady, state]);

  useEffect(() => {
    if (state) sessionStorage.setItem(draftKey(auth.user?.id), JSON.stringify(state));
  }, [auth.user?.id, state]);

  const skills = useMemo(() => taxonomy.data?.rawSkills ?? [], [taxonomy.data?.rawSkills]);
  const skillName = (id: number) => skills.find((skill) => skill.id === id)?.name ?? 'Skill';

  if (!state) {
    if (currentProfile.isError && !noProfileYet) {
      return <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">We could not load your profile. <button type="button" className="font-semibold underline" onClick={() => void currentProfile.refetch()}>Try again</button></div>;
    }
    return <p role="status" className="text-sm text-[#475569]">Getting your setup ready…</p>;
  }

  const { form, step } = state;
  const current = steps[step];
  const setForm = (next: ProfileFormState | ((previous: ProfileFormState) => ProfileFormState)) =>
    setState((previous) => previous && { ...previous, form: typeof next === 'function' ? next(previous.form) : next });
  const update = <K extends keyof ProfileFormState>(key: K, value: ProfileFormState[K]) => setForm((previous) => ({ ...previous, [key]: value }));
  const goTo = (index: number) => {
    setErrors({});
    setSaveError('');
    setState((previous) => previous && { ...previous, step: index });
    window.requestAnimationFrame(() => headingRef.current?.focus());
  };
  const focusFirstError = (found: FieldErrors) => {
    const first = Object.keys(found)[0];
    window.requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus());
  };

  const finish = async () => {
    for (let index = 0; index < steps.length; index += 1) {
      const found = validateSetupStep(form, steps[index].key);
      if (Object.keys(found).length) {
        goTo(index);
        setErrors(found);
        focusFirstError(found);
        return;
      }
    }
    if (shouldUseMocks() || auth.isDemo) {
      toast.success('Demo profile saved locally.');
      navigate(APP_HOME);
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      await saveProfileForm(form, skills);
      sessionStorage.removeItem(draftKey(auth.user?.id));
      await auth.refreshSession();
      await queryClient.invalidateQueries();
      toast.success('You are live on Illini SkillShare.');
      navigate(SETUP_MATCHES, { replace: true });
    } catch (error) {
      setSaveError(apiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const next = () => {
    const found = validateSetupStep(form, current.key);
    setErrors(found);
    if (Object.keys(found).length) {
      focusFirstError(found);
      return;
    }
    if (step < steps.length - 1) goTo(step + 1);
    else void finish();
  };

  const contact = form.contacts[0] ?? { type: 'email' as ContactMethodType, value: '', is_public: true };
  const setContact = (changes: Partial<typeof contact>) => update('contacts', [{ ...contact, ...changes }, ...form.contacts.slice(1)]);

  return (
    <div>
      <nav aria-label="Setup progress" className="mb-6">
        <p className="mb-3 text-sm font-medium text-[#475569]">Step {step + 1} of {steps.length}</p>
        <ol className="grid grid-cols-4 gap-2">
          {steps.map((item, index) => (
            <li key={item.key} aria-current={index === step ? 'step' : undefined}>
              <span className={`block h-1.5 rounded-full ${index < step ? 'bg-[#15803D]' : index === step ? 'bg-[#13294B]' : 'bg-[#E2E8F0]'}`} />
              <span className={`mt-2 hidden text-xs sm:block ${index === step ? 'font-semibold text-[#0F172A]' : 'text-[#475569]'}`}>
                {index < step && <Check className="mr-1 inline h-3 w-3 text-[#15803D]" aria-label="Done" />}
                {item.title}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm sm:p-8" aria-labelledby="setup-heading">
        <h1 id="setup-heading" ref={headingRef} tabIndex={-1} className="text-2xl font-bold text-[#0F172A] focus:outline-none">{current.title}</h1>
        <p className="mb-6 mt-1 text-[#475569]">{current.intro}</p>
        {taxonomy.isError && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
            Skills could not be loaded. <button type="button" className="font-semibold underline" onClick={() => void taxonomy.refetch()}>Try again</button>
          </p>
        )}

        {current.key === 'about' && (
          <div className="space-y-4">
            <Field label="Display name" error={errors.displayName} field="displayName">
              {(props) => <input {...props} value={form.displayName} onChange={(event) => update('displayName', event.target.value)} placeholder="Riya Patel" autoComplete="name" />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Major" error={errors.major} field="major">
                {(props) => <input {...props} value={form.major} onChange={(event) => update('major', event.target.value)} placeholder="Computer Science" />}
              </Field>
              <Field label="Year" error={errors.year} field="year">
                {(props) => (
                  <select {...props} value={form.year} onChange={(event) => update('year', event.target.value as StudentYear)}>
                    <option value="">Choose your year</option>
                    {years.map((year) => <option key={year} value={year}>{titleCase(year)}</option>)}
                  </select>
                )}
              </Field>
            </div>
            <Field label="Headline" hint="One line about what you are into or good at." error={errors.headline} field="headline">
              {(props) => <input {...props} maxLength={255} value={form.headline} onChange={(event) => update('headline', event.target.value)} placeholder="CS junior who loves React and design systems" />}
            </Field>
          </div>
        )}

        {current.key === 'teach' && (
          <div className="space-y-5">
            {errors.skills && <p id="skills-error" role="alert" className="text-sm font-medium text-[#B91C1C]">{errors.skills}</p>}
            <div data-field="skills" tabIndex={-1} className="focus:outline-none">
              <SkillPicker
                label="Skills you can teach"
                skills={skills}
                categories={taxonomy.data?.rawCategories ?? []}
                selected={form.selectedSkillIds}
                onToggle={(id) => update('selectedSkillIds', form.selectedSkillIds.includes(id) ? form.selectedSkillIds.filter((value) => value !== id) : [...form.selectedSkillIds, id])}
              />
            </div>
            {form.selectedSkillIds.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-[#0F172A]">Your skills</h2>
                {form.selectedSkillIds.map((id) => {
                  const detail = form.skillDetails[id] ?? { confidence_level: 'intermediate' as const, description: '' };
                  const setDetail = (changes: Partial<typeof detail>) => update('skillDetails', { ...form.skillDetails, [id]: { ...detail, ...changes } });
                  return (
                    <div key={id} className="grid gap-3 rounded-xl border border-[#E2E8F0] p-3 sm:grid-cols-[minmax(0,1fr)_10rem]">
                      <label className="text-sm text-[#0F172A]">
                        <span className="font-medium">What have you done with {skillName(id)}?</span> <span className="text-[#475569]">(optional)</span>
                        <input className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" value={detail.description} onChange={(event) => setDetail({ description: event.target.value })} placeholder="e.g. Built two class projects with it" />
                      </label>
                      <label className="text-sm text-[#0F172A]">
                        <span className="font-medium">{skillName(id)} level</span>
                        <select className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" value={detail.confidence_level} onChange={(event) => setDetail({ confidence_level: event.target.value as ProfileSkill['confidence_level'] })}>
                          {levels.map((level) => <option key={level} value={level}>{titleCase(level)}</option>)}
                        </select>
                      </label>
                    </div>
                  );
                })}
                <p className="text-xs text-[#475569]">Levels are self-declared. Feedback from completed swaps builds trust over time.</p>
              </div>
            )}
            <SkillSuggestion categories={taxonomy.data?.rawCategories ?? []} />
          </div>
        )}

        {current.key === 'learn' && (
          <div className="space-y-5">
            {errors.goals && <p role="alert" className="text-sm font-medium text-[#B91C1C]">{errors.goals}</p>}
            <div data-field="goals" tabIndex={-1} className="focus:outline-none">
              <SkillPicker
                label="Skills you want to learn"
                skills={skills}
                categories={taxonomy.data?.rawCategories ?? []}
                selected={form.learningGoalIds}
                onToggle={(id) => update('learningGoalIds', form.learningGoalIds.includes(id) ? form.learningGoalIds.filter((value) => value !== id) : [...form.learningGoalIds, id])}
              />
            </div>
            <label className="block text-sm font-medium text-[#0F172A]">
              Anything specific? <span className="font-normal text-[#475569]">(optional)</span>
              <textarea rows={3} maxLength={500} className="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" value={form.learningGoalNotes} onChange={(event) => update('learningGoalNotes', event.target.value)} placeholder="e.g. Preparing for a product design internship interview" />
            </label>
            <Toggle
              checked={form.learningGoalsPublic}
              onChange={(checked) => update('learningGoalsPublic', checked)}
              label="Show these on my profile so people can propose swaps"
              hint={form.learningGoalsPublic ? 'Members who teach these can offer a swap. Your notes stay private.' : 'Hidden. They only shape who we suggest to you.'}
            />
          </div>
        )}

        {current.key === 'availability' && (
          <div className="space-y-6">
            <fieldset className="min-w-0 space-y-3">
              <legend className="text-sm font-semibold text-[#0F172A]">When are you usually free?</legend>
              {errors.availability && <p role="alert" className="text-sm font-medium text-[#B91C1C]">{errors.availability}</p>}
              <div data-field="availability" tabIndex={-1} className="focus:outline-none">
                <AvailabilityGrid value={form.availability} onChange={(value) => update('availability', value)} />
              </div>
              <label className="block text-sm text-[#0F172A]">
                Notes <span className="text-[#475569]">(optional)</span>
                <input className="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" value={form.availabilityNotes} onChange={(event) => update('availabilityNotes', event.target.value)} placeholder="e.g. Busy during midterms, free most weekends" />
              </label>
            </fieldset>

            <fieldset className="min-w-0 space-y-3">
              <legend className="text-sm font-semibold text-[#0F172A]">How should people reach you once you accept?</legend>
              <p className="text-sm text-[#475569]">Nobody sees this until you accept their request, or they accept yours.</p>
              <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                <label className="text-sm text-[#0F172A]">
                  Contact type
                  <select className="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" value={contact.type} onChange={(event) => setContact({ type: event.target.value as ContactMethodType, value: '' })}>
                    {contactTypes.map((type) => <option key={type} value={type}>{type === 'linkedin' ? 'LinkedIn' : type === 'github' ? 'GitHub' : titleCase(type)}</option>)}
                  </select>
                </label>
                <label className="text-sm text-[#0F172A]">
                  Contact detail
                  <input
                    data-field="contact"
                    aria-invalid={Boolean(errors.contact)}
                    aria-describedby={errors.contact ? 'contact-error' : undefined}
                    className="mt-1 w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
                    value={contact.value}
                    onChange={(event) => setContact({ value: event.target.value, is_public: true })}
                    placeholder={contactPlaceholders[contact.type] ?? ''}
                  />
                </label>
              </div>
              {errors.contact && <p id="contact-error" className="text-sm font-medium text-[#B91C1C]">{errors.contact}</p>}
            </fieldset>

            <fieldset className="space-y-3 rounded-xl border border-[#E2E8F0] p-4">
              <legend className="px-1 text-sm font-semibold text-[#0F172A]">Your choices</legend>
              <Toggle checked={form.visibility === 'public'} onChange={(checked) => update('visibility', checked ? 'public' : 'private')} label="Publish my profile" hint="Signed-in Illinois members can find you in Discover." />
              <Toggle checked={form.openToConnect} onChange={(checked) => update('openToConnect', checked)} label="I'm open to swaps and requests" hint="You can pause this any time from the status menu." />
              <Toggle checked={form.shareContacts} onChange={(checked) => update('shareContacts', checked)} label="Share my contact detail after I accept a request" hint="Turn off to coordinate some other way." />
            </fieldset>

            <div>
              <h2 className="mb-2 text-sm font-semibold text-[#0F172A]">Preview</h2>
              <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-3">
                  <InitialsAvatar name={form.displayName || 'You'} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-[#0F172A]">{form.displayName || 'Your name'}</p>
                    <p className="truncate text-sm text-[#475569]">{[form.major, form.year && titleCase(form.year)].filter(Boolean).join(' · ') || 'Major · Year'}</p>
                  </div>
                </div>
                {form.headline && <p className="mt-3 text-sm text-[#0F172A]">{form.headline}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {form.selectedSkillIds.slice(0, 4).map((id) => <SkillChip key={id} skill={skillName(id)} />)}
                </div>
              </div>
            </div>
            <p className="text-xs text-[#64748B]">By going live you agree to follow the <Link to="/guidelines" className="font-medium text-[#13294B] underline">Community guidelines</Link>.</p>
          </div>
        )}

        {saveError && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-800">{saveError}</p>}

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-[#E2E8F0] pt-5">
          <button type="button" onClick={() => goTo(step - 1)} disabled={step === 0 || saving} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-[#475569] hover:bg-[#F8FAFC] disabled:invisible">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
          </button>
          <button type="button" onClick={next} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#13294B] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1a3a6b] disabled:opacity-60">
            {step === steps.length - 1 ? (saving ? 'Going live…' : 'Go live') : 'Continue'}
            {step < steps.length - 1 && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </section>
    </div>
  );
}

type FieldProps = { id: string; 'data-field': string; 'aria-invalid': boolean; 'aria-describedby'?: string; className: string };

function Field({ label, hint, error, field, children }: { label: string; hint?: string; error?: string; field: string; children: (props: FieldProps) => React.ReactNode }) {
  const id = `setup-${field}`;
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-[#0F172A]">{label}</label>
      {hint && <p id={`${id}-hint`} className="text-xs text-[#475569]">{hint}</p>}
      {children({
        id, 'data-field': field, 'aria-invalid': Boolean(error), 'aria-describedby': describedBy,
        className: `mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:border-[#13294B] focus:outline-none ${error ? 'border-[#B91C1C]' : 'border-[#E2E8F0]'}`,
      })}
      {error && <p id={`${id}-error`} className="mt-1 text-sm font-medium text-[#B91C1C]">{error}</p>}
    </div>
  );
}

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (checked: boolean) => void; label: string; hint: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-4 w-4" />
      <span>
        <span className="block text-sm font-medium text-[#0F172A]">{label}</span>
        <span className="block text-xs text-[#475569]">{hint}</span>
      </span>
    </label>
  );
}
