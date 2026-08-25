interface SkillChipProps {
  skill: string;
  variant?: 'default' | 'featured' | 'selected';
  onRemove?: () => void;
  className?: string;
}

export function SkillChip({ skill, variant = 'default', onRemove, className = '' }: SkillChipProps) {
  const variants = {
    default: 'bg-[#E8EEF7] text-[#13294B]',
    featured: 'bg-[#FFF3EA] text-[#C2410C] border border-[#FF5F05]/30',
    selected: 'bg-[#13294B] text-white',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 ${variants[variant]} text-xs font-medium rounded-full ${className}`}>
      {skill}
      {onRemove && (
        <button
          onClick={onRemove}
          className="hover:opacity-70 transition-opacity"
          aria-label={`Remove ${skill}`}
        >
          ×
        </button>
      )}
    </span>
  );
}
