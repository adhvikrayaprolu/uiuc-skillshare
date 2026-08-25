import { Link } from 'react-router-dom';
import { Search, Trash2, Bookmark } from 'lucide-react';
import { InitialsAvatar } from '../components/ui/InitialsAvatar';
import { SkillChip } from '../components/ui/SkillChip';
import { useDeleteSavedProfileMutation, useSavedProfiles } from '../hooks/useSavedProfiles';
import { useToast } from '../components/ui/ToastProvider';
import { shouldUseMocks } from '../lib/api';

export function SavedProfilesPage() {
  const savedProfilesQuery = useSavedProfiles();
  const deleteSavedProfile = useDeleteSavedProfileMutation();
  const toast = useToast();
  const isMock = shouldUseMocks();
  const savedProfiles = savedProfilesQuery.data?.profiles ?? [];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-[#0F172A]">Saved Profiles</h1>
        <p className="text-[#64748B]">Students you&apos;ve bookmarked for future reference</p>
      </div>

      {savedProfilesQuery.isError && !isMock && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load saved profiles. Check your connection and try again.
        </div>
      )}

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748B]" />
          <input
            type="text"
            placeholder="Search saved profiles..."
            className="w-full rounded-xl border border-[#E2E8F0] bg-white py-3 pl-12 pr-4 focus:border-[#13294B] focus:outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {savedProfiles.map((profile) => (
          <div
            key={profile.id}
            className="rounded-2xl border border-[#E2E8F0] bg-white p-6 transition-all hover:shadow-lg"
          >
            <div className="mb-4 flex gap-4">
              <InitialsAvatar name={profile.name} size="lg" />
              <div className="min-w-0 flex-1">
                <h3 className="mb-1 text-lg font-semibold text-[#0F172A]">{profile.name}</h3>
                <p className="text-sm text-[#64748B]">
                  {profile.major} · {profile.year}
                </p>
              </div>
            </div>

            <p className="mb-4 line-clamp-2 text-sm text-[#0F172A]">{profile.headline}</p>

            <div className="mb-4 flex flex-wrap gap-2">
              {profile.skills.slice(0, 3).map((skill, idx) => (
                <SkillChip key={idx} skill={skill.name} />
              ))}
            </div>

            <div className="flex gap-3">
              <Link
                to={`/profiles/${profile.id}`}
                className="flex-1 rounded-xl bg-[#13294B] px-4 py-2 text-center text-sm font-medium text-white transition-colors hover:bg-[#1a3a6b]"
              >
                View Profile
              </Link>
              <button
                type="button"
                onClick={async () => {
                  const savedRecord = savedProfilesQuery.data?.saved.find(
                    (item) => item.saved_profile_detail.id === profile.id,
                  );
                  if (!savedRecord) {
                    if (isMock) {
                      toast.info('Nothing to remove in this demo view.');
                    }
                    return;
                  }
                  try {
                    await deleteSavedProfile.mutateAsync(savedRecord.id);
                    toast.success('Profile removed.');
                  } catch {
                    toast.error('Could not remove saved profile.');
                  }
                }}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#DC2626] px-4 py-2 text-sm font-medium text-[#DC2626] transition-colors hover:bg-[#DC2626] hover:text-white"
                aria-label={`Remove ${profile.name} from saved profiles`}
              >
                <Trash2 className="h-4 w-4" />
                Unsave
              </button>
            </div>
          </div>
        ))}
      </div>

      {savedProfiles.length === 0 && !savedProfilesQuery.isLoading && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F8FAFC]">
            <Bookmark className="h-8 w-8 text-[#64748B]" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-[#0F172A]">No saved profiles yet</h3>
          <p className="mb-6 text-[#64748B]">
            {isMock ? 'Save profiles from Discover to build your demo list.' : 'Save profiles from Discover to see them here.'}
          </p>
          <Link
            to="/discover"
            className="inline-block rounded-xl bg-[#13294B] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a3a6b]"
          >
            Discover Students
          </Link>
        </div>
      )}
    </div>
  );
}
