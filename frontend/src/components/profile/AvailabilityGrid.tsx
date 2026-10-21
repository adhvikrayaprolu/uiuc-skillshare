import type { ProfileFormState } from '../../lib/profilePersistence';

const days = [
  ['monday', 'Mon'], ['tuesday', 'Tue'], ['wednesday', 'Wed'], ['thursday', 'Thu'], ['friday', 'Fri'], ['saturday', 'Sat'], ['sunday', 'Sun'],
] as const;
const blocks = [['morning', 'Morning'], ['afternoon', 'Afternoon'], ['evening', 'Evening']] as const;

type Slot = ProfileFormState['availability'][number];

const has = (rows: Slot[], day: string, time: string) => rows.some((row) => row.day_of_week === day && row.time_block === time);

export function AvailabilityGrid({ value, onChange }: { value: Slot[]; onChange: (next: Slot[]) => void }) {
  const flexible = has(value, 'flexible', 'flexible');
  const toggle = (day: string, time: string) =>
    onChange(has(value, day, time) ? value.filter((row) => !(row.day_of_week === day && row.time_block === time)) : [...value, { day_of_week: day, time_block: time }]);

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[17rem] table-fixed border-separate border-spacing-1 text-sm">
          <caption className="sr-only">Weekly availability. Select every time you could usually meet.</caption>
          <thead>
            <tr>
              <th scope="col" className="w-16 sm:w-20"><span className="sr-only">Time of day</span></th>
              {days.map(([day, short]) => <th key={day} scope="col" className="text-xs font-semibold text-[#475569]">{short}</th>)}
            </tr>
          </thead>
          <tbody>
            {blocks.map(([time, label]) => (
              <tr key={time}>
                <th scope="row" className="pr-1 text-left text-xs font-semibold text-[#475569]">{label}</th>
                {days.map(([day, short]) => {
                  const active = has(value, day, time);
                  return (
                    <td key={day} className="p-0">
                      <button
                        type="button"
                        aria-pressed={active}
                        aria-label={`${short} ${label.toLowerCase()}`}
                        onClick={() => toggle(day, time)}
                        className={`h-9 w-full rounded-lg border transition-colors ${active ? 'border-[#13294B] bg-[#13294B]' : 'border-[#E2E8F0] bg-white hover:border-[#13294B]'}`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <label className="flex items-center gap-2 text-sm text-[#0F172A]">
        <input type="checkbox" checked={flexible} onChange={() => toggle('flexible', 'flexible')} className="h-4 w-4" />
        My schedule is flexible
      </label>
    </div>
  );
}
