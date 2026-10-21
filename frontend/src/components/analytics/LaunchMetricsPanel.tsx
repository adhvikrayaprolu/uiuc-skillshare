import type { LaunchMetrics } from '../../types/api';
import { formatHours, formatRate } from '../../lib/metrics';

export function LaunchMetricsPanel({ metrics }: { metrics: LaunchMetrics }) {
  const rows: { label: string; value: string; target?: string; hint: string; met?: boolean }[] = [
    { label: 'Setup completion', value: formatRate(metrics.setup_completion_rate), target: '≥ 70%', met: metrics.setup_completion_rate !== null ? metrics.setup_completion_rate >= 0.7 : undefined, hint: `${metrics.signups} verified members signed in` },
    { label: 'Time to first match', value: formatHours(metrics.median_minutes_to_first_match === null ? null : metrics.median_minutes_to_first_match / 60), target: '< 2 minutes', met: metrics.median_minutes_to_first_match !== null ? metrics.median_minutes_to_first_match < 2 : undefined, hint: 'Median from first sign-in to first match shown' },
    { label: 'Sent a request within 7 days', value: formatRate(metrics.sent_request_within_7_days_rate), hint: `Members who finished setup at least a week ago (${metrics.sent_request_cohort})` },
    { label: 'Acceptance rate', value: formatRate(metrics.acceptance_rate), hint: 'Accepted ÷ accepted, declined or expired' },
    { label: 'Median response time', value: formatHours(metrics.median_response_hours), hint: 'From sending to accept or decline' },
    { label: 'Completion rate', value: formatRate(metrics.completion_rate), hint: 'Completed ÷ ever accepted' },
    { label: 'Completions with feedback', value: formatRate(metrics.feedback_rate), hint: `${metrics.review_count} reviews in total` },
    { label: 'Swaps with feedback from both sides', value: formatRate(metrics.two_sided_swap_feedback_rate), hint: 'Completed swaps where both people left a review' },
  ];
  return (
    <section aria-labelledby="launch-metrics-heading" className="space-y-3">
      <div>
        <h2 id="launch-metrics-heading" className="text-lg font-semibold text-[#0F172A]">Launch metrics</h2>
        <p className="text-sm text-[#64748B]">Success measures from the product plan. A dash means there isn't enough data yet.</p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
            <dt className="text-xs font-medium text-[#64748B]">{row.label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-[#0F172A]">{row.value}</dd>
            <dd className="mt-1 text-xs text-[#475569]">{row.hint}</dd>
            {row.target && (
              <dd className={`mt-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${row.met === undefined ? 'bg-[#F1F5F9] text-[#475569]' : row.met ? 'bg-green-50 text-green-800' : 'bg-[#FFF3EA] text-[#9A3412]'}`}>
                Target {row.target}{row.met === undefined ? '' : row.met ? ' · met' : ' · not yet'}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </section>
  );
}
