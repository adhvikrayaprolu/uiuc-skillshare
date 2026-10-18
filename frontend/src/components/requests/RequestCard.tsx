import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import { RequestKindBadge, RequestStatusBadge } from './RequestBadges';
import { formatDate, nextStep, requestView } from '../../lib/requests';
import type { HelpRequest, RequestBucket } from '../../types/api';

export function RequestCard({ request, bucket }: { request: HelpRequest; bucket: RequestBucket }) {
  const view = requestView(request);
  const step = nextStep(request, bucket);
  return (
    <article className="relative rounded-2xl border border-[#E2E8F0] bg-white p-4 transition-colors focus-within:border-[#13294B] hover:border-[#13294B] sm:p-5">
      <div className="flex gap-3 sm:gap-4">
        <InitialsAvatar name={view.peerName} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="font-semibold text-[#0F172A]">{view.peerName}</p>
            <span className="text-xs font-medium text-[#475569]">{view.sent ? 'Sent' : 'Received'}</span>
            <RequestKindBadge isSwap={view.isSwap} />
            <RequestStatusBadge status={request.status} />
          </div>
          <h3 className="mt-1 break-words font-medium text-[#0F172A]">
            <Link to={`/requests/${request.id}`} className="after:absolute after:inset-0 after:rounded-2xl focus:outline-none">
              {request.topic}
            </Link>
          </h3>
          {(view.youLearn || view.youTeach) && (
            <p className="mt-1 text-sm text-[#475569]">
              {view.youLearn && <>You learn <span className="font-medium text-[#0F172A]">{view.youLearn}</span></>}
              {view.youLearn && view.youTeach && ' · '}
              {view.youTeach && <>You teach <span className="font-medium text-[#0F172A]">{view.youTeach}</span></>}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className={`inline-flex items-center gap-1 font-medium ${bucket === 'needs_action' ? 'text-[#B83E00]' : 'text-[#13294B]'}`}>
              {step}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-xs text-[#64748B]">{formatDate(request.updated_at || request.created_at)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
