import { Link } from 'react-router-dom';
import { Edit, TrendingUp, Users, MessageCircle, ArrowRight, Link2 } from 'lucide-react';
import { mockProfiles } from '../data/mockData';
import { InitialsAvatar } from '../components/ui/InitialsAvatar';
import { SkillChip } from '../components/ui/SkillChip';
import { useDashboard } from '../hooks/useDashboard';
import { useRecommendedProfiles } from '../hooks/useRecommendedProfiles';
import { useAuth } from '../hooks/useAuth';
import { shouldUseMocks } from '../lib/api';
import { linkForDashboardAction } from '../lib/nextActionLink';
import { InsightChips } from '../lib/profileInsightBadges';
import { profileInsightLabels } from '../lib/profileInsightLabels';

const defaultNextActions = [
  { text: 'Complete your profile', link: '/profile/edit' },
  { text: 'Add your GitHub profile', link: '/profile/edit?tab=contact' },
  { text: 'Update availability', link: '/profile/edit?tab=availability' },
  { text: 'Search for collaborators', link: '/discover' },
  { text: 'Review help requests', link: '/requests' },
];

export function DashboardPage() {
  const auth = useAuth();
  const dashboardQuery = useDashboard();
  const recommendedQuery = useRecommendedProfiles();
  const useMocks = shouldUseMocks();

  const dashboard = dashboardQuery.data;
  const displayName =
    auth.user?.firstName || auth.user?.lastName
      ? `${auth.user.firstName} ${auth.user.lastName}`.trim()
      : auth.user?.email || 'Student';

  const profileCompleteness = useMocks ? 75 : dashboard?.profile_completeness ?? 0;
  const recommendedProfiles = recommendedQuery.data?.profiles ?? (useMocks ? mockProfiles.slice(0, 3) : []);
  const incomingRequestCount = useMocks ? 2 : dashboard?.incoming_help_request_count ?? 0;
  const outgoingRequestCount = useMocks ? 1 : dashboard?.outgoing_help_request_count ?? 0;
  const activeRequestsTotal = incomingRequestCount + outgoingRequestCount;
  const savedCount = useMocks ? 2 : dashboard?.saved_profile_count ?? 0;
  const connectionsCount = useMocks ? 1 : dashboard?.connections_count ?? 0;

  const nextActions =
    !useMocks && dashboard?.next_actions?.length
      ? dashboard.next_actions.map((text: string) => ({ text, link: linkForDashboardAction(text) }))
      : defaultNextActions;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="rounded-2xl bg-gradient-to-br from-[#13294B] to-[#1a3a6b] p-8 text-white">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="mb-2 text-3xl font-bold">Welcome back, {displayName.split(' ')[0] || displayName}</h1>
            <p className="text-blue-100">Keep your profile fresh so the right students can find you.</p>
          </div>
          <Link
            to="/profile/edit"
            className="inline-flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/30"
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </Link>
        </div>
      </div>

      {dashboardQuery.isError && !useMocks && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Could not load dashboard data. Some sections may be incomplete until the API is reachable.
        </div>
      )}

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8EEF7]">
              <TrendingUp className="h-5 w-5 text-[#13294B]" />
            </div>
            <div>
              <h2 className="font-semibold text-[#0F172A]">Profile completion</h2>
              <p className="text-sm text-[#64748B]">{profileCompleteness}% complete</p>
            </div>
          </div>
          <Link
            to="/profile/edit"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#13294B] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a3a6b]"
          >
            Update profile
          </Link>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
          <div className="h-full bg-[#FF5F05] transition-all" style={{ width: `${profileCompleteness}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF3EA]">
              <Users className="h-5 w-5 text-[#C2410C]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">{savedCount}</p>
              <p className="text-sm text-[#64748B]">Saved profiles</p>
            </div>
          </div>
          <Link to="/saved" className="mt-3 inline-block text-sm font-medium text-[#13294B] hover:text-[#FF5F05]">
            View saved →
          </Link>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8EEF7]">
              <MessageCircle className="h-5 w-5 text-[#13294B]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">{activeRequestsTotal}</p>
              <p className="text-sm text-[#64748B]">Active help requests</p>
            </div>
          </div>
          <p className="mt-1 text-xs text-[#64748B]">
            {incomingRequestCount} incoming · {outgoingRequestCount} outgoing
          </p>
          <Link to="/requests" className="mt-2 inline-block text-sm font-medium text-[#13294B] hover:text-[#FF5F05]">
            Open requests →
          </Link>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF3EA]">
              <Link2 className="h-5 w-5 text-[#C2410C]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[#0F172A]">{connectionsCount}</p>
              <p className="text-sm text-[#64748B]">Connections</p>
            </div>
          </div>
          <p className="mt-1 text-xs text-[#64748B]">Accepted help requests</p>
          <Link to="/connections" className="mt-2 inline-block text-sm font-medium text-[#13294B] hover:text-[#FF5F05]">
            View connections →
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <h3 className="mb-4 font-semibold text-[#0F172A]">Suggested next steps</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {nextActions.map((action, i) => (
            <Link
              key={i}
              to={action.link}
              className="group flex items-center justify-between rounded-lg bg-[#F8FAFC] p-3 transition-colors hover:bg-[#E8EEF7]"
            >
              <span className="text-sm text-[#0F172A]">{action.text}</span>
              <ArrowRight className="h-4 w-4 text-[#64748B] transition-all group-hover:translate-x-1 group-hover:text-[#13294B]" />
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">Recommended for you</h2>
            <p className="text-sm text-[#64748B]">Students you may want to connect with</p>
          </div>
          <Link
            to="/discover"
            className="flex items-center gap-1 text-sm font-medium text-[#13294B] transition-colors hover:text-[#FF5F05]"
          >
            View all
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {recommendedQuery.isError && !useMocks ? (
          <p className="text-sm text-[#64748B]">Recommendations unavailable right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {recommendedProfiles.map((profile) => (
              <Link
                key={profile.id}
                to={`/profiles/${profile.id}`}
                className="group rounded-xl border border-transparent bg-[#F8FAFC] p-4 transition-colors hover:border-[#13294B] hover:bg-[#E8EEF7]"
              >
                <div className="mb-3 flex items-start gap-3">
                  <InitialsAvatar name={profile.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold text-[#0F172A]">{profile.name}</h3>
                    <p className="text-xs text-[#64748B]">
                      {profile.major} · {profile.year}
                    </p>
                  </div>
                </div>

                <div className="mb-2 flex flex-wrap gap-1.5">
                  {profile.skills.slice(0, 3).map((skill, i) => (
                    <SkillChip key={i} skill={skill.name} className="bg-white" />
                  ))}
                </div>
                <InsightChips labels={profileInsightLabels(profile)} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
