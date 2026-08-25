interface LogoProps {
  showSubtitle?: boolean;
  variant?: 'full' | 'icon' | 'text';
  className?: string;
}

export function Logo({ showSubtitle = true, variant = 'full', className = '' }: LogoProps) {
  if (variant === 'icon') {
    return (
      <div className={`flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#13294B] to-[#FF5F05] rounded-xl ${className}`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 12L12 8L16 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 16L12 12L16 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="8" r="2" fill="white"/>
          <circle cx="8" cy="16" r="2" fill="white"/>
          <circle cx="16" cy="16" r="2" fill="white"/>
        </svg>
      </div>
    );
  }

  if (variant === 'text') {
    return (
      <div className={className}>
        <h1 className="text-xl font-bold text-[#13294B]">Illini SkillSwap</h1>
        {showSubtitle && <p className="text-xs text-[#64748B]">Peer Network</p>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-[#13294B] to-[#FF5F05] rounded-xl flex-shrink-0">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 12L12 8L16 12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M8 16L12 12L16 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="12" cy="8" r="2" fill="white"/>
          <circle cx="8" cy="16" r="2" fill="white"/>
          <circle cx="16" cy="16" r="2" fill="white"/>
        </svg>
      </div>
      <div>
        <h1 className="text-xl font-bold text-[#13294B]">Illini SkillSwap</h1>
        {showSubtitle && <p className="text-xs text-[#64748B]">Peer Network</p>}
      </div>
    </div>
  );
}
