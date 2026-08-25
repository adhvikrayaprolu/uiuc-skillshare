import { Link } from 'react-router-dom';
import { Bookmark, MessageSquare } from 'lucide-react';
import { Profile } from '../../data/mockData';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import { SkillChip } from '../ui/SkillChip';
import { InsightChips } from '../../lib/profileInsightBadges';
import { profileInsightLabels } from '../../lib/profileInsightLabels';

interface ProfileCardProps {
  profile: Profile;
  isSaved?: boolean;
  onToggleSave?: () => void;
  reasonText?: string;
  relevanceLabel?: string;
}

export function ProfileCard({ profile, isSaved = false, onToggleSave, reasonText, relevanceLabel }: ProfileCardProps) {
  return (
    <div className="flex min-h-[320px] flex-col rounded-2xl border border-[#E2E8F0] bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#13294B] hover:shadow-lg">
      {/* Profile Header */}
      <div className="mb-2.5 flex gap-3">
        <InitialsAvatar name={profile.name} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold text-[#0F172A]">{profile.name}</h3>
              <p className="text-sm text-[#64748B]">{profile.major} · {profile.year}</p>
            </div>
            {onToggleSave && (
              <button
                onClick={onToggleSave}
                className={`p-2 rounded-lg transition-colors flex-shrink-0 ${
                  isSaved
                    ? 'bg-[#FF5F05] text-white'
                    : 'hover:bg-[#F8FAFC] text-[#64748B]'
                }`}
              >
                <Bookmark className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Headline */}
      <p className="mb-2.5 line-clamp-2 text-sm text-[#0F172A]">{profile.headline}</p>

      {/* Skills */}
      <div className="mb-2.5 flex min-h-[34px] flex-wrap gap-1.5">
        {profile.skills.slice(0, 3).map((skill, idx) => (
          <SkillChip key={idx} skill={skill.name} />
        ))}
        {profile.skills.length > 3 && (
          <span className="px-3 py-1 bg-[#F8FAFC] text-[#64748B] text-xs font-medium rounded-full">
            +{profile.skills.length - 3} more
          </span>
        )}
      </div>

      <div className="mt-0.5">
        <InsightChips labels={profileInsightLabels(profile)} />
      </div>
      {(relevanceLabel || reasonText) && (
        <div className="mt-2 space-y-1">
          {relevanceLabel && (
            <span className="inline-flex rounded-full bg-[#FFF3EA] px-2 py-0.5 text-[11px] font-semibold text-[#C2410C]">
              {relevanceLabel}
            </span>
          )}
          {reasonText && <p className="line-clamp-1 text-xs text-[#334155]">Why this profile: {reasonText}</p>}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-auto flex gap-2.5 pt-3">
        <Link
          to={`/profiles/${profile.id}`}
          className="flex-1 px-4 py-2.5 bg-[#13294B] text-white text-sm font-medium rounded-xl hover:bg-[#1a3a6b] transition-colors text-center"
        >
          View Profile
        </Link>
        <Link
          to={`/profiles/${profile.id}#contact`}
          className="px-4 py-2.5 border-2 border-[#13294B] text-[#13294B] text-sm font-medium rounded-xl hover:bg-[#E8EEF7] transition-colors flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4" />
          View Contact
        </Link>
      </div>
    </div>
  );
}
