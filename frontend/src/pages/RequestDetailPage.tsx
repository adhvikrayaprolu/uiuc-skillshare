import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowLeftRight, ExternalLink, Star } from 'lucide-react';
import { InitialsAvatar } from '../components/ui/InitialsAvatar';
import { RequestKindBadge, RequestStatusBadge } from '../components/requests/RequestBadges';
import { useToast } from '../components/ui/ToastProvider';
import { useHelpRequest, useUpdateHelpRequest } from '../hooks/useHelpRequests';
import { createEndorsement, createReview, type HelpRequestUpdate } from '../lib/interactionsApi';
import { contactHref, formatDate, requestErrorMessage, requestView, type RequestView } from '../lib/requests';
import type { HelpRequest, RequestFeedback } from '../types/api';

const panel = 'rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6';
const primary = 'rounded-xl bg-[#13294B] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a3a6b] disabled:opacity-60';
const secondary = 'rounded-xl border-2 border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#475569] transition-colors hover:border-[#B91C1C] hover:text-[#B91C1C] disabled:opacity-60';
const field = 'w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm focus:border-[#13294B] focus:outline-none focus:ring-2 focus:ring-[#13294B]/20';

export function RequestDetailPage() {
  const id = Number(useParams().id);
  const query = useHelpRequest(id);

  if (query.isLoading) return <p role="status" className="mx-auto max-w-3xl p-6 text-[#475569]">Loading request…</p>;
  if (query.isError || !query.data) {
    const missing = (query.error as { response?: { status?: number } } | null)?.response?.status === 404 || !Number.isFinite(id);
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center">
        <h1 className="mb-2 text-xl font-semibold text-[#0F172A]">{missing ? "This request isn't available" : "We couldn't load this request"}</h1>
        <p className="mb-6 text-[#475569]">{missing ? 'It may have been removed, or it belongs to someone else.' : 'Check your connection and try again.'}</p>
        <div className="flex justify-center gap-3">
          {!missing && <button type="button" onClick={() => query.refetch()} className={primary}>Try again</button>}
          <Link to="/requests" className="rounded-xl border-2 border-[#13294B] px-4 py-2 text-sm font-medium text-[#13294B] hover:bg-[#E8EEF7]">Back to requests</Link>
        </div>
      </div>
    );
  }
  return <RequestDetail request={query.data} />;
}

function RequestDetail({ request }: { request: HelpRequest }) {
  const view = requestView(request);
  const senderName = view.sent ? 'You' : view.peerFirstName;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link to="/requests" className="inline-flex items-center gap-2 text-sm font-medium text-[#13294B] hover:text-[#B83E00]">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to requests
      </Link>

      <header className={panel}>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <RequestKindBadge isSwap={view.isSwap} />
          <RequestStatusBadge status={request.status} />
          <span className="text-xs font-medium text-[#475569]">{view.sent ? 'You sent this' : 'You received this'}</span>
        </div>
        <h1 className="mb-4 break-words text-2xl font-bold text-[#0F172A] sm:text-3xl">{request.topic}</h1>
        <div className="flex items-center gap-3">
          <InitialsAvatar name={view.peerName} size="md" />
          <div className="min-w-0">
            <p className="text-xs text-[#64748B]">{view.sent ? 'To' : 'From'}</p>
            {view.peerProfileId
              ? <Link to={`/profiles/${view.peerProfileId}`} className="font-semibold text-[#13294B] hover:underline">{view.peerName}</Link>
              : <p className="font-semibold text-[#0F172A]">{view.peerName}</p>}
          </div>
        </div>
        {(view.youLearn || view.youTeach) && (
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl bg-[#F8FAFC] p-4 text-sm">
            <div><p className="text-xs text-[#64748B]">You learn</p><p className="font-semibold text-[#0F172A]">{view.youLearn ?? '—'}</p></div>
            {view.isSwap ? <ArrowLeftRight className="h-4 w-4 text-[#B83E00]" aria-hidden="true" /> : <span />}
            <div className="text-right"><p className="text-xs text-[#64748B]">You teach</p><p className="font-semibold text-[#0F172A]">{view.youTeach ?? '—'}</p></div>
          </div>
        )}
      </header>

      <section aria-labelledby="message-heading" className={panel}>
        <h2 id="message-heading" className="mb-2 text-sm font-semibold text-[#0F172A]">{senderName} wrote</h2>
        <p className="whitespace-pre-line break-words text-sm text-[#334155]">{request.message || 'No message.'}</p>
        {request.response_message && (
          <div className="mt-4 border-t border-[#E2E8F0] pt-4">
            <h3 className="mb-2 text-sm font-semibold text-[#0F172A]">{view.sent ? `${view.peerFirstName} replied` : 'Your reply'}</h3>
            <p className="whitespace-pre-line break-words text-sm text-[#334155]">{request.response_message}</p>
          </div>
        )}
      </section>

      <RequestActions key={`${request.id}-${request.version}`} request={request} view={view} />
      {(request.status === 'accepted' || request.status === 'completed') && <SharedContacts view={view} />}
      {request.status === 'completed' && request.feedback && <FeedbackPanel key={request.version} request={request} feedback={request.feedback} view={view} />}
      <Timeline request={request} view={view} />
    </div>
  );
}

