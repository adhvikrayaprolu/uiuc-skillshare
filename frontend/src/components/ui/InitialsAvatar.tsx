interface InitialsAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-24 h-24 text-2xl',
};

const avatarColors = [
  'bg-[#FF5F05]', // Orange
  'bg-[#13294B]', // Navy
  'bg-[#F59E0B]', // Amber
  'bg-[#334155]', // Slate
  'bg-[#1E3A8A]', // Blue
  'bg-[#C2410C]', // Deep orange
];

export function InitialsAvatar({ name, size = 'md', className = '' }: InitialsAvatarProps) {
  const getInitials = (fullName: string): string => {
    const names = fullName.trim().split(' ');
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return fullName.slice(0, 2).toUpperCase();
  };

  const getColorFromName = (name: string): string => {
    const charCode = name.charCodeAt(0) + name.charCodeAt(name.length - 1);
    return avatarColors[charCode % avatarColors.length];
  };

  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  return (
    <div
      className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center text-white font-semibold ${className}`}
    >
      {initials}
    </div>
  );
}
