import { Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { ArrowLeftRight, Search, Filter, ChevronDown, X } from 'lucide-react';
import { MatchCard } from '../components/profiles/MatchCard';
import { useSwapMatches } from '../hooks/useSwapMatches';
import { useCurrentProfile } from '../hooks/useProfileEditor';
import { SavedProfilesPanel } from './SavedProfilesPage';
import { useTaxonomy } from '../hooks/useTaxonomy';
import { ProfileCard } from '../components/profiles/ProfileCard';
import { EmptyState } from '../components/ui/EmptyState';
import { useDiscoverySearch } from '../hooks/useDiscoverySearch';
import { useSavedProfileActions } from '../hooks/useSavedProfiles';
import { useToast } from '../components/ui/ToastProvider';
import { PageControls } from '../components/ui/ListPagination';
import { TabPanel, Tabs } from '../components/ui/Tabs';
import { ColdStartPanel } from '../components/growth/ColdStartPanel';

type DiscoverTab = 'helpers' | 'swaps' | 'saved';
const tabs: { key: DiscoverTab; label: string }[] = [
  { key: 'helpers', label: 'All helpers' },
  { key: 'swaps', label: 'Swap matches' },
  { key: 'saved', label: 'Saved' },
];

export function DiscoveryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab') as DiscoverTab | null;
  const active: DiscoverTab = requested && tabs.some((tab) => tab.key === requested) ? requested : 'helpers';
  const select = (tab: DiscoverTab) => setSearchParams(tab === 'helpers' ? {} : { tab }, { replace: true });

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#0F172A] mb-2">Discover</h1>
        <p className="text-[#475569]">Find people who teach what you want to learn, or trade skills with someone.</p>
      </div>
      <Tabs label="Discover views" idPrefix="discover" tabs={tabs} active={active} onSelect={select} />
      <TabPanel idPrefix="discover" active={active}>
        {active === 'helpers' && <AllHelpersPanel />}
        {active === 'swaps' && <SwapMatchesPanel onBrowse={() => select('helpers')} />}
        {active === 'saved' && <SavedProfilesPanel onBrowse={() => select('helpers')} />}
      </TabPanel>
    </div>
  );
}

const swapEmptyCopy: Record<string, { title: string; body: string; link?: { to: string; label: string } }> = {
  no_learning_goals: { title: 'Add what you want to learn', body: 'Swap matches pair what you want to learn with what you can teach.', link: { to: '/me/edit?tab=learning', label: 'Add learning goals' } },
  no_teaching_skills: { title: 'Add a skill you can teach', body: 'A swap needs something to offer in return.', link: { to: '/me/edit?tab=teaching', label: 'Add a skill' } },
  no_mutual_matches: { title: 'No two-way matches yet', body: "Nobody who teaches your goals has said they want to learn one of your skills. You can still ask helpers directly, or show your own learning goals so others can find you." },
};

function SwapMatchesPanel({ onBrowse }: { onBrowse: () => void }) {
  const [page, setPage] = useState(1);
  const swaps = useSwapMatches(page);
  const profile = useCurrentProfile();
  const goalsHidden = profile.data && !profile.data.learning_goals_public;

  if (swaps.isLoading) return <p role="status" className="text-sm text-[#475569]">Finding swap matches…</p>;
  if (swaps.isError) {
    return (
      <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <span>We couldn't load swap matches right now.</span>
        <button type="button" onClick={() => void swaps.refetch()} className="rounded-lg border border-red-300 bg-white px-3 py-1 font-medium hover:bg-red-100">Try again</button>
      </div>
    );
  }
  const rows = swaps.data?.profiles ?? [];
  const empty = swapEmptyCopy[swaps.data?.matching?.reason ?? 'no_mutual_matches'] ?? swapEmptyCopy.no_mutual_matches;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#475569]">Two-way matches: they teach something you want to learn, and want to learn something you teach.</p>
      {goalsHidden && (
        <p className="rounded-xl border border-[#E2E8F0] bg-white p-4 text-sm text-[#475569]">
          Your learning goals are hidden, so others can't find you as a swap match. <Link to="/me/edit?tab=learning" className="font-semibold text-[#13294B] underline">Show them on your profile</Link>.
        </p>
      )}
      {rows.length ? (
        <>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => <MatchCard key={row.id} profile={row} />)}
          </div>
          {(page > 1 || swaps.data?.next) && (
            <PageControls label="Swap match pages" pageText={`Page ${page}`} canPrevious={page > 1 && !swaps.isFetching} canNext={Boolean(swaps.data?.next) && !swaps.isFetching} onPrevious={() => setPage((p) => p - 1)} onNext={() => setPage((p) => p + 1)} />
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center">
          <ArrowLeftRight className="mx-auto mb-3 h-8 w-8 text-[#64748B]" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-[#0F172A]">{empty.title}</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-[#475569]">{empty.body}</p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            {empty.link && <Link to={empty.link.to} className="rounded-xl bg-[#13294B] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1a3a6b]">{empty.link.label}</Link>}
            <button type="button" onClick={onBrowse} className="rounded-xl border-2 border-[#13294B] px-5 py-2.5 text-sm font-semibold text-[#13294B] hover:bg-[#E8EEF7]">Browse all helpers</button>
          </div>
        </div>
      )}
      {!rows.length && <ColdStartPanel />}
    </div>
  );
}