function RequestActions({ request, view }: { request: HelpRequest; view: RequestView }) {
  const update = useUpdateHelpRequest();
  const toast = useToast();
  const [reply, setReply] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const run = async (payload: Omit<HelpRequestUpdate, 'version'>, success: string, fallback: string) => {
    setError('');
    try {
      await update.mutateAsync({ id: request.id, payload: { version: request.version, ...payload } });
      toast.success(success);
    } catch (caught) {
      setError(requestErrorMessage(caught, fallback));
    }
  };

  const canRespond = request.status === 'pending' && !view.sent;
  const canWithdraw = request.status === 'pending' && view.sent;
  const isAccepted = request.status === 'accepted';
  if (!canRespond && !canWithdraw && !isAccepted) {
    if (request.status === 'declined') return <p className={`${panel} text-sm text-[#475569]`}>{view.sent ? `${view.peerFirstName} declined this request.` : 'You declined this request.'}</p>;
    if (request.status === 'cancelled') return <p className={`${panel} text-sm text-[#475569]`}>This request was cancelled{request.cancel_reason ? `: “${request.cancel_reason}”` : '.'}</p>;
    return null;
  }

  const thing = view.isSwap ? 'swap' : 'request';
  return (
    <section aria-labelledby="actions-heading" className={panel}>
      <h2 id="actions-heading" className="mb-3 text-lg font-semibold text-[#0F172A]">
        {canRespond ? `Reply to ${view.peerFirstName}` : canWithdraw ? `Waiting for ${view.peerFirstName}` : 'Next step'}
      </h2>
      {error && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {canRespond && (
        <>
          <label htmlFor="reply" className="mb-1 block text-sm font-medium text-[#0F172A]">Reply <span className="font-normal text-[#64748B]">(optional)</span></label>
          <textarea id="reply" rows={3} maxLength={2000} value={reply} onChange={(event) => setReply(event.target.value)} className={`${field} mb-2`} placeholder="Suggest a time or say hello." />
          <p className="mb-4 text-xs text-[#64748B]">If you accept, you'll both see each other's shared contact details.</p>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={update.isPending} className={primary} onClick={() => run({ status: 'accepted', response_message: reply.trim() }, view.isSwap ? 'Swap accepted.' : 'Request accepted.', 'Could not accept this request.')}>Accept</button>
            <button type="button" disabled={update.isPending} className={secondary} onClick={() => run({ status: 'declined', response_message: reply.trim() }, 'Request declined.', 'Could not decline this request.')}>Decline</button>
          </div>
        </>
      )}

      {canWithdraw && <p className="mb-4 text-sm text-[#475569]">{view.peerFirstName} hasn't replied yet. You'll get a notification when they do.</p>}
      {isAccepted && (
        <>
          <p className="mb-4 text-sm text-[#475569]">Use the contact details below to meet up. When you're done, mark it complete so you can both leave feedback.</p>
          <button type="button" disabled={update.isPending} className={`${primary} mb-4 mr-3`} onClick={() => run({ status: 'completed' }, 'Marked complete.', 'Could not mark this complete.')}>Mark complete</button>
        </>
      )}

      {(canWithdraw || isAccepted) && (cancelling ? (
        <form
          className="mt-2 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
          onSubmit={(event) => { event.preventDefault(); void run({ status: 'cancelled', cancel_reason: reason.trim() }, canWithdraw ? 'Request withdrawn.' : `${view.isSwap ? 'Swap' : 'Request'} cancelled.`, 'Could not cancel this request.'); }}
        >
          <label htmlFor="cancel-reason" className="mb-1 block text-sm font-medium text-[#0F172A]">Reason <span className="font-normal text-[#64748B]">(optional, shared with {view.peerFirstName})</span></label>
          <textarea id="cancel-reason" rows={2} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)} className={`${field} mb-3`} />
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={update.isPending} className="rounded-xl bg-[#B91C1C] px-4 py-2 text-sm font-medium text-white hover:bg-[#991B1B] disabled:opacity-60">{canWithdraw ? 'Withdraw request' : `Cancel ${thing}`}</button>
            <button type="button" className="rounded-xl px-4 py-2 text-sm font-medium text-[#13294B] hover:bg-[#E8EEF7]" onClick={() => setCancelling(false)}>Keep it</button>
          </div>
        </form>
      ) : (
        <button type="button" className={secondary} onClick={() => setCancelling(true)}>{canWithdraw ? 'Withdraw request…' : `Cancel ${thing}…`}</button>
      ))}
    </section>
  );
}

