import { useParams, Link, useLocation } from 'react-router-dom';
import { MapPin, Clock, Star, Bookmark, Mail, Linkedin, Github, ExternalLink, ArrowLeft } from 'lucide-react';
import { mockProfiles } from '../data/mockData';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { InitialsAvatar } from '../components/ui/InitialsAvatar';
import { SkillChip } from '../components/ui/SkillChip';
import { InsightChips } from '../lib/profileInsightBadges';
import { profileInsightLabels } from '../lib/profileInsightLabels';
import { HelpRequestModal } from '../components/modals/HelpRequestModal';
import { useContactClick, useProfile, useSimilarProfiles } from '../hooks/useProfile';
import { useCreateHelpRequest } from '../hooks/useHelpRequests';
import { useSavedProfileActions } from '../hooks/useSavedProfiles';
import { useTaxonomy } from '../hooks/useTaxonomy';
import { useToast } from '../components/ui/ToastProvider';
import { shouldUseMocks } from '../lib/api';
import type { ContactMethodType } from '../types/api';
import { createEndorsement, createReview, getEndorsements, getReviews } from '../lib/interactionsApi';
import { useCurrentProfile } from '../hooks/useProfileEditor';

export function ProfileDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const myProfileQuery = useCurrentProfile();
  const fallbackProfile = mockProfiles.find(p => p.id === Number(id)) || mockProfiles[0];
  const profileQuery = useProfile(id);
  const similarQuery = useSimilarProfiles(id);
  const taxonomy = useTaxonomy();
  const contactClickMutation = useContactClick();
  const createHelpRequestMutation = useCreateHelpRequest();
  const savedActions = useSavedProfileActions();
  const toast = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [showHelpRequest, setShowHelpRequest] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showEndorseForm, setShowEndorseForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [endorseSkill, setEndorseSkill] = useState<number | ''>('');
  const [endorseNote, setEndorseNote] = useState('');
  const profile = profileQuery.data?.profile ?? fallbackProfile;
  const profileId = Number(id || profile.id);
  const isOwnProfile = !shouldUseMocks() && myProfileQuery.data?.id === profileId;

  const reviewsQuery = useQuery({
    queryKey: ['profile-reviews', profileId],
    queryFn: () => getReviews(profileId),
    enabled: !shouldUseMocks() && Boolean(profileId),
  });
  const endorsementsQuery = useQuery({
    queryKey: ['profile-endorsements', profileId],
    queryFn: () => getEndorsements(profileId),
    enabled: !shouldUseMocks() && Boolean(profileId),
  });
  const reviewMutation = useMutation({
    mutationFn: () => createReview(profileId, { rating: reviewRating, comment: reviewComment }),
    onSuccess: async () => {
      await reviewsQuery.refetch();
      setShowReviewForm(false);
      setReviewComment('');
      setReviewRating(5);
      toast.success('Review submitted.');
    },
    onError: () => toast.error('Could not submit review.'),
  });
  const endorsementMutation = useMutation({
    mutationFn: () => createEndorsement(profileId, { skill: endorseSkill || undefined, note: endorseNote || undefined }),
    onSuccess: async () => {
      await endorsementsQuery.refetch();
      setShowEndorseForm(false);
      setEndorseSkill('');
      setEndorseNote('');
      toast.success('Endorsement submitted.');
    },
    onError: () => toast.error('Could not submit endorsement.'),
  });

  useEffect(() => {
    if (location.hash !== '#contact') return;
    const el = document.getElementById('contact');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  if (!shouldUseMocks() && profileQuery.isError) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center">
        <h1 className="mb-2 text-xl font-semibold text-[#0F172A]">Profile could not be loaded</h1>
        <p className="mb-6 text-[#64748B]">Check that you are signed in and the profile exists.</p>
        <Link to="/discover" className="text-sm font-medium text-[#13294B] hover:text-[#FF5F05]">
          ← Back to Discover
        </Link>
      </div>
    );
  }
  const similarProfiles =
    !shouldUseMocks() && similarQuery.isError
      ? []
      : similarQuery.data?.profiles ?? mockProfiles.filter((p) => p.id !== profile.id).slice(0, 3);
  const isProfileSaved = profileQuery.data?.isMock ? isSaved : savedActions.savedProfileIds.has(profile.id);

  const handleToggleSave = async () => {
    if (profileQuery.data?.isMock) {
      setIsSaved(!isSaved);
      toast.success(isSaved ? 'Profile unsaved.' : 'Profile saved.');
      return;
    }
    try {
      const saved = await savedActions.toggleSaved(profile.id);
      toast.success(saved ? 'Profile saved.' : 'Profile unsaved.');
    } catch {
      toast.error('Could not update saved profile.');
    }
  };

  const contactHref = (type: string, value: string) => {
    if (type === 'email') return `mailto:${value}`;
    if (type === 'phone') return `tel:${value}`;
    if (/^https?:\/\//i.test(value)) return value;
    return `https://${value}`;
  };

  const handleContactClick = (contactId?: number) => {
    if (contactId) {
      contactClickMutation.mutate({ profileId: profile.id, contactMethodId: contactId });
    }
    toast.info('Opening contact method.');
  };

  const reviewRows =
    shouldUseMocks() || !reviewsQuery.data
      ? (profile.reviews || []).map((review) => ({
          id: review.id,
          reviewer_name: review.reviewer,
          reviewer_profile_id: null,
          rating: review.rating,
          comment: review.comment,
          created_at: review.date,
        }))
      : reviewsQuery.data;
  const endorsementRows = shouldUseMocks() || !endorsementsQuery.data ? [] : endorsementsQuery.data;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back Button */}
      <Link
        to="/discover"
        className="inline-flex items-center gap-2 text-sm text-[#64748B] hover:text-[#13294B] mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Discover
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Header */}
          <div className="bg-white rounded-2xl p-8 border border-[#E2E8F0]">
            <div className="flex items-start gap-6 mb-6">
              <InitialsAvatar name={profile.name} size="xl" />
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h1 className="text-3xl font-bold text-[#0F172A] mb-1">{profile.name}</h1>
                    <p className="text-[#64748B] mb-3">{profile.major} · {profile.year}</p>
                  </div>
                  <button
                    onClick={handleToggleSave}
                    className={`p-3 rounded-xl transition-colors ${
                      isProfileSaved
                        ? 'bg-[#FF5F05] text-white'
                        : 'bg-[#F8FAFC] text-[#64748B] hover:bg-[#E8EEF7]'
                    }`}
                  >
                    <Bookmark className="w-5 h-5" fill={isProfileSaved ? 'currentColor' : 'none'} />
                  </button>
                </div>

                <p className="text-[#0F172A] mb-4">{profile.headline}</p>

                <div className="flex flex-col gap-2">
                  <InsightChips labels={profileInsightLabels(profile)} />
                  {profile.location && (
                    <div className="flex items-center gap-1.5 text-sm text-[#64748B]">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Match Reasons */}
            {profile.matchReasons && profile.matchReasons.length > 0 && (
              <div className="pt-4 border-t border-[#E2E8F0]">
                <h3 className="text-sm font-semibold text-[#0F172A] mb-2">Why this match</h3>
                <div className="space-y-1">
                  {profile.matchReasons.map((reason, idx) => (
                    <p key={idx} className="text-sm text-[#64748B]">• {reason}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* About */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
            <h2 className="text-xl font-semibold text-[#0F172A] mb-4">About</h2>
            <p className="text-[#64748B] leading-relaxed mb-4">{profile.bio}</p>
            {profile.interests && profile.interests.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-[#0F172A] mb-2">Interests</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, idx) => (
                    <span key={idx} className="px-3 py-1 bg-[#F8FAFC] text-[#0F172A] text-sm rounded-lg">
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Skills & Experiences */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
            <h2 className="text-xl font-semibold text-[#0F172A] mb-4">Skills & Experiences</h2>
            <div className="space-y-4">
              {profile.skills.map((skill, idx) => (
                <div key={idx} className="flex items-start justify-between py-3 border-b border-[#E2E8F0] last:border-0">
                  <div>
                    <h3 className="font-medium text-[#0F172A] mb-1">{skill.name}</h3>
                    <p className="text-sm text-[#64748B]">{skill.category}</p>
                    {skill.description && <p className="text-sm text-[#64748B] mt-1">{skill.description}</p>}
                  </div>
                  {skill.confidence && (
                    <span className="px-3 py-1 bg-[#E8EEF7] text-[#13294B] text-xs font-medium rounded-full">
                      {skill.confidence}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
            <h2 className="text-xl font-semibold text-[#0F172A] mb-4">Availability</h2>
            <div className="flex flex-wrap gap-2">
              {profile.availability.map((avail, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-[#F8FAFC] rounded-lg">
                  <Clock className="w-4 h-4 text-[#64748B]" />
                  <span className="text-sm text-[#0F172A]">{avail.day} · {avail.timeBlock}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews & Endorsements */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold text-[#0F172A]">Reviews & Endorsements</h2>
              {!isOwnProfile && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReviewForm((cur) => !cur)}
                    className="rounded-lg border border-[#13294B] px-3 py-1.5 text-xs font-medium text-[#13294B] hover:bg-[#E8EEF7]"
                  >
                    Add Review
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowEndorseForm((cur) => !cur)}
                    className="rounded-lg border border-[#13294B] px-3 py-1.5 text-xs font-medium text-[#13294B] hover:bg-[#E8EEF7]"
                  >
                    Endorse Skill
                  </button>
                </div>
              )}
            </div>

            {showReviewForm && !shouldUseMocks() && (
              <div className="mb-4 space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-[#0F172A]">Rating</label>
                  <select
                    value={reviewRating}
                    onChange={(event) => setReviewRating(Number(event.target.value))}
                    className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-sm"
                  >
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <option key={rating} value={rating}>
                        {rating}
                      </option>
                    ))}
                  </select>
                </div>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(event) => setReviewComment(event.target.value)}
                  placeholder="Share specific feedback..."
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={!reviewComment.trim() || reviewMutation.isPending}
                  onClick={() => reviewMutation.mutate()}
                  className="rounded-lg bg-[#13294B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a3a6b] disabled:opacity-60"
                >
                  Submit Review
                </button>
              </div>
            )}

            {showEndorseForm && !shouldUseMocks() && (
              <div className="mb-4 space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                <select
                  value={endorseSkill}
                  onChange={(event) => setEndorseSkill(event.target.value ? Number(event.target.value) : '')}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                >
                  <option value="">General endorsement</option>
                  {profile.skills.map((skill) => {
                    const mapped = (taxonomy.data?.rawSkills || []).find((row) => row.name === skill.name);
                    if (!mapped) return null;
                    return (
                      <option key={mapped.id} value={mapped.id}>
                        {skill.name}
                      </option>
                    );
                  })}
                </select>
                <textarea
                  rows={2}
                  value={endorseNote}
                  onChange={(event) => setEndorseNote(event.target.value)}
                  placeholder="Optional endorsement note..."
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  disabled={endorsementMutation.isPending}
                  onClick={() => endorsementMutation.mutate()}
                  className="rounded-lg bg-[#13294B] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#1a3a6b] disabled:opacity-60"
                >
                  Submit Endorsement
                </button>
              </div>
            )}

            <div className="space-y-4">
              {reviewRows.map((review) => (
                <div key={review.id} className="pb-4 border-b border-[#E2E8F0] last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-4 h-4"
                          fill={i < review.rating ? '#FF5F05' : 'none'}
                          stroke={i < review.rating ? '#FF5F05' : '#E2E8F0'}
                        />
                      ))}
                    </div>
                    {review.reviewer_profile_id ? (
                      <Link to={`/profiles/${review.reviewer_profile_id}`} className="text-sm font-medium text-[#13294B] hover:underline">
                        {review.reviewer_name || 'Verified student'}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-[#0F172A]">{review.reviewer_name || 'Verified student'}</span>
                    )}
                    <span className="text-xs text-[#64748B]">· {review.created_at?.slice(0, 10)}</span>
                  </div>
                  <p className="text-sm text-[#64748B]">{review.comment}</p>
                </div>
              ))}
              {reviewRows.length === 0 && <p className="text-sm text-[#64748B]">No reviews yet.</p>}
            </div>

            {endorsementRows.length > 0 && (
              <div className="mt-4 border-t border-[#E2E8F0] pt-4">
                <p className="mb-2 text-sm font-semibold text-[#0F172A]">Recent endorsements</p>
                <div className="space-y-2">
                  {endorsementRows.slice(0, 4).map((endorsement) => (
                    <p key={endorsement.id} className="text-sm text-[#64748B]">
                      <span className="font-medium text-[#0F172A]">{endorsement.endorser_name}</span>
                      {endorsement.skill_name ? ` endorsed ${endorsement.skill_name}` : ' left a general endorsement'}
                      {endorsement.note ? ` — ${endorsement.note}` : ''}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Similar Profiles */}
          <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
            <h2 className="text-xl font-semibold text-[#0F172A] mb-4">Similar Profiles</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {similarProfiles.map((p) => (
                <Link
                  key={p.id}
                  to={`/profiles/${p.id}`}
                  className="p-4 bg-[#F8FAFC] rounded-xl hover:bg-[#E8EEF7] transition-colors"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <InitialsAvatar name={p.name} size="md" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm text-[#0F172A] truncate">{p.name}</h3>
                      <p className="text-xs text-[#64748B]">{p.year}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.skills.slice(0, 2).map((skill, i) => (
                      <SkillChip key={i} skill={skill.name} className="bg-white" />
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Contact Panel (Sticky) */}
        <div className="lg:col-span-1">
          <div id="contact" className="bg-white rounded-2xl p-6 border border-[#E2E8F0] sticky top-6">
            <h3 className="text-lg font-semibold text-[#0F172A] mb-4">Contact Information</h3>

            {/* Preferred Contact */}
            <div className="mb-4">
              <p className="text-xs text-[#64748B] mb-2">Preferred Contact Method</p>
              {profile.contacts.find(c => c.preferred) && (
                <div className="flex items-center gap-2 p-3 bg-[#E8EEF7] rounded-lg">
                  <Mail className="w-4 h-4 text-[#13294B]" />
                  <span className="text-sm font-medium text-[#13294B]">Email</span>
                </div>
              )}
            </div>

            {/* Contact Methods */}
            <div className="space-y-2 mb-6">
              {profile.contacts.filter(c => c.visibility === 'public').map((contact, idx) => (
                <a
                  key={idx}
                  href={contactHref(contact.type, contact.value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleContactClick(contact.id)}
                  className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg hover:bg-[#E8EEF7] transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    {contact.type === 'email' && <Mail className="w-4 h-4 text-[#64748B]" />}
                    {contact.type === 'linkedin' && <Linkedin className="w-4 h-4 text-[#64748B]" />}
                    {contact.type === 'github' && <Github className="w-4 h-4 text-[#64748B]" />}
                    <span className="text-sm text-[#0F172A]">
                      {contact.type.charAt(0).toUpperCase() + contact.type.slice(1)}
                    </span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#64748B] group-hover:text-[#13294B]" />
                </a>
              ))}
            </div>

            {/* Credentials */}
            {profile.credentials.filter(c => c.visibility === 'public').length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-[#64748B] mb-2">Credentials</p>
                <div className="space-y-2">
                  {profile.credentials.filter(c => c.visibility === 'public').map((cred, idx) => {
                    const href = cred.url && cred.url !== '#' ? cred.url : null;
                    const label = (
                      <>
                        <span className="font-medium">{cred.title}</span>
                        <span className="text-[#64748B]"> · {cred.type}</span>
                      </>
                    );
                    const className =
                      'flex items-center justify-between p-3 bg-[#F8FAFC] rounded-lg hover:bg-[#E8EEF7] transition-colors group';
                    return href ? (
                      <a
                        key={idx}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={className}
                      >
                        <span className="text-sm text-[#0F172A]">{label}</span>
                        <ExternalLink className="w-4 h-4 text-[#64748B] group-hover:text-[#13294B]" />
                      </a>
                    ) : (
                      <div key={idx} className={className}>
                        <span className="text-sm text-[#0F172A]">{label}</span>
                        <span className="text-xs text-[#64748B]">No link</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => setShowHelpRequest(true)}
                className="w-full px-4 py-3 bg-[#FF5F05] text-white font-medium rounded-xl hover:bg-[#e55505] transition-colors"
              >
                Send Help Request
              </button>
              <button
                onClick={async () => {
                  const email = profile.contacts.find((contact) => contact.type === 'email')?.value;
                  if (!email) {
                    toast.error('No public email is available.');
                    return;
                  }
                  await navigator.clipboard.writeText(email);
                  toast.success('Email copied.');
                }}
                className="w-full px-4 py-3 border-2 border-[#13294B] text-[#13294B] font-medium rounded-xl hover:bg-[#E8EEF7] transition-colors"
              >
                Copy Email
              </button>
            </div>

            {/* Privacy Note */}
            <div className="mt-4 p-3 bg-[#E8EEF7] rounded-lg">
              <p className="text-xs text-[#13294B]">
                <strong>Privacy:</strong> Only contact methods this student chose to share are visible
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Help Request Modal */}
      <HelpRequestModal
        isOpen={showHelpRequest}
        onClose={() => setShowHelpRequest(false)}
        recipientName={profile.name}
        recipientSkills={profile.skills.map(s => s.name)}
        isSubmitting={createHelpRequestMutation.isPending}
        onSubmitRequest={async (payload) => {
          try {
            const rawSkills = taxonomy.data?.rawSkills ?? [];
            const skillMatch = payload.relatedSkill
              ? rawSkills.find((s) => s.name === payload.relatedSkill)
              : undefined;
            await createHelpRequestMutation.mutateAsync({
              helper_profile: profile.id,
              topic: payload.topic,
              message: payload.message,
              urgency: payload.urgency,
              preferred_contact_method: payload.preferredContactMethod as ContactMethodType,
              ...(skillMatch ? { related_skill: skillMatch.id } : {}),
            });
            toast.success('Help request sent.');
          } catch {
            toast.error('Could not send help request.');
            throw new Error('help request failed');
          }
        }}
      />
    </div>
  );
}
