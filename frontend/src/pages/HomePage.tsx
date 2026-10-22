import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle, Inbox, MessageCircle, Star, CheckCheck } from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useRecommendedProfiles } from '../hooks/useRecommendedProfiles';
import { useSwapMatches } from '../hooks/useSwapMatches';
import { MatchCard } from '../components/profiles/MatchCard';
import { useCurrentProfile } from '../hooks/useProfileEditor';
import { useAuth } from '../hooks/useAuth';
import { InitialsAvatar } from '../components/ui/InitialsAvatar';
import { SkillChip } from '../components/ui/SkillChip';
import { InsightChips } from '../lib/profileInsightBadges';
import { profileInsightLabels } from '../lib/profileInsightLabels';
import type { AttentionItem } from '../types/api';
import { ColdStartPanel } from '../components/growth/ColdStartPanel';
import { InviteCard } from '../components/growth/InviteCard';

const actionCopy: Record<AttentionItem['action'], { label: string; verb: string; icon: typeof Inbox }> = {
  respond: { label: 'sent you a request', verb: 'Reply', icon: Inbox },
  complete: { label: 'is in progress', verb: 'Mark done', icon: MessageCircle },
  feedback: { label: 'is finished. How did it go?', verb: 'Leave feedback', icon: Star },
};

