import { Link } from 'react-router-dom';
import { PartyPopper, Search } from 'lucide-react';
import { useRecommendedProfiles } from '../hooks/useRecommendedProfiles';
import { useSwapMatches } from '../hooks/useSwapMatches';
import { MatchCard } from '../components/profiles/MatchCard';
import { useCurrentProfile } from '../hooks/useProfileEditor';
import { useTaxonomy } from '../hooks/useTaxonomy';
import { ProfileCard } from '../components/profiles/ProfileCard';
import { APP_HOME } from '../lib/routes';
import { ColdStartPanel } from '../components/growth/ColdStartPanel';

export function WelcomeMatchesPage() {
  const profile = useCurrentProfile();
  const taxonomy = useTaxonomy();
  const recommended = useRecommendedProfiles();
  const swaps = useSwapMatches();
  const firstName = profile.data?.display_name?.split(' ')[0];
  const goals = (profile.data?.learning_goals ?? [])
    .map((id) => taxonomy.data?.rawSkills.find((skill) => skill.id === id)?.name)
    .filter(Boolean) as string[];
  // Two-way swaps come first; helpers already shown as swaps are not repeated.
  const swapMatches = (swaps.data?.profiles ?? []).slice(0, 6);
  const swapIds = new Set(swapMatches.map((match) => match.id));
  const matches = (recommended.data?.profiles ?? []).filter((match) => !swapIds.has(match.id)).slice(0, 6);
  const loading = recommended.isLoading || swaps.isLoading;
  const nobody = !loading && !recommended.isError && swapMatches.length === 0 && matches.length === 0;
  const basedOnGoals = recommended.data?.matching?.recommendation_basis === 'learning_goals';

  return (
    <div>
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#13294B] to-[#1a3a6b] p-6 text-white sm:p-8">
        <PartyPopper className="mb-3 h-8 w-8 text-[#FFB27A]" aria-hidden="true" />
        <h1 className="text-2xl font-bold sm:text-3xl">You're live{firstName ? `, ${firstName}` : ''}!</h1>
        <p className="mt-2 text-blue-100">
          {goals.length
            ? `Here are people who can help with ${goals.slice(0, 3).join(', ')}${goals.length > 3 ? ' and more' : ''}.`
            : 'Here are some people you might want to meet.'}
        </p>
      </div>

      {loading && <p role="status" className="text-sm text-[#475569]">Finding people for you…</p>}
      {recommended.isError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          We couldn't load suggestions right now. <button type="button" className="font-semibold underline" onClick={() => void recommended.refetch()}>Try again</button>
        </p>
      )}

      {nobody && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 text-center">
          <Search className="mx-auto mb-3 h-8 w-8 text-[#64748B]" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-[#0F172A]">You're early</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#475569]">
            Nobody who teaches {goals.length ? goals.slice(0, 2).join(' or ') : 'your goals'} has joined yet. We'll suggest people on your Home page as they sign up.
          </p>
        </div>
      )}
      {nobody && <div className="mt-4"><ColdStartPanel /></div>}

      {swapMatches.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-[#0F172A]">You could swap with</h2>
          <p className="mb-3 text-sm text-[#475569]">They teach something you want to learn and want to learn something you teach.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {swapMatches.map((match) => <MatchCard key={match.id} profile={match} />)}
          </div>
        </section>
      )}

      {matches.length > 0 && (
        <>
          <h2 className="mb-3 text-lg font-semibold text-[#0F172A]">{swapMatches.length ? 'More people who teach what you want to learn' : basedOnGoals ? 'Teaches what you want to learn' : 'Suggested for you'}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {matches.map((match) => <ProfileCard key={match.id} profile={match} reasonText={match.matchReasons?.slice(0, 2).join(' + ')} />)}
          </div>
        </>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-end">
        <Link to="/discover" className="rounded-xl border-2 border-[#13294B] px-5 py-2.5 text-center text-sm font-semibold text-[#13294B] hover:bg-[#E8EEF7]">Browse everyone</Link>
        <Link to={APP_HOME} className="rounded-xl bg-[#13294B] px-5 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#1a3a6b]">Go to Home</Link>
      </div>
    </div>
  );
}
