import { Check } from 'lucide-react';

type AvailabilityStatus = 'open' | 'not-available' | 'maybe' | 'invisible';

interface StatusOption {
  value: AvailabilityStatus;
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

const statusOptions: StatusOption[] = [
  {
    value: 'open',
    label: 'Open to Connect',
    description: 'Visible and available to help',
    color: 'text-[#C2410C]',
    bgColor: 'bg-[#FFF3EA] border border-[#FF5F05]/25',
  },
  {
    value: 'maybe',
    label: 'Maybe Later',
    description: 'Available but busy this week',
    color: 'text-amber-900',
    bgColor: 'bg-amber-100 border border-amber-200/80',
  },
  {
    value: 'not-available',
    label: 'Not Available',
    description: 'Visible but not taking requests',
    color: 'text-[#0F172A]',
    bgColor: 'bg-slate-100 border border-slate-200',
  },
  {
    value: 'invisible',
    label: 'Private',
    description: 'Profile hidden from search',
    color: 'text-[#0F172A]',
    bgColor: 'bg-slate-100 border border-slate-200',
  },
];

interface AvailabilityStatusDropdownProps {
  currentStatus?: AvailabilityStatus;
  onStatusChange?: (status: AvailabilityStatus) => void;
}

export function AvailabilityStatusDropdown({
  currentStatus = 'open',
  onStatusChange
}: AvailabilityStatusDropdownProps) {
  return (
    <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-lg border border-[#E2E8F0] overflow-hidden z-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E2E8F0]">
        <h3 className="font-semibold text-[#0F172A]">Availability Status</h3>
        <p className="text-xs text-[#64748B] mt-1">Control how you appear to other students</p>
      </div>

      {/* Status Options */}
      <div className="py-2">
        {statusOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onStatusChange?.(option.value)}
            className="w-full px-4 py-3 hover:bg-[#F8FAFC] transition-colors text-left"
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                currentStatus === option.value
                  ? 'border-[#13294B] bg-[#13294B]'
                  : 'border-[#E2E8F0]'
              }`}>
                {currentStatus === option.value && (
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-[#0F172A]">{option.label}</span>
                  <span className={`px-2 py-0.5 ${option.bgColor} ${option.color} text-xs font-medium rounded-full`}>
                    {option.label.split(' ')[0]}
                  </span>
                </div>
                <p className="text-xs text-[#64748B]">{option.description}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
