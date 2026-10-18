import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Inbox, MessageCircle } from 'lucide-react';
import { RequestCard } from '../components/requests/RequestCard';
import { PageControls } from '../components/ui/ListPagination';
import { TabPanel, Tabs } from '../components/ui/Tabs';
import { useRequestBucket } from '../hooks/useHelpRequests';
import type { RequestBucket } from '../types/api';

const PAGE_SIZE = 20;

const emptyCopy: Record<RequestBucket, { icon: typeof Inbox; title: string; body: string }> = {
  needs_action: { icon: CheckCircle2, title: "You're all caught up", body: 'New requests, swaps to review and feedback you owe will show up here.' },
  active: { icon: MessageCircle, title: 'Nothing in progress', body: 'Requests you send and swaps you accept stay here until they are done.' },
  past: { icon: Inbox, title: 'No past requests yet', body: 'Finished, declined and cancelled requests are kept here for reference.' },
};

export function HelpRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get('tab') as RequestBucket | null;
  const active: RequestBucket = requested && requested in emptyCopy ? requested : 'needs_action';
  const needsAction = useRequestBucket('needs_action');
  const select = (tab: RequestBucket) => setSearchParams(tab === 'needs_action' ? {} : { tab }, { replace: true });
  const needsCount = needsAction.data?.count ?? 0;
  const tabs = [
    { key: 'needs_action' as const, label: <>Needs action{needsCount > 0 && <span className="rounded-full bg-[#B83E00] px-2 py-0.5 text-xs text-white">{needsCount}</span>}</> },
    { key: 'active' as const, label: 'Active' },
    { key: 'past' as const, label: 'Past' },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-5">
        <h1 className="mb-2 text-3xl font-bold text-[#0F172A]">Requests</h1>
        <p className="text-[#475569]">Swaps and help requests you've sent and received.</p>
      </div>
      <Tabs label="Request views" idPrefix="requests" tabs={tabs} active={active} onSelect={select} />
      <TabPanel idPrefix="requests" active={active}>
        <BucketList key={active} bucket={active} />
      </TabPanel>
    </div>
  );
}

function BucketList({ bucket }: { bucket: RequestBucket }) {
  const [page, setPage] = useState(1);
  const query = useRequestBucket(bucket, page);
  const rows = query.data?.results ?? [];
  const total = query.data?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (query.isLoading) return <p role="status" className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-sm text-[#475569]">Loading requests…</p>;
  if (query.isError) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        <p className="mb-3">We couldn't load your requests.</p>
        <button type="button" onClick={() => query.refetch()} className="rounded-xl border border-red-300 bg-white px-4 py-2 font-medium hover:bg-red-100">Try again</button>
      </div>
    );
  }
  if (!rows.length) {
    const { icon: Icon, title, body } = emptyCopy[bucket];
    return (
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-10 text-center">
        <Icon className="mx-auto mb-3 h-10 w-10 text-[#64748B]" aria-hidden="true" />
        <h2 className="mb-1 text-lg font-semibold text-[#0F172A]">{title}</h2>
        <p className="mb-5 text-sm text-[#475569]">{body}</p>
        {bucket !== 'past' && <Link to="/discover?tab=swaps" className="inline-block rounded-xl bg-[#13294B] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#1a3a6b]">Find a swap</Link>}
      </div>
    );
  }
  return (
    <>
      <ul className="space-y-3" aria-busy={query.isFetching}>
        {rows.map((row) => <li key={row.id}><RequestCard request={row} bucket={bucket} /></li>)}
      </ul>
      {totalPages > 1 && (
        <PageControls
          label="Request pages"
          pageText={`Page ${page} of ${totalPages}`}
          canPrevious={page > 1}
          canNext={page < totalPages}
          onPrevious={() => setPage(page - 1)}
          onNext={() => setPage(page + 1)}
        />
      )}
    </>
  );
}
