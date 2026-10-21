import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Sprout } from 'lucide-react';
import { useCommunityHints } from '../../hooks/useCommunityHints';
import { useCurrentProfile } from '../../hooks/useProfileEditor';
import { InviteCard } from './InviteCard';

interface ColdStartPanelProps {
  onPickSkill?: (name: string) => void;
}

export function ColdStartPanel({ onPickSkill }: ColdStartPanelProps) {
  const id = useId();
  const hints = useCommunityHints();
  const profile = useCurrentProfile();
  const alertsOn = profile.data?.skill_alerts_enabled !== false;
  const mySkills = new Set((profile.data?.profile_skills ?? []).map((row) => row.skill));
  const unmet = (hints.data?.unmet ?? []).filter((skill) => !mySkills.has(skill.id)).slice(0, 3);
  const untaught = hints.data?.my_untaught_goals ?? [];
  const popular = hints.data?.popular ?? [];
  const firstGoal = untaught[0]?.name;

  return (
    <div className="space-y-4 text-left">
      {hints.isLoading && <p role="status" className="text-sm text-[#475569]">Looking at what people here teach…</p>}
      {unmet.length > 0 && (
        <section aria-labelledby={`${id}-unmet`} className="rounded-2xl border border-[#FED7AA] bg-[#FFF3EA] p-5">
          <div className="flex items-start gap-3">
            <Sprout className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#B83E00]" aria-hidden="true" />
            <div className="min-w-0">
              <h2 id={`${id}-unmet`} className="font-semibold text-[#0F172A]">Be the first to teach {unmet[0].name}</h2>
              <p className="mt-0.5 text-sm text-[#475569]">Members want to learn these, and nobody teaches them yet. If you know one, add it to your skills.</p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {unmet.map((skill) => (
                  <li key={skill.id} className="rounded-full border border-[#FDBA74] bg-white px-3 py-1 text-sm text-[#0F172A]">
                    {skill.name} <span className="text-[#475569]">· {skill.learners} {skill.learners === 1 ? 'learner' : 'learners'}</span>
                  </li>
                ))}
              </ul>
              <Link to="/me/edit?tab=teaching" className="mt-3 inline-block text-sm font-semibold text-[#B83E00] underline">Add a skill you can teach</Link>
            </div>
          </div>
        </section>
      )}
      {popular.length > 0 && (
        <section aria-labelledby={`${id}-popular`} className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 id={`${id}-popular`} className="font-semibold text-[#0F172A]">Popular skills to learn here</h2>
          <p className="mt-0.5 text-sm text-[#475569]">These have the most teachers right now.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {popular.map((skill) => (
              <li key={skill.id}>
                {onPickSkill ? (
                  <button type="button" onClick={() => onPickSkill(skill.name)} className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-sm text-[#0F172A] hover:border-[#13294B] hover:bg-[#E8EEF7]">
                    {skill.name} <span className="text-[#475569]">· {skill.teachers}</span>
                  </button>
                ) : (
                  <Link to={`/discover?q=${encodeURIComponent(skill.name)}`} className="inline-block rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-sm text-[#0F172A] hover:border-[#13294B] hover:bg-[#E8EEF7]">
                    {skill.name} <span className="text-[#475569]">· {skill.teachers}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <InviteCard
        heading={firstGoal ? `Know someone who teaches ${firstGoal}?` : 'Invite a classmate'}
        body={firstGoal
          ? `Nobody here teaches ${firstGoal} yet. Send them the link.${alertsOn ? " We'll let you know when someone who teaches it joins." : ''}`
          : 'SkillShare gets better with every person who joins. Send the link to a friend, club or class group chat.'}
      />
    </div>
  );
}
