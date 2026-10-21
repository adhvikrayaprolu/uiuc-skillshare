import { Check } from 'lucide-react';
import { availabilityLabels, type AvailabilityStatus } from '../../lib/availabilityStatus';

const statusOptions: { value: AvailabilityStatus; description: string }[] = [
  { value: 'open', description: 'Visible in Discover and accepting requests' },
  { value: 'not-available', description: 'Visible, but not accepting new requests' },
  { value: 'invisible', description: 'Profile hidden from other members' },
];

interface AvailabilityStatusDropdownProps {
  currentStatus?: AvailabilityStatus;
  onStatusChange?: (status: AvailabilityStatus) => void;
}

export function AvailabilityStatusDropdown({ currentStatus = 'open', onStatusChange }: AvailabilityStatusDropdownProps) {
  return (
    <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-lg">
      <div className="border-b border-[#E2E8F0] px-4 py-3">
        <p className="font-semibold text-[#0F172A]">Your status</p>
        <p className="mt-1 text-xs text-[#475569]">Choose how you appear to other students</p>
      </div>
      <div className="py-2">
        {statusOptions.map((option) => {
          const selected = currentStatus === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onStatusChange?.(option.value)}
              className="w-full px-4 py-3 text-left transition-colors hover:bg-[#F8FAFC]"
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border-2 ${selected ? 'border-[#13294B] bg-[#13294B]' : 'border-[#E2E8F0]'}`}>
                  {selected && <Check className="h-3 w-3 text-white" strokeWidth={3} aria-hidden="true" />}
                </div>
                <div className="flex-1">
                  <span className="mb-1 block text-sm font-medium text-[#0F172A]">{availabilityLabels[option.value]}</span>
                  <span className="block text-xs text-[#475569]">{option.description}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
