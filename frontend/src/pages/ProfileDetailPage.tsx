import {submissionKey as createSubmissionKey} from '../lib/idempotency';
import { useParams, Link, useLocation } from 'react-router-dom';
import { MapPin, Clock, Star, Bookmark, Mail, Linkedin, Github, ExternalLink, ArrowLeft, ArrowLeftRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { InitialsAvatar } from '../components/ui/InitialsAvatar';
import { SkillChip } from '../components/ui/SkillChip';
import { InsightChips } from '../lib/profileInsightBadges';
import { profileInsightLabels } from '../lib/profileInsightLabels';
import { RequestModal } from '../components/modals/RequestModal';
import { ReportDialog } from '../components/modals/ReportDialog';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useContactClick, useProfile, useSimilarProfiles } from '../hooks/useProfile';
import { useCreateHelpRequest } from '../hooks/useHelpRequests';
import { useSavedProfileActions } from '../hooks/useSavedProfiles';
import { useTaxonomy } from '../hooks/useTaxonomy';
import { useToast } from '../components/ui/ToastProvider';
import { api } from '../lib/api';
import type { ContactMethodType, RequestKind } from '../types/api';
import { getEndorsements, getReviews } from '../lib/interactionsApi';
import { useCurrentProfile } from '../hooks/useProfileEditor';

