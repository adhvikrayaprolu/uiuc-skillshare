import { Link } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import type { Profile } from '../../types/profile';
import { InitialsAvatar } from '../ui/InitialsAvatar';

const names = (rows: { name: string }[]) => rows.map((row) => row.name).join(', ');

export function MatchCard({ profile }: { profile: Profile }) {
  const swap = profile.swap;
  return (
    <article className="flex flex-col rounded-2xl border border-[#E2E8F0] bg-white p-5 transition-shadow hover:shadow-lg">
      <div className="mb-4 flex items-center gap-3">
        <InitialsAvatar name={profile.name} size="md" />
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-[#0F172A]">{profile.name}</h3>
          <p className="truncate text-sm text-[#475569]">{profile.major} · {profile.year}</p>
        </div>
      </div>
      {swap && (
        <dl className="mb-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl bg-[#F8FAFC] p-3 text-sm">
          <div className="min-w-0">
            <dt className="text-xs font-medium text-[#475569]">They teach you</dt>
            <dd className="font-semibold text-[#13294B]">{names(swap.they_teach_you)}</dd>
          </div>
          <ArrowLeftRight className="h-4 w-4 text-[#B83E00]" aria-hidden="true" />
          <div className="min-w-0 text-right">
            <dt className="text-xs font-medium text-[#475569]">You teach them</dt>
            <dd className="font-semibold text-[#13294B]">{names(swap.you_can_teach)}</dd>
          </div>
        </dl>
      )}
      <p className="mb-4 line-clamp-2 text-sm text-[#0F172A]">{profile.headline}</p>
      {profile.matchReasons?.[2] && <p className="mb-4 text-xs text-[#475569]">{profile.matchReasons[2]}</p>}
      <Link
        to={`/profiles/${profile.id}`}
        aria-label={`See swap with ${profile.name}`}
        className="mt-auto rounded-xl bg-[#13294B] px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-[#1a3a6b]"
      >
        See swap
      </Link>
    </article>
  );
}
