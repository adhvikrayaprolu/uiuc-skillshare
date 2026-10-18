import { Link } from 'react-router-dom';
import { BarChart3, Bookmark, Edit, LogOut, Settings, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { InitialsAvatar } from '../ui/InitialsAvatar';
import { EDIT_PROFILE, MY_PROFILE, SETUP_HOME } from '../../lib/routes';

interface UserMenuDropdownProps {
  userName?: string;
  userEmail?: string;
  myProfileId?: number | null;
  isPublished?: boolean;
  isStaff?: boolean;
  onNavigate?: () => void;
  onLogout: () => void;
}

export function UserMenuDropdown({
  userName = 'Student',
  userEmail = '',
  myProfileId,
  isPublished = false,
  isStaff = false,
  onNavigate,
  onLogout,
}: UserMenuDropdownProps) {
  const profileHref = myProfileId ? MY_PROFILE : SETUP_HOME;
  const links: { to: string; label: string; icon: LucideIcon }[] = [
    { to: profileHref, label: isPublished || !myProfileId ? 'View my profile' : 'View my profile (hidden)', icon: User },
    { to: EDIT_PROFILE, label: 'Edit profile', icon: Edit },
    { to: '/discover?tab=saved', label: 'Saved profiles', icon: Bookmark },
    { to: '/settings', label: 'Settings', icon: Settings },
    ...(isStaff ? [{ to: '/analytics', label: 'Analytics', icon: BarChart3 }] : []),
  ];

  return (
    <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-lg">
      <div className="border-b border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
        <div className="flex items-center gap-3">
          <InitialsAvatar name={userName} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#0F172A]">{userName}</p>
            <p className="truncate text-xs text-[#475569]">{userEmail}</p>
          </div>
        </div>
      </div>

      <div className="py-2">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={label} to={to} onClick={onNavigate} className="flex items-center gap-3 px-4 py-2 transition-colors hover:bg-[#F8FAFC]">
            <Icon className="h-4 w-4 text-[#475569]" aria-hidden="true" />
            <span className="text-sm text-[#0F172A]">{label}</span>
          </Link>
        ))}
      </div>

      <div className="border-t border-[#E2E8F0] py-2">
        <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 px-4 py-2 text-left text-[#DC2626] transition-colors hover:bg-red-50">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="text-sm font-medium">Sign out</span>
        </button>
      </div>
    </div>
  );
}
