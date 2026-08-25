import { useQuery } from '@tanstack/react-query';
import { getAnalyticsSummary } from '../lib/analyticsApi';

export function AnalyticsPage() {
  const analyticsQuery = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: getAnalyticsSummary,
    retry: 1,
  });

  if (analyticsQuery.isLoading) {
    return <div className="text-[#64748B]">Loading analytics...</div>;
  }

  if (analyticsQuery.isError || !analyticsQuery.data) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Could not load analytics summary.
      </div>
    );
  }

  const data = analyticsQuery.data;
  const maxTopSkill = Math.max(1, ...data.network_summary.top_skills.map((s) => s.count));
  const myCards = [
    { label: 'My Saved Profiles', value: data.user_summary.saved_profiles_count },
    { label: 'My Active Requests', value: data.user_summary.active_help_requests_count },
    { label: 'My Connections', value: data.user_summary.connections_count },
    { label: 'My Public Skills', value: data.user_summary.profile_skills_count },
    { label: 'My Public Credentials', value: data.user_summary.public_credentials_count },
    { label: 'My Profile Completeness', value: `${data.user_summary.profile_completeness}%` },
  ];
  const networkCards = [
    { label: 'Total Profiles', value: data.network_summary.total_profiles },
    { label: 'Total Skills', value: data.network_summary.total_skills },
    { label: 'Total Help Requests', value: data.network_summary.total_help_requests },
    { label: 'Total Connections', value: data.network_summary.connections_count },
  ];
  const statusOrder = ['pending', 'accepted', 'completed', 'declined', 'cancelled'];
  const statusCounts = statusOrder.map((status) => ({
    status,
    count: data.network_summary.request_status_counts[status] || 0,
  }));
  const maxStatusCount = Math.max(1, ...statusCounts.map((row) => row.count));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#0F172A]">Analytics</h1>
        <p className="text-[#64748B]">
          These analytics summarize your SkillSwap activity and the broader peer network.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#0F172A]">My Activity</h2>
        <p className="text-sm text-[#64748B]">
          Your personal activity across saved peers, requests, connections, and profile setup.
        </p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {myCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-[#0F172A]">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[#0F172A]">Peer Network Insights</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {networkCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-medium text-[#64748B]">{card.label}</p>
              <p className="mt-1 text-2xl font-semibold text-[#0F172A]">{card.value}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#0F172A]">Top Skills</h2>
          <p className="mb-4 text-xs text-[#64748B]">Most common skills across visible student profiles.</p>
          <div className="space-y-3">
            {data.network_summary.top_skills.map((row) => (
              <div key={row.skill}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-[#0F172A]">{row.skill}</span>
                  <span className="text-[#64748B]">{row.count}</span>
                </div>
                <div className="h-2 rounded-full bg-[#F1F5F9]">
                  <div
                    className="h-2 rounded-full bg-[#13294B]"
                    style={{ width: `${Math.max(8, (row.count / maxTopSkill) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="text-lg font-semibold text-[#0F172A]">Request Status Breakdown</h2>
          <p className="mb-4 text-xs text-[#64748B]">Current state of help requests across the peer network.</p>
          <div className="space-y-3 text-sm">
            {statusCounts.map(({ status, count }) => (
              <div key={status} className="rounded-xl border border-[#E2E8F0] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="capitalize text-[#0F172A]">{status}</span>
                  <span className="font-medium text-[#13294B]">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-[#F1F5F9]">
                  <div
                    className="h-2 rounded-full bg-[#13294B]"
                    style={{ width: `${Math.max(8, (count / maxStatusCount) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
        <h3 className="text-sm font-semibold text-[#0F172A]">What this means</h3>
        <p className="mt-1 text-sm text-[#334155]">
          Resume Review, SQL, and Networking Advice are currently common discovery areas. Accepted and completed
          requests represent successful peer connections.
        </p>
      </section>
    </div>
  );
}
