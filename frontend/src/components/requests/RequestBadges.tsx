import { ArrowLeftRight, CheckCircle2, Clock, HandHelping, XCircle } from 'lucide-react';
import { statusLabels } from '../../lib/requests';
import type { HelpRequestStatus } from '../../types/api';

const statusStyles: Record<HelpRequestStatus, { className: string; icon: typeof Clock }> = {
  pending: { className: 'bg-[#FFF3EA] text-[#92400E]', icon: Clock },
  accepted: { className: 'bg-green-50 text-[#15803D]', icon: CheckCircle2 },
  completed: { className: 'bg-[#E8EEF7] text-[#13294B]', icon: CheckCircle2 },
  declined: { className: 'bg-red-50 text-[#B91C1C]', icon: XCircle },
  cancelled: { className: 'bg-[#F1F5F9] text-[#475569]', icon: XCircle },
};

export function RequestStatusBadge({ status }: { status: HelpRequestStatus }) {
  const { className, icon: Icon } = statusStyles[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

export function RequestKindBadge({ isSwap }: { isSwap: boolean }) {
  const Icon = isSwap ? ArrowLeftRight : HandHelping;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${isSwap ? 'bg-[#FFF3EA] text-[#9A3400]' : 'bg-[#E8EEF7] text-[#13294B]'}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {isSwap ? 'Swap' : 'Help'}
    </span>
  );
}
