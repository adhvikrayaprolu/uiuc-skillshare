import { useState } from 'react';
import { Search, Filter, ChevronDown, Sparkles, X, Info } from 'lucide-react';
import { allSkills } from '../data/mockData';
import { ProfileCard } from '../components/profiles/ProfileCard';
import { EmptyState } from '../components/ui/EmptyState';
import { useDiscoverySearch } from '../hooks/useDiscoverySearch';
import { useSavedProfileActions } from '../hooks/useSavedProfiles';
import { useToast } from '../components/ui/ToastProvider';
import { shouldUseMocks } from '../lib/api';

const quickCategories = [
  'Career',
  'Technical',
  'Design',
  'Research',
  'Startups',
  'Campus Life',
  'Project Collaboration',
];

export function DiscoveryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('All Years');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [savedProfiles, setSavedProfiles] = useState<number[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [openOnly, setOpenOnly] = useState(false);
  const [ordering, setOrdering] = useState('best_match');
  const [aiAssisted, setAiAssisted] = useState(true);
  const savedActions = useSavedProfileActions();
  const toast = useToast();

  const discoveryQuery = useDiscoverySearch({
    q: searchQuery || undefined,
    mode: aiAssisted && searchQuery.trim() ? 'semantic' : undefined,
    skills: selectedSkills.length ? selectedSkills.join(',') : undefined,
    category: selectedCategory === 'All' ? undefined : selectedCategory,
    year: selectedYear === 'All Years' ? undefined : selectedYear.toLowerCase(),
    open_to_connect: openOnly ? true : undefined,
    ordering,
  });

  const toggleSave = async (profileId: number) => {
    if (discoveryQuery.data?.isMock) {
      setSavedProfiles(prev =>
        prev.includes(profileId)
          ? prev.filter(id => id !== profileId)
          : [...prev, profileId]
      );
      toast.success(savedProfiles.includes(profileId) ? 'Profile unsaved.' : 'Profile saved.');
      return;
    }
    try {
      const saved = await savedActions.toggleSaved(profileId);
      toast.success(saved ? 'Profile saved.' : 'Profile unsaved.');
    } catch {
      toast.error('Could not update saved profile.');
    }
  };

  const filteredProfiles = discoveryQuery.data?.profiles ?? [];
  const resultCount = discoveryQuery.data?.count ?? filteredProfiles.length;
  const aiEnabled = Boolean(aiAssisted && searchQuery.trim());

  const getRelevanceLabel = (index: number) => {
    if (!aiEnabled) return undefined;
    if (index === 0) return 'Top AI Match';
    if (index <= 2) return 'Strong Relevance';
    return 'Relevant';
  };

  const getReasonText = (reasons?: string[]) => {
    if (!searchQuery.trim() || !reasons?.length) return undefined;
    return reasons.slice(0, 2).join(' + ');
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedSkills([]);
    setSelectedYear('All Years');
    setSelectedCategory('All');
    setOpenOnly(false);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-bold text-[#0F172A] mb-2">Discover Students</h1>
        <p className="text-[#64748B]">Find peers by skill, experience, interest, availability, or background</p>
      </div>

      {discoveryQuery.isError && !shouldUseMocks() && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load discovery results. Check that the API is running and you are signed in.
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B] w-5 h-5" />
          <input
            type="text"
            placeholder="Search resume help, Figma, startup advice, GitHub, research, project collaborators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-white border-2 border-[#E2E8F0] rounded-2xl text-[15px] focus:outline-none focus:border-[#13294B] transition-colors"
          />
        </div>
        <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#0F172A]">
            <input type="checkbox" checked={aiAssisted} onChange={(e) => setAiAssisted(e.target.checked)} />
            <Sparkles className="h-3.5 w-3.5 text-[#FF5F05]" />
            AI-assisted discovery
          </label>
          <p className="mt-2 text-xs text-[#64748B]">
            {aiAssisted
              ? 'Search understands intent, not only exact keywords. Example: "resume help" can match Resume Review, LinkedIn Feedback, and Internship Search.'
              : 'Keyword/filter mode: matches exact terms and selected filters only.'}
          </p>
        </div>
      </div>

      {/* Quick Category Chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {quickCategories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(selectedCategory === category ? 'All' : category)}
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

      <div className="flex gap-6">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="hidden"
          aria-label="Toggle filters"
        />
        {/* Filter Sidebar */}
        {showFilters && (
          <aside className="w-72 flex-shrink-0">
            <div className="sticky top-6 rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <div className="mb-5 flex items-center justify-between">
                <h3 className="font-semibold text-[#0F172A] flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filters
                </h3>
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-[#FF5F05] hover:underline"
                >
                  Clear all
                </button>
              </div>

              {/* Year Filter */}
              <div className="mb-5">
                <label className="mb-2 block text-sm font-semibold text-[#0F172A]">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-sm focus:border-[#13294B] focus:outline-none"
                >
                  <option>All Years</option>
                  <option>Freshman</option>
                  <option>Sophomore</option>
                  <option>Junior</option>
                  <option>Senior</option>
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
                    onChange={(e) => setOpenOnly(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E2E8F0] text-[#13294B] focus:ring-[#13294B]"
                  />
                  <span className="text-sm font-semibold text-[#0F172A]">Open to Connect Only</span>
                </label>
              </div>
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1">
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
                    className="hover:text-[#FF5F05]"
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
                    className="hover:text-[#FF5F05]"
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
                    className="hover:text-[#FF5F05]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              )}
            </div>
          )}

          {/* Results Count & Sort */}
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm text-[#64748B]">
              <span className="font-semibold text-[#0F172A]">{resultCount}</span> {resultCount === 1 ? 'student' : 'students'} found
              {discoveryQuery.isFetching && <span className="ml-2 text-[#FF5F05]">Updating...</span>}
              {discoveryQuery.data?.ai?.enabled && (
                <span className="ml-2 rounded-full bg-[#FFF3EA] px-2 py-0.5 text-xs text-[#C2410C]">
                  AI mode
                </span>
              )}
            </p>
            <label className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-[#0F172A] transition-colors hover:bg-[#F8FAFC]">
              Sort by:
              <select
                value={ordering}
                onChange={(event) => setOrdering(event.target.value)}
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

          {searchQuery.trim() && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-xs text-[#334155]">
              <Info className="h-3.5 w-3.5 text-[#64748B]" />
              {aiAssisted
                ? 'Using AI-assisted discovery to rank profiles by intent, skills, and profile context.'
                : 'Using keyword and filter search.'}
            </div>
          )}

          {/* Profile Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredProfiles.map((profile, index) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                relevanceLabel={getRelevanceLabel(index)}
                reasonText={getReasonText(profile.matchReasons)}
                isSaved={discoveryQuery.data?.isMock ? savedProfiles.includes(profile.id) : savedActions.savedProfileIds.has(profile.id)}
                onToggleSave={() => toggleSave(profile.id)}
              />
            ))}
          </div>

          {/* Empty State */}
          {filteredProfiles.length === 0 && (
            <EmptyState
              icon={Search}
              title="No matching students found"
              description="Try changing your filters or searching for a broader skill"
              action={{
                label: "Clear all filters",
                onClick: clearAllFilters
              }}
            />
          )}
        </main>
      </div>
    </div>
  );
}