function AllHelpersPanel() {
  const [searchParams] = useSearchParams();
  const taxonomy = useTaxonomy();
  const quickCategories = taxonomy.data?.categories || [];
  const allSkills = taxonomy.data?.skills || [];
  const [page, setPage] = useState(1);
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get('q') || '');
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('All Years');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [openOnly, setOpenOnly] = useState(false);
  const [ordering, setOrdering] = useState('best_match');
  const savedActions = useSavedProfileActions();
  const toast = useToast();

  useEffect(() => {
    if (searchQuery === debouncedQuery) return;
    const timer = window.setTimeout(() => {setDebouncedQuery(searchQuery); setPage(1);}, 300);
    return () => window.clearTimeout(timer);
  }, [searchQuery, debouncedQuery]);
  const discoveryQuery = useDiscoverySearch({
    page,
    q: debouncedQuery || undefined,
    mode: debouncedQuery.trim() ? 'semantic' : undefined,
    skills: selectedSkills.length ? selectedSkills.join(',') : undefined,
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    year: selectedYear === 'All Years' ? undefined : selectedYear.toLowerCase(),
    open_to_connect: openOnly ? true : undefined,
    ordering,
  });

  const toggleSave = async (profileId: number) => {
    try {
      const saved = await savedActions.toggleSaved(profileId);
      toast.success(saved ? 'Profile saved.' : 'Profile unsaved.');
    } catch {
      toast.error('Could not update saved profile.');
    }
  };

  const filteredProfiles = discoveryQuery.data?.profiles ?? [];
  const resultCount = discoveryQuery.data?.count ?? filteredProfiles.length;
  const getReasonText = (reasons?: string[]) => {
    if (!searchQuery.trim() || !reasons?.length) return undefined;
    return reasons.slice(0, 2).join(' + ');
  };

  const clearAllFilters = () => {
    setPage(1);
    setSearchQuery('');
    setSelectedSkills([]);
    setSelectedYear('All Years');
    setSelectedCategory('All');
    setOpenOnly(false);
  };

  return (
    <div>
      {discoveryQuery.isError && (
        <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <span>We couldn't load matches right now.</span>
          <button type="button" onClick={() => void discoveryQuery.refetch()} className="rounded-lg border border-red-300 bg-white px-3 py-1 font-medium hover:bg-red-100">Try again</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] w-5 h-5" />
          <input
            type="text"
            aria-label="Search helpers" placeholder="Search resume help, Figma, startup advice, GitHub, research, project collaborators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-[#E2E8F0] rounded-2xl text-[15px] focus:outline-none focus:border-[#13294B] transition-colors"
          />
        </div>
      </div>

      {/* Quick Category Chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {quickCategories.map(category => (
          <button
            key={category}
            onClick={() => {setPage(1); setSelectedCategory(selectedCategory === category ? 'All' : category);}}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-[#13294B] text-white'
                : 'bg-white text-[#0F172A] border border-[#E2E8F0] hover:border-[#13294B]'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="md:hidden rounded border p-2"
          aria-expanded={showFilters}
          aria-label="Toggle filters"
        >{showFilters ? 'Hide filters' : 'Show filters'}</button>
        {/* Filter Sidebar */}
        <aside className={`${showFilters ? "block" : "hidden md:block"} w-full md:w-64 lg:w-72 flex-shrink-0`}>
            <div className="sticky top-6 rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-[#0F172A] flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </h3>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-[#B83E00] hover:underline"
                >
                  Clear all
                </button>
              </div>

              {/* Year Filter */}
              <div className="mb-5">
                <label className="mb-2 block text-sm font-semibold text-[#0F172A]">Year</label>
                <select aria-label="Filter by year"
                  value={selectedYear}
                  onChange={(e) => {setPage(1); setSelectedYear(e.target.value);}}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm focus:border-[#13294B] focus:outline-none"
                >
                  <option>All Years</option>
                  <option>Freshman</option>
                  <option>Sophomore</option>
                  <option>Junior</option>
                  <option>Senior</option>
                  <option>Graduate</option>
                  <option>Alumni</option>
                  <option>Other</option>
                </select>
              </div>

              {/* Skills Filter */}
              <div className="mb-5">
                <label className="mb-2 block text-sm font-semibold text-[#0F172A]">Skills</label>
                <div className="max-h-56 space-y-1.5 overflow-y-auto pr-2">
                  {allSkills.map(skill => (
                    <label key={skill} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-[#F8FAFC]">
                      <input
                        type="checkbox"
                        checked={selectedSkills.includes(skill)}
                        onChange={(e) => {
                          setPage(1);
                          if (e.target.checked) {
                            setSelectedSkills([...selectedSkills, skill]);
                          } else {
                            setSelectedSkills(selectedSkills.filter(s => s !== skill));
                          }
                        }}
                        className="w-4 h-4 rounded border-[#E2E8F0] text-[#13294B] focus:ring-[#13294B]"
                      />
                      <span className="text-xs text-[#0F172A]">{skill}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Open to Connect Filter */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer hover:bg-[#F8FAFC] p-2 rounded">
                  <input
                    type="checkbox"
                    checked={openOnly}
                    onChange={(e) => {setPage(1); setOpenOnly(e.target.checked);}}
                    className="w-4 h-4 rounded border-[#E2E8F0] text-[#13294B] focus:ring-[#13294B]"
                  />
                  <span className="text-sm font-semibold text-[#0F172A]">Open to Connect Only</span>
                </label>
              </div>
            </div>
          </aside>

        {/* Main Content */}
        <section aria-label="Matching peers" className="flex-1">
          {/* Active Filters */}
          {(selectedSkills.length > 0 || selectedYear !== 'All Years' || selectedCategory !== 'All') && (
            <div className="mb-6 flex flex-wrap gap-2">
              {selectedSkills.map(skill => (
                <span
                  key={skill}
                  className="px-3 py-1.5 bg-[#E8EEF7] text-[#13294B] text-sm font-medium rounded-full flex items-center gap-2"
                >
                  {skill}
                  <button
                    onClick={() => setSelectedSkills(selectedSkills.filter(s => s !== skill))}
                    className="hover:text-[#B83E00]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {selectedYear !== 'All Years' && (
                <span className="px-3 py-1.5 bg-[#E8EEF7] text-[#13294B] text-sm font-medium rounded-full flex items-center gap-2">
                  {selectedYear}
                  <button
                    onClick={() => setSelectedYear('All Years')}
                    className="hover:text-[#B83E00]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
              {selectedCategory !== 'All' && (
                <span className="px-3 py-1.5 bg-[#E8EEF7] text-[#13294B] text-sm font-medium rounded-full flex items-center gap-2">
                  {selectedCategory}
                  <button
                    onClick={() => setSelectedCategory('All')}
                    className="hover:text-[#B83E00]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Results Count & Sort */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-[#64748B]">
              <span className="font-semibold text-[#0F172A]">{resultCount}</span> {resultCount === 1 ? 'student' : 'students'} found
              {discoveryQuery.isFetching && <span className="ml-2 text-[#B83E00]">Updating...</span>}
              {discoveryQuery.data?.matching?.mode === 'hybrid' && (
                <span className="ml-2 rounded-full bg-[#FFF3EA] px-2 py-0.5 text-xs text-[#9A3400]">
                  Includes related matches
                </span>
              )}
            </p>
            <label className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-[#0F172A] transition-colors hover:bg-[#F8FAFC]">
              Sort by:
              <select aria-label="Sort matches"
                value={ordering}
                onChange={(event) => {setPage(1); setOrdering(event.target.value);}}
                className="bg-transparent font-medium focus:outline-none"
              >
                <option value="best_match">Best Match</option>
                <option value="recently_active">Recently Active</option>
                <option value="highest_rated">Highest Rated</option>
                <option value="most_endorsed">Most Endorsed</option>
                <option value="newest_profiles">Newest Profiles</option>
                <option value="most_available">Most Available</option>
              </select>
              <ChevronDown className="w-4 h-4" />
            </label>
          </div>

          {/* Profile Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                reasonText={getReasonText(profile.matchReasons)}
                isSaved={savedActions.savedProfileIds.has(profile.id)}
                onToggleSave={() => toggleSave(profile.id)}
              />
            ))}
          </div>

          {discoveryQuery.data?.matching?.bounded && <p className="mt-4 text-sm text-[#475569]">Showing the top {discoveryQuery.data.matching.candidate_limit} matches. Add a filter to narrow things down.</p>}
          {(page > 1 || discoveryQuery.data?.next) && (
            <PageControls
              label="Discovery pages"
              pageText={`Page ${page}`}
              canPrevious={page > 1 && !discoveryQuery.isFetching}
              canNext={Boolean(discoveryQuery.data?.next) && !discoveryQuery.isFetching}
              onPrevious={() => setPage(p => p - 1)}
              onNext={() => setPage(p => p + 1)}
            />
          )}
          {discoveryQuery.isLoading && <p role="status" className="mt-4 text-sm text-[#475569]">Finding matches…</p>}
          {/* Empty State */}
          {filteredProfiles.length === 0 && !discoveryQuery.isLoading && !discoveryQuery.isError && (
            <EmptyState
              icon={Search}
              title="No matches yet"
              description="Try a broader skill or clear your filters"
              action={{
                label: "Clear all filters",
                onClick: clearAllFilters
              }}
            />
          )}
          {filteredProfiles.length === 0 && !discoveryQuery.isLoading && !discoveryQuery.isError && (
            <div className="mt-4"><ColdStartPanel onPickSkill={(name) => { clearAllFilters(); setSearchQuery(name); }} /></div>
          )}
        </section>
      </div>
    </div>
  );
}
