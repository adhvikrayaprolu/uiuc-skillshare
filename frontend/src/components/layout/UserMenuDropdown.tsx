import { Link } from 'react-router-dom';
import { User, Edit, Settings, LogOut } from 'lucide-react';
import { InitialsAvatar } from '../ui/InitialsAvatar';

interface UserMenuDropdownProps {
  userName?: string;
  userEmail?: string;
  myProfileId?: number | null;
  onLogout: () => void;
}

export function UserMenuDropdown({
  userName = 'Student',
  userEmail = '',
  myProfileId,
  onLogout,
}: UserMenuDropdownProps) {
  const profileHref = myProfileId ? `/profiles/${myProfileId}` : '/onboarding';

  return (
    <div className="absolute right-0 top-12 w-64 bg-white rounded-xl shadow-lg border border-[#E2E8F0] overflow-hidden z-50">
      {/* User Info */}
      <div className="px-4 py-3 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex items-center gap-3 mb-2">
          <InitialsAvatar name={userName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#0F172A] truncate">{userName}</p>
            <p className="text-xs text-[#64748B] truncate">{userEmail}</p>
          </div>
        </div>
        <span className="inline-block rounded border border-[#FF5F05]/30 bg-[#FFF3EA] px-2 py-0.5 text-xs font-semibold text-[#C2410C]">
          Verified Student
        </span>
      </div>

      {/* Menu Items */}
      <div className="py-2">
        <Link
          to={profileHref}
          className="flex items-center gap-3 px-4 py-2 hover:bg-[#F8FAFC] transition-colors"
        >
          <User className="w-4 h-4 text-[#64748B]" />
          <span className="text-sm text-[#0F172A]">View My Profile</span>
        </Link>
        <Link
          to="/profile/edit"
          className="flex items-center gap-3 px-4 py-2 hover:bg-[#F8FAFC] transition-colors"
        >
          <Edit className="w-4 h-4 text-[#64748B]" />
          <span className="text-sm text-[#0F172A]">Edit Profile</span>
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-3 px-4 py-2 hover:bg-[#F8FAFC] transition-colors"
        >
          <Settings className="w-4 h-4 text-[#64748B]" />
          <span className="text-sm text-[#0F172A]">Settings</span>
        </Link>
      </div>

      {/* Logout */}
      <div className="border-t border-[#E2E8F0] py-2">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-red-50 transition-colors text-[#DC2626]"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>
    </div>
  );
}
