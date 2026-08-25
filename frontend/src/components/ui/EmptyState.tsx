import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl p-12 border border-[#E2E8F0] text-center">
      <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-[#64748B]" />
      </div>
      <h3 className="text-xl font-semibold text-[#0F172A] mb-2">{title}</h3>
      <p className="text-[#64748B] mb-6">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-[#13294B] text-white font-medium rounded-xl hover:bg-[#1a3a6b] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
