import { Link } from 'react-router-dom';
import { Clock, Edit, ExternalLink, EyeOff, Lock } from 'lucide-react';
import { useCurrentProfile } from '../hooks/useProfileEditor';
import { useTaxonomy } from '../hooks/useTaxonomy';
import { InitialsAvatar } from '../components/ui/InitialsAvatar';
import { SkillChip } from '../components/ui/SkillChip';
import { EDIT_PROFILE } from '../lib/routes';
import { normalizeYear } from '../lib/mappers';

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export function MyProfilePage() {
  const profile = useCurrentProfile();
  const taxonomy = useTaxonomy();

  if (profile.isLoading) return <p role="status" className="text-sm text-[#475569]">Loading your profile…</p>;
  if (profile.isError || !profile.data) {
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Your profile couldn't be loaded. <button type="button" className="font-semibold underline" onClick={() => void profile.refetch()}>Try again</button></p>;
  }

  const data = profile.data;
  const skillName = (id: number) => taxonomy.data?.rawSkills.find((skill) => skill.id === id)?.name;
  const goals = (data.learning_goals ?? []).map(skillName).filter(Boolean) as string[];
  const evidence = data.credentials.filter((item) => item.visibility === 'public' && item.url);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-[#0F172A]">My profile</h1>
        <Link to={EDIT_PROFILE} className="inline-flex items-center gap-2 rounded-xl bg-[#13294B] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1a3a6b]"><Edit className="h-4 w-4" aria-hidden="true" />Edit profile</Link>
      </div>

      {data.visibility !== 'public' && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <EyeOff className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden="true" />
          <p>Your profile is hidden, so nobody can find you or send requests. <Link to="/settings" className="font-semibold underline">Publish it in Settings</Link>.</p>
        </div>
      )}
      {data.visibility === 'public' && !data.open_to_connect && (
        <p className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#475569]">You're visible but not taking new requests. Change this from the status menu at the top of the page.</p>
      )}

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <InitialsAvatar src={data.profile_picture || undefined} name={data.display_name} size="xl" />
          <div className="min-w-0">
            <p className="text-2xl font-bold text-[#0F172A]">{data.display_name}</p>
            <p className="text-[#475569]">{data.major} · {normalizeYear(String(data.year))}</p>
            <p className="mt-2 text-[#0F172A]">{data.headline}</p>
          </div>
        </div>
        {data.bio ? <p className="mt-4 whitespace-pre-line text-[#475569]">{data.bio}</p> : <p className="mt-4 text-sm text-[#475569]"><Link to={`${EDIT_PROFILE}?tab=basic`} className="font-medium text-[#13294B] underline">Add a short bio</Link> to help people get to know you.</p>}
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold text-[#0F172A]">Teaches</h2>
        <ul className="divide-y divide-[#E2E8F0]">
          {data.profile_skills.map((skill) => (
            <li key={skill.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
              <div className="min-w-0">
                <p className="font-medium text-[#0F172A]">{skill.skill_detail?.name ?? skillName(skill.skill)}</p>
                {skill.description && <p className="text-sm text-[#475569]">{skill.description}</p>}
              </div>
              <span className="rounded-full bg-[#E8EEF7] px-3 py-1 text-xs font-medium text-[#13294B]">{titleCase(skill.confidence_level)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-lg font-semibold text-[#0F172A]">Wants to learn</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2 py-0.5 text-xs text-[#475569]"><Lock className="h-3 w-3" aria-hidden="true" />Only you</span>
        </div>
        <div className="flex flex-wrap gap-2">{goals.length ? goals.map((goal) => <SkillChip key={goal} skill={goal} />) : <p className="text-sm text-[#475569]">No learning goals yet.</p>}</div>
        {data.learning_goal_notes && <p className="mt-3 text-sm text-[#475569]">{data.learning_goal_notes}</p>}
      </section>

      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <h2 className="mb-3 text-lg font-semibold text-[#0F172A]">Availability</h2>
        <div className="flex flex-wrap gap-2">
          {data.availability.map((slot) => (
            <span key={slot.id} className="inline-flex items-center gap-1.5 rounded-lg bg-[#F8FAFC] px-3 py-1.5 text-sm text-[#0F172A]"><Clock className="h-3.5 w-3.5 text-[#64748B]" aria-hidden="true" />{normalizeYear(slot.day_of_week)} · {normalizeYear(slot.time_block)}</span>
          ))}
        </div>
        {data.availability_notes && <p className="mt-3 text-sm text-[#475569]">{data.availability_notes}</p>}
      </section>

      {evidence.length > 0 && (
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-3 text-lg font-semibold text-[#0F172A]">Links</h2>
          <ul className="space-y-2">
            {evidence.map((item) => <li key={item.id}><a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[#13294B] hover:underline">{item.title}<ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /></a></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}