function SharedContacts({ view }: { view: RequestView }) {
  return (
    <section aria-labelledby="contacts-heading" className={panel}>
      <h2 id="contacts-heading" className="mb-3 text-lg font-semibold text-[#0F172A]">{view.peerFirstName}'s contact details</h2>
      {view.contacts.length ? (
        <ul className="space-y-2">
          {view.contacts.map((contact) => (
            <li key={contact.id}>
              <a href={contactHref(contact.type, contact.value)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-xl bg-[#F8FAFC] p-3 text-sm hover:bg-[#E8EEF7]">
                <span className="min-w-0"><span className="block text-xs capitalize text-[#64748B]">{contact.label || contact.type}</span><span className="block break-all font-medium text-[#0F172A]">{contact.value}</span></span>
                <ExternalLink className="h-4 w-4 flex-shrink-0 text-[#64748B]" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[#475569]">{view.peerFirstName} hasn't shared a contact method. Reply here or reach out through your Illinois email.</p>
      )}
    </section>
  );
}

function FeedbackPanel({ request, feedback, view }: { request: HelpRequest; feedback: RequestFeedback; view: RequestView }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [endorse, setEndorse] = useState(feedback.can_endorse);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const target = feedback.target_profile_id;
  const skill = feedback.skill;

  if (!target) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (feedback.can_review && (!rating || !comment.trim())) {
      setError(!rating ? 'Choose a rating from 1 to 5.' : 'Say a little about how it went.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      if (feedback.can_review) await createReview(target, { help_request: request.id, rating, comment: comment.trim(), related_skill: skill?.id ?? null });
      if (endorse && feedback.can_endorse && skill) await createEndorsement(target, { help_request: request.id, skill: skill.id });
      toast.success('Thanks for the feedback.');
      await queryClient.invalidateQueries();
    } catch (caught) {
      setError(requestErrorMessage(caught, 'Could not save your feedback.'));
      await queryClient.invalidateQueries({ queryKey: ['help-requests', 'detail', request.id] });
    } finally {
      setSubmitting(false);
    }
  };

  if (!feedback.can_review && !feedback.can_endorse) {
    return (
      <section aria-labelledby="feedback-heading" className={panel}>
        <h2 id="feedback-heading" className="mb-2 text-lg font-semibold text-[#0F172A]">Your feedback</h2>
        {feedback.my_review ? (
          <>
            <Stars value={feedback.my_review.rating} />
            <p className="mt-2 whitespace-pre-line text-sm text-[#334155]">{feedback.my_review.comment}</p>
          </>
        ) : <p className="text-sm text-[#475569]">Feedback for this request is closed.</p>}
        {feedback.endorsed && skill && <p className="mt-3 text-sm text-[#475569]">You endorsed {view.peerFirstName} for {skill.name}.</p>}
      </section>
    );
  }

  return (
    <section aria-labelledby="feedback-heading" className={`${panel} border-[#FF5F05]/40`}>
      <h2 id="feedback-heading" className="mb-1 text-lg font-semibold text-[#0F172A]">How did it go with {view.peerFirstName}?</h2>
      <p className="mb-4 text-sm text-[#475569]">Your review appears on {view.peerFirstName}'s profile and helps other students choose.</p>
      {error && <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <form onSubmit={submit} noValidate>
        {feedback.can_review && (
          <>
            <fieldset className="mb-4 min-w-0">
              <legend className="mb-2 text-sm font-medium text-[#0F172A]">Rating</legend>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <label key={value} className="cursor-pointer rounded-lg p-1 focus-within:ring-2 focus-within:ring-[#13294B]">
                    <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => { setRating(value); setError(''); }} className="sr-only" />
                    <span className="sr-only">{value} {value === 1 ? 'star' : 'stars'}</span>
                    <Star className="h-7 w-7" aria-hidden="true" fill={value <= rating ? '#FF5F05' : 'none'} stroke={value <= rating ? '#FF5F05' : '#94A3B8'} />
                  </label>
                ))}
              </div>
            </fieldset>
            <label htmlFor="feedback-comment" className="mb-1 block text-sm font-medium text-[#0F172A]">What went well?</label>
            <textarea id="feedback-comment" rows={3} maxLength={2000} value={comment} onChange={(event) => setComment(event.target.value)} className={`${field} mb-4`} placeholder={skill ? `How did ${view.peerFirstName} help you with ${skill.name}?` : 'Be specific and kind.'} />
          </>
        )}
        {feedback.can_endorse && skill && (
          <label className="mb-4 flex items-start gap-2 text-sm text-[#0F172A]">
            <input type="checkbox" checked={endorse} onChange={(event) => setEndorse(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#13294B]" />
            Endorse {view.peerFirstName} for {skill.name}
          </label>
        )}
        <button type="submit" disabled={submitting || (!feedback.can_review && !endorse)} className={primary}>{submitting ? 'Saving…' : feedback.can_review ? 'Submit feedback' : 'Save endorsement'}</button>
      </form>
    </section>
  );
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((index) => <Star key={index} className="h-4 w-4" aria-hidden="true" fill={index <= value ? '#FF5F05' : 'none'} stroke={index <= value ? '#FF5F05' : '#CBD5E1'} />)}
    </div>
  );
}

function Timeline({ request, view }: { request: HelpRequest; view: RequestView }) {
  const events = [
    { label: view.sent ? 'You sent the request' : `${view.peerFirstName} sent the request`, at: request.created_at },
    { label: 'Accepted', at: request.accepted_at },
    { label: 'Declined', at: request.declined_at },
    { label: 'Marked complete', at: request.completed_at },
    { label: request.cancel_reason ? `Cancelled: “${request.cancel_reason}”` : 'Cancelled', at: request.cancelled_at },
  ].filter((event) => event.at);
  return (
    <section aria-labelledby="timeline-heading" className={panel}>
      <h2 id="timeline-heading" className="mb-3 text-lg font-semibold text-[#0F172A]">Timeline</h2>
      <ol className="space-y-3 border-l-2 border-[#E2E8F0] pl-4">
        {events.map((event) => (
          <li key={event.label} className="relative text-sm">
            <span className="absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full bg-[#13294B]" aria-hidden="true" />
            <p className="break-words font-medium text-[#0F172A]">{event.label}</p>
            <p className="text-xs text-[#64748B]"><time dateTime={event.at ?? undefined}>{formatDate(event.at)}</time></p>
          </li>
        ))}
      </ol>
    </section>
  );
}
