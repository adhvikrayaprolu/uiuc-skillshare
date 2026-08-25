import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { mockHelpRequests, mockProfiles } from '../data/mockData';
import { InitialsAvatar } from '../components/ui/InitialsAvatar';
import { SkillChip } from '../components/ui/SkillChip';
import { useHelpRequests, useUpdateHelpRequest } from '../hooks/useHelpRequests';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/ui/ToastProvider';
import { useCurrentProfile } from '../hooks/useProfileEditor';
import { shouldUseMocks } from '../lib/api';
import type { HelpRequest as ApiHelpRequest } from '../types/api';

const statusConfig = {
  Pending: { color: 'text-[#F59E0B] bg-[#FFF3EA]', icon: Clock },
  Accepted: { color: 'text-[#16A34A] bg-green-50', icon: CheckCircle2 },
  Declined: { color: 'text-[#DC2626] bg-red-50', icon: XCircle },
  Completed: { color: 'text-[#64748B] bg-gray-50', icon: CheckCircle2 },
  Cancelled: { color: 'text-[#64748B] bg-gray-50', icon: XCircle },
};

function contactHref(type: string, value: string) {
  if (type === 'email') return `mailto:${value}`;
  if (type === 'phone') return `tel:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

function acceptedContactsForTab(raw: ApiHelpRequest | undefined, tab: 'incoming' | 'outgoing') {
  if (!raw || raw.status !== 'accepted') return [];
  return tab === 'incoming' ? raw.seeker_contact_methods ?? [] : raw.helper_contact_methods ?? [];
}

export function HelpRequestsPage() {
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [mockList, setMockList] = useState(() => mockHelpRequests);
  const auth = useAuth();
  const toast = useToast();
  const myProfileQuery = useCurrentProfile();
  const helpRequestsQuery = useHelpRequests();
  const updateHelpRequest = useUpdateHelpRequest();
  const isMock = helpRequestsQuery.data?.isMock ?? shouldUseMocks();
  const demoSelfProfileId = mockProfiles[0].id;

  const allRequests = isMock ? mockList : helpRequestsQuery.data?.requests ?? [];
  const rawRequests: ApiHelpRequest[] = helpRequestsQuery.data?.raw ?? [];

  const myProfileId = myProfileQuery.data?.id;
  const incomingRequests = isMock
    ? allRequests.filter((request) => request.helper.id === demoSelfProfileId)
    : allRequests.filter((request) => {
        const raw = rawRequests.find((r) => r.id === request.id);
        return Boolean(raw && myProfileId && raw.helper_profile === myProfileId);
      });
  const outgoingRequests = isMock
    ? allRequests.filter((request) => request.requester.id === demoSelfProfileId)
    : allRequests.filter((request) => {
        const raw = rawRequests.find((r) => r.id === request.id);
        return Boolean(raw && auth.user?.id && raw.seeker === auth.user.id);
      });

  const displayRequests = activeTab === 'incoming' ? incomingRequests : outgoingRequests;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-[#0F172A]">Help Requests</h1>
        <p className="text-[#64748B]">Manage incoming and outgoing help requests</p>
      </div>

      {helpRequestsQuery.isError && !isMock && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not load help requests. Check your connection and try again.
        </div>
      )}

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('incoming')}
          className={`rounded-xl px-6 py-3 font-medium transition-colors ${
            activeTab === 'incoming'
              ? 'bg-[#13294B] text-white'
              : 'border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
          }`}
        >
          Incoming ({incomingRequests.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('outgoing')}
          className={`rounded-xl px-6 py-3 font-medium transition-colors ${
            activeTab === 'outgoing'
              ? 'bg-[#13294B] text-white'
              : 'border border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
          }`}
        >
          Outgoing ({outgoingRequests.length})
        </button>
      </div>

      <div className="space-y-4">
        {displayRequests.map((request) => {
          const StatusIcon = statusConfig[request.status].icon;
          const raw = rawRequests.find((r) => r.id === request.id);
          const peerProfileId = activeTab === 'incoming' ? request.requester.id : request.helper.id;
          const contacts = acceptedContactsForTab(raw, activeTab);
          const primaryContact = contacts[0];

          return (
            <div
              key={request.id}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-6 transition-all hover:shadow-lg"
            >
              <div className="flex gap-4">
                <InitialsAvatar
                  name={activeTab === 'incoming' ? request.requester.name : request.helper.name}
                  size="md"
                />

                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[#0F172A]">
                          {activeTab === 'incoming' ? request.requester.name : request.helper.name}
                        </h3>
                        <span
                          className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${statusConfig[request.status].color}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {request.status}
                        </span>
                      </div>
                      <p className="text-sm text-[#64748B]">
                        {activeTab === 'incoming' ? request.requester.major : request.helper.major} · {request.createdAt}
                      </p>
                    </div>
                  </div>

                  <div className="mb-3">
                    <h4 className="mb-1 font-medium text-[#0F172A]">{request.topic}</h4>
                    <SkillChip skill={request.relatedSkill} />
                  </div>

                  <div className="mb-3 rounded-lg bg-[#F8FAFC] p-3">
                    <p className="text-sm text-[#64748B]">{request.message}</p>
                  </div>

                  <div className="mb-4 flex items-center gap-2">
                    <AlertCircle
                      className={`h-4 w-4 ${
                        request.urgency === 'High'
                          ? 'text-[#DC2626]'
                          : request.urgency === 'Medium'
                            ? 'text-[#F59E0B]'
                            : 'text-[#64748B]'
                      }`}
                    />
                    <span className="text-sm text-[#64748B]">
                      Urgency: <span className="font-medium">{request.urgency}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {activeTab === 'incoming' && request.status === 'Pending' && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            if (isMock) {
                              setMockList((cur) =>
                                cur.map((r) => (r.id === request.id ? { ...r, status: 'Accepted' } : r)),
                              );
                              toast.success('Request accepted.');
                              return;
                            }
                            try {
                              await updateHelpRequest.mutateAsync({ id: request.id, payload: { status: 'accepted' } });
                              toast.success('Request accepted.');
                            } catch {
                              toast.error('Could not accept request.');
                            }
                          }}
                          className="rounded-xl bg-[#13294B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a3a6b]"
                        >
                          Accept
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (isMock) {
                              setMockList((cur) =>
                                cur.map((r) => (r.id === request.id ? { ...r, status: 'Declined' } : r)),
                              );
                              toast.success('Request declined.');
                              return;
                            }
                            try {
                              await updateHelpRequest.mutateAsync({ id: request.id, payload: { status: 'declined' } });
                              toast.success('Request declined.');
                            } catch {
                              toast.error('Could not decline request.');
                            }
                          }}
                          className="rounded-xl border-2 border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#64748B] transition-colors hover:border-[#DC2626] hover:text-[#DC2626]"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {activeTab === 'outgoing' && request.status === 'Pending' && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (isMock) {
                            setMockList((cur) =>
                              cur.map((r) => (r.id === request.id ? { ...r, status: 'Cancelled' } : r)),
                            );
                            toast.success('Request cancelled.');
                            return;
                          }
                          try {
                            await updateHelpRequest.mutateAsync({ id: request.id, payload: { status: 'cancelled' } });
                            toast.success('Request cancelled.');
                          } catch {
                            toast.error('Could not cancel request.');
                          }
                        }}
                        className="rounded-xl border-2 border-[#E2E8F0] px-4 py-2 text-sm font-medium text-[#64748B] transition-colors hover:border-[#DC2626] hover:text-[#DC2626]"
                      >
                        Cancel Request
                      </button>
                    )}
                    {request.status === 'Accepted' && (
                      <>
                        <div className="min-w-[200px] flex-1 rounded-xl bg-[#FFF3EA] px-4 py-2 text-sm text-[#13294B]">
                          Request accepted. Coordinate directly using the shared contact method.
                        </div>
                        {primaryContact && (
                          <a
                            href={contactHref(primaryContact.type, primaryContact.value)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-xl bg-[#13294B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a3a6b]"
                          >
                            Contact
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            if (isMock) {
                              setMockList((cur) =>
                                cur.map((r) => (r.id === request.id ? { ...r, status: 'Completed' } : r)),
                              );
                              toast.success('Request marked complete.');
                              return;
                            }
                            try {
                              await updateHelpRequest.mutateAsync({ id: request.id, payload: { status: 'completed' } });
                              toast.success('Request marked complete.');
                            } catch {
                              toast.error('Could not update request.');
                            }
                          }}
                          className="rounded-xl bg-[#16A34A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                        >
                          Mark Complete
                        </button>
                      </>
                    )}
                    <Link
                      to={`/profiles/${peerProfileId}`}
                      className="rounded-xl border-2 border-[#13294B] px-4 py-2 text-sm font-medium text-[#13294B] transition-colors hover:bg-[#E8EEF7]"
                    >
                      View Profile
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {displayRequests.length === 0 && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#F8FAFC]">
            <MessageCircle className="h-8 w-8 text-[#64748B]" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-[#0F172A]">No requests yet</h3>
          <p className="text-[#64748B]">
            {activeTab === 'incoming'
              ? 'When students reach out, their requests will appear here'
              : "You haven't sent any help requests yet"}
          </p>
        </div>
      )}
    </div>
  );
}