export function HomePage() {
  const auth = useAuth();
  const dashboard = useDashboard();
  const recommended = useRecommendedProfiles();
  const swaps = useSwapMatches();
  const profile = useCurrentProfile();

  const name = profile.data?.display_name || auth.user?.firstName || '';
  const firstName = name.split(' ')[0];
  const attention = dashboard.data?.attention_items ?? [];
  const checklist = dashboard.data?.checklist ?? [];
  const remaining = checklist.filter((item) => !item.done);
  const doneCount = checklist.length - remaining.length;
  const swapMatches = (swaps.data?.profiles ?? []).slice(0, 3);
  const swapIds = new Set(swapMatches.map((match) => match.id));
  const suggestions = (recommended.data?.profiles ?? []).filter((person) => !swapIds.has(person.id)).slice(0, 3);
  const basedOnGoals = recommended.data?.matching?.recommendation_basis === 'learning_goals';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold text-[#0F172A]">{firstName ? `Hi, ${firstName}` : 'Welcome'}</h1>
          <p className="mt-1 text-[#475569]">Here's what's happening with your swaps.</p>
        </div>
        <Link to="/discover" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#B83E00] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#9A3412]">
          Find someone to learn from <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>

      {dashboard.isError && (
        <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Some of your Home page couldn't load. <button type="button" className="font-semibold underline" onClick={() => void dashboard.refetch()}>Try again</button>
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="attention-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="attention-heading" className="text-lg font-semibold text-[#0F172A]">Needs your attention</h2>
            <Link to="/requests" className="text-sm font-medium text-[#13294B] hover:text-[#B83E00]">All requests</Link>
          </div>
          {dashboard.isLoading ? (
            <p role="status" className="text-sm text-[#475569]">Loading…</p>
          ) : attention.length ? (
            <ul className="divide-y divide-[#E2E8F0]">
              {attention.map((item) => {
                const copy = actionCopy[item.action];
                const Icon = copy.icon;
                return (
                  <li key={`${item.action}-${item.request_id}`} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#FFF3EA]"><Icon className="h-4 w-4 text-[#B83E00]" aria-hidden="true" /></span>
                      <p className="min-w-0 text-sm text-[#0F172A]">
                        <span className="font-semibold">{item.action === 'respond' ? item.peer.name : `“${item.topic}”`}</span>{' '}
                        {item.action === 'respond' ? <>{item.kind === 'swap' ? 'proposed a swap for your' : 'asked for help with'} <span className="font-medium">{item.skill || item.topic}</span></> : <>with {item.peer.name} {copy.label}</>}
                      </p>
                    </div>
                    <Link to={item.href ?? `/requests/${item.request_id}`} aria-label={`${copy.verb}: ${item.topic}`} className="rounded-lg border border-[#13294B] px-3 py-1.5 text-center text-sm font-medium text-[#13294B] hover:bg-[#E8EEF7]">{copy.verb}</Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#475569]">
              <CheckCheck className="h-5 w-5 text-[#15803D]" aria-hidden="true" />
              <p>You're all caught up. When someone sends you a request, it shows up here.</p>
            </div>
          )}
        </section>

        <section aria-labelledby="checklist-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 id="checklist-heading" className="text-lg font-semibold text-[#0F172A]">{remaining.length ? 'Stand out' : 'Profile complete'}</h2>
          {checklist.length > 0 && (
            <>
              <p className="mt-1 text-sm text-[#475569]">{doneCount} of {checklist.length} done</p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#E2E8F0]" aria-hidden="true">
                <div className="h-full rounded-full bg-[#15803D]" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
              </div>
              <ul className="mt-4 space-y-2">
                {checklist.map((item) => (
                  <li key={item.key}>
                    {item.done ? (
                      <span className="flex items-center gap-2 text-sm text-[#475569] line-through"><CheckCircle2 className="h-4 w-4 text-[#15803D]" aria-hidden="true" />{item.label}<span className="sr-only">(done)</span></span>
                    ) : (
                      <Link to={item.href} className="flex items-center gap-2 text-sm text-[#0F172A] hover:text-[#B83E00]"><Circle className="h-4 w-4 text-[#94A3B8]" aria-hidden="true" />{item.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {!checklist.length && <p className="mt-2 text-sm text-[#475569]"><Link to="/me" className="font-medium text-[#13294B] underline">See your profile</Link> as others see it.</p>}
        </section>
      </div>

      {swapMatches.length > 0 && (
        <section aria-labelledby="swaps-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 id="swaps-heading" className="text-lg font-semibold text-[#0F172A]">You could swap with</h2>
              <p className="text-sm text-[#475569]">They teach what you want to learn and want to learn what you teach.</p>
            </div>
            <Link to="/discover?tab=swaps" className="flex flex-shrink-0 items-center gap-1 text-sm font-medium text-[#13294B] hover:text-[#B83E00]">All swaps <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {swapMatches.map((match) => <MatchCard key={match.id} profile={match} />)}
          </div>
        </section>
      )}

      <section aria-labelledby="suggested-heading" className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 id="suggested-heading" className="text-lg font-semibold text-[#0F172A]">{basedOnGoals ? 'Teaches what you want to learn' : 'People to meet'}</h2>
            <p className="text-sm text-[#475569]">{basedOnGoals ? 'Based on your learning goals.' : 'Add learning goals to get personal suggestions.'}</p>
          </div>
          <Link to="/discover" className="flex flex-shrink-0 items-center gap-1 text-sm font-medium text-[#13294B] hover:text-[#B83E00]">See all <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
        </div>
        {recommended.isLoading ? (
          <p role="status" className="text-sm text-[#475569]">Finding people…</p>
        ) : recommended.isError ? (
          <p className="text-sm text-[#475569]">Suggestions aren't available right now. <button type="button" className="font-medium underline" onClick={() => void recommended.refetch()}>Try again</button></p>
        ) : suggestions.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {suggestions.map((person) => (
              <Link key={person.id} to={`/profiles/${person.id}`} className="rounded-xl border border-transparent bg-[#F8FAFC] p-4 transition-colors hover:border-[#13294B] hover:bg-[#E8EEF7]">
                <div className="mb-3 flex items-center gap-3">
                  <InitialsAvatar name={person.name} size="md" />
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-[#0F172A]">{person.name}</h3>
                    <p className="truncate text-xs text-[#475569]">{person.major} · {person.year}</p>
                  </div>
                </div>
                <div className="mb-2 flex flex-wrap gap-1.5">{person.skills.slice(0, 3).map((skill) => <SkillChip key={skill.name} skill={skill.name} className="bg-white" />)}</div>
                <InsightChips labels={profileInsightLabels(person)} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#475569]">No suggestions yet. You're one of the first people here. <Link to="/discover" className="font-medium text-[#13294B] underline">Browse everyone</Link>, or help it grow.</p>
            <ColdStartPanel />
          </div>
        )}
      </section>
      {suggestions.length > 0 && <InviteCard compact />}
    </div>
  );
}
