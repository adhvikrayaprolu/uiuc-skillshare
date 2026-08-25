import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import { InitialsAvatar } from '../components/ui/InitialsAvatar';
import { SkillChip } from '../components/ui/SkillChip';
import { useConnections } from '../hooks/useConnections';
import { shouldUseMocks } from '../lib/api';
import { normalizeYear } from '../lib/mappers';

function contactHref(type: string, value: string) {
  if (type === 'email') return `mailto:${value}`;
  if (type === 'phone') return `tel:${value}`;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}

export function ConnectionsPage() {
  const { connections, isLoading } = useConnections();
  const showMockEmpty = shouldUseMocks();

  if (showMockEmpty) {
    return (
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="mb-2 text-3xl font-bold text-[#0F172A]">Connections</h1>
          <p className="text-[#64748B]">Peers you are connected with through accepted help requests</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center">
          <Users className="mx-auto mb-4 h-10 w-10 text-[#64748B]" />
          <p className="text-[#64748B]">
            Demo mode uses local help requests. Switch to API mode to see database-backed connections from accepted requests.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return <div className="mx-auto max-w-5xl text-[#64748B]">Loading connections...</div>;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="mb-2 text-3xl font-bold text-[#0F172A]">Connections</h1>
        <p className="text-[#64748B]">People you are connected with through accepted help requests</p>
      </div>

      <div className="space-y-4">
        {connections.map((row) => {
          const name = row.peer?.display_name || 'Student';
          const major = row.peer?.major || '';
          const year = row.peer?.year ? normalizeYear(String(row.peer.year)) : '';
          const primaryContact = row.contactMethods[0];
          return (
            <div
              key={row.helpRequestId}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-6 transition-all hover:shadow-lg"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <InitialsAvatar name={name} size="lg" />
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#0F172A]">{name}</h2>
                    <p className="text-sm text-[#64748B]">
                      {major}
                      {major && year ? ' · ' : ''}
                      {year}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">{row.topic}</p>
                    <div className="mt-1">
                      <SkillChip skill={row.relatedSkillLabel} />
                    </div>
                  </div>
                  <p className="text-xs text-[#64748B]">
                    Accepted {row.acceptedAt ? row.acceptedAt.slice(0, 10) : '—'} · Preferred: {row.preferredContactMethod}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/profiles/${row.peerProfileId}`}
                      className="inline-flex items-center justify-center rounded-xl bg-[#13294B] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#1a3a6b]"
                    >
                      View Profile
                    </Link>
                    {primaryContact ? (
                      <a
                        href={contactHref(primaryContact.type, primaryContact.value)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center rounded-xl border-2 border-[#13294B] px-4 py-2 text-sm font-medium text-[#13294B] transition-colors hover:bg-[#E8EEF7]"
                      >
                        Contact
                      </a>
                    ) : (
                      <span className="inline-flex items-center rounded-xl border border-dashed border-[#E2E8F0] px-4 py-2 text-sm text-[#64748B]">
                        No public contact on file
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {connections.length === 0 && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-12 text-center">
          <Users className="mx-auto mb-4 h-10 w-10 text-[#64748B]" />
          <h3 className="mb-2 text-xl font-semibold text-[#0F172A]">No connections yet</h3>
          <p className="text-[#64748B]">Accepted help requests will appear here.</p>
          <Link
            to="/discover"
            className="mt-6 inline-block rounded-xl bg-[#13294B] px-6 py-3 text-sm font-medium text-white hover:bg-[#1a3a6b]"
          >
            Discover students
          </Link>
        </div>
      )}
    </div>
  );
}