export function ProfileDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const myProfileQuery = useCurrentProfile();
  const [submissionKey, setSubmissionKey] = useState(() => createSubmissionKey());
  const queryClient = useQueryClient();
  const profileQuery = useProfile(id);
  const similarQuery = useSimilarProfiles(id);
  const taxonomy = useTaxonomy();
  const contactClickMutation = useContactClick();
  const createHelpRequestMutation = useCreateHelpRequest();
  const savedActions = useSavedProfileActions();
  const toast = useToast();
  const [requestKind, setRequestKind] = useState<RequestKind | null>(null);
  const [safetyDialog, setSafetyDialog] = useState<'block' | 'report' | null>(null);
  const profileId = Number(id);
  const isOwnProfile = myProfileQuery.data?.id === profileId;

  const reviewsQuery = useQuery({
    queryKey: ['profile-reviews', profileId],
    queryFn: () => getReviews(profileId),
    enabled: Boolean(profileId),
  });
  const endorsementsQuery = useQuery({
    queryKey: ['profile-endorsements', profileId],
    queryFn: () => getEndorsements(profileId),
    enabled: Boolean(profileId),
  });
  useEffect(() => {
    if (location.hash !== '#contact') return;
    const el = document.getElementById('contact');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.hash]);

  if (!profileQuery.data && !profileQuery.isError) return <p role="status" className="p-6">Loading profile…</p>;

  if (!profileQuery.data) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center">
        <h1 className="mb-2 text-xl font-semibold text-[#0F172A]">Profile could not be loaded</h1>
        <p className="mb-6 text-[#64748B]">Check that you are signed in and the profile exists.</p>
        <Link to="/discover" className="text-sm font-medium text-[#13294B] hover:text-[#B83E00]">
          ← Back to Discover
        </Link>
      </div>
    );
  }
  const profile = profileQuery.data.profile;
  const similarProfiles = similarQuery.isError ? [] : similarQuery.data?.profiles ?? [];
  const isProfileSaved = savedActions.savedProfileIds.has(profile.id);

  const handleToggleSave = async () => {
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
    !reviewsQuery.data
      ? (profile.reviews || []).map((review) => ({
          id: review.id,
          reviewer_name: review.reviewer,
          reviewer_profile_id: null,
          rating: review.rating,
          comment: review.comment,
          created_at: review.date,
        }))
      : reviewsQuery.data;
  const endorsementRows = endorsementsQuery.data ?? [];
  const swap = profileQuery.data?.raw?.swap ?? null;
  const wantsToLearn = profileQuery.data?.raw?.wants_to_learn ?? [];
  const mySkillNames = (myProfileQuery.data?.profile_skills ?? []).map((row) => row.skill_detail?.name).filter((name): name is string => Boolean(name));
  const canRequest = !isOwnProfile && profile.openToConnect;

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
          <div className="bg-white rounded-2xl p-4 sm:p-8 border border-[#E2E8F0]">
            <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
              <InitialsAvatar src={profileQuery.data?.raw?.profile_picture || undefined} name={profile.name} size="xl" />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h1 className="text-3xl font-bold text-[#0F172A] mb-1">{profile.name}</h1>
                    <p className="text-[#64748B] mb-3">{profile.major} · {profile.year}</p>
                  </div>
                  <button
                    onClick={handleToggleSave}
                    aria-label={isProfileSaved ? `Unsave ${profile.name}` : `Save ${profile.name}`}
                    aria-pressed={isProfileSaved}
                    className={`p-3 rounded-xl transition-colors ${
                      isProfileSaved
                        ? 'bg-[#B83E00] text-white'
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

            {swap?.is_mutual && (
              <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#FF5F05]/30 bg-[#FFF3EA] p-4">
                <ArrowLeftRight className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#B83E00]" aria-hidden="true" />
                <p className="text-sm text-[#0F172A]">
                  <span className="font-semibold">Swap match.</span> {profile.name.split(' ')[0]} can teach you {swap.they_teach_you.map((s) => s.name).join(', ')}, and wants to learn {swap.you_can_teach.map((s) => s.name).join(', ')}, which you teach.
                </p>
              </div>
            )}

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

          {wantsToLearn.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0]">
              <h2 className="text-xl font-semibold text-[#0F172A] mb-4">Wants to learn</h2>
              <div className="flex flex-wrap gap-2">
                {wantsToLearn.map((skill) => (
                  <SkillChip key={skill.id} skill={skill.name} variant={swap?.you_can_teach.some((row) => row.id === skill.id) ? 'featured' : 'default'} />
                ))}
              </div>
              {swap && swap.you_can_teach.length > 0 && <p className="mt-3 text-sm text-[#475569]">Highlighted skills are ones you teach.</p>}
            </div>
          )}

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
            </div>

            <p className="mb-3 text-sm text-[#475569]">Feedback comes from completed requests and swaps, not independent verification of expertise. {!isOwnProfile && <>Worked with {profile.name.split(' ')[0]}? Leave feedback from the request in <Link to="/requests?tab=needs_action" className="font-medium text-[#13294B] underline">Requests</Link>.</>}</p>
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
                        {review.reviewer_name || 'Student'}
                      </Link>
                    ) : (
                      <span className="text-sm font-medium text-[#0F172A]">{review.reviewer_name || 'Student'}</span>
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

            {!profile.contacts.length && <p className="mb-4 text-sm text-[#475569]">Selected contacts are shared after a request is accepted, when this member consents.</p>}
            {!isOwnProfile && profileQuery.data?.raw?.user_id && (
              <div className="mb-4 flex gap-4 text-sm">
                <button type="button" className="text-[#13294B] underline hover:text-[#B83E00]" onClick={() => setSafetyDialog('block')}>Block member</button>
                <button type="button" className="text-[#13294B] underline hover:text-[#B83E00]" onClick={() => setSafetyDialog('report')}>Report member</button>
              </div>
            )}

            {/* Preferred Contact */}
            <div className="mb-4">
              <p className="text-xs text-[#64748B] mb-2">Preferred Contact Method</p>
              {profile.contacts.find(c => c.preferred) && (
                <div className="flex items-center gap-2 p-3 bg-[#E8EEF7] rounded-lg">
                  <Mail className="w-4 h-4 text-[#13294B]" />
                  <span className="text-sm font-medium text-[#13294B]">{profile.contacts.find(c => c.preferred)?.type}</span>
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
              {canRequest && (swap?.is_mutual ? (
                <>
                  <button type="button" onClick={() => setRequestKind('swap')} className="w-full rounded-xl bg-[#B83E00] px-4 py-3 font-medium text-white transition-colors hover:bg-[#9A3412]">Propose a swap</button>
                  <button type="button" onClick={() => setRequestKind('help')} className="w-full rounded-xl border-2 border-[#13294B] px-4 py-3 font-medium text-[#13294B] transition-colors hover:bg-[#E8EEF7]">Just ask for help</button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => setRequestKind('help')} className="w-full rounded-xl bg-[#B83E00] px-4 py-3 font-medium text-white transition-colors hover:bg-[#9A3412]">Ask for help</button>
                  {mySkillNames.length > 0 && <button type="button" onClick={() => setRequestKind('swap')} className="w-full text-sm font-medium text-[#13294B] underline hover:text-[#B83E00]">Offer a swap instead</button>}
                </>
              ))}
              {!isOwnProfile && !profile.openToConnect && <p className="rounded-xl bg-[#F8FAFC] p-3 text-sm text-[#475569]">{profile.name.split(' ')[0]} isn't taking new requests right now.</p>}
              {isOwnProfile && <Link to="/me/edit" className="block w-full rounded-xl border-2 border-[#13294B] px-4 py-3 text-center font-medium text-[#13294B] hover:bg-[#E8EEF7]">Edit your profile</Link>}
              {profile.contacts.some(contact => contact.type === 'email') && <button
                type="button"
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
              </button>}
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

      <ConfirmDialog
        open={safetyDialog === 'block'}
        tone="danger"
        title={`Block ${profile.name}?`}
        description={<>
          <p className="mb-2">You won't see each other in Discover or on profiles, and neither of you can send the other a request.</p>
          <p>Any open requests between you are cancelled. You can unblock them later in Settings.</p>
        </>}
        confirmLabel="Block"
        onCancel={() => setSafetyDialog(null)}
        onConfirm={async () => {
          try {
            await api.post('/blocked-users/', { blocked_user: profileQuery.data?.raw?.user_id });
            setSafetyDialog(null);
            await queryClient.invalidateQueries();
            toast.success('Member blocked.');
          } catch {
            toast.error('Could not block this member.');
          }
        }}
      />
      <ReportDialog
        open={safetyDialog === 'report'}
        subjectName={profile.name}
        onClose={() => setSafetyDialog(null)}
        onSubmit={async ({ reason, description }) => {
          await api.post('/reports/', { reported_profile: profileId, reason, description });
          toast.success('Report sent to moderators.');
        }}
      />

      {/* Help Request Modal */}
      <RequestModal
        isOpen={requestKind !== null}
        initialKind={requestKind ?? 'help'}
        onClose={() => setRequestKind(null)}
        recipientName={profile.name}
        recipientSkills={profile.skills.map(s => s.name)}
        offerSkills={mySkillNames}
        suggestedLearn={requestKind === 'swap' ? swap?.they_teach_you[0]?.name : undefined}
        suggestedOffer={swap?.you_can_teach[0]?.name}
        isSubmitting={createHelpRequestMutation.isPending}
        onSubmitRequest={async (payload) => {
          const rawSkills = taxonomy.data?.rawSkills ?? [];
          const idFor = (name: string) => (name ? rawSkills.find((s) => s.name === name)?.id : undefined);
          const relatedSkill = idFor(payload.relatedSkill);
          const offeredSkill = payload.kind === 'swap' ? idFor(payload.offeredSkill) : undefined;
          try {
            await createHelpRequestMutation.mutateAsync({
              helper_profile: profile.id,
              idempotency_key: submissionKey,
              kind: payload.kind,
              topic: payload.topic,
              message: payload.message,
              urgency: payload.urgency,
              preferred_contact_method: payload.preferredContactMethod as ContactMethodType,
              ...(relatedSkill ? { related_skill: relatedSkill } : {}),
              ...(offeredSkill ? { offered_skill: offeredSkill } : {}),
            });
            setSubmissionKey(createSubmissionKey());
            toast.success(payload.kind === 'swap' ? 'Swap proposal sent.' : 'Help request sent.');
          } catch (error) {
            toast.error(payload.kind === 'swap' ? 'Could not send the swap proposal.' : 'Could not send help request.');
            throw error;
          }
        }}
      />
    </div>
  );
}
