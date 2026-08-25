import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Compass,
  Bookmark,
  MessageCircle,
  User,
  Settings,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Users,
  BarChart3,
} from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { InitialsAvatar } from '../components/ui/InitialsAvatar';
import { Logo } from '../components/ui/Logo';
import { NotificationDropdown } from '../components/layout/NotificationDropdown';
import type { NotificationItem } from '../components/layout/NotificationDropdown';
import { UserMenuDropdown } from '../components/layout/UserMenuDropdown';
import { AvailabilityStatusDropdown } from '../components/layout/AvailabilityStatusDropdown';
import { useAuth } from '../hooks/useAuth';
import { useCurrentProfile, useProfileEditor } from '../hooks/useProfileEditor';
import { useHelpRequests } from '../hooks/useHelpRequests';
import { useSavedProfiles } from '../hooks/useSavedProfiles';
import { useToast } from '../components/ui/ToastProvider';
import { shouldUseMocks } from '../lib/api';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/discover', label: 'Discover', icon: Compass },
  { path: '/saved', label: 'Saved Profiles', icon: Bookmark },
  { path: '/connections', label: 'Connections', icon: Users },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/requests', label: 'Requests', icon: MessageCircle },
  { path: '/profile/edit', label: 'My Profile', icon: User },
  { path: '/settings', label: 'Settings', icon: Settings },
];

type AvailabilityUi = 'open' | 'maybe' | 'not-available' | 'invisible';

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const toast = useToast();
  const currentProfile = useCurrentProfile();
  const { updateProfile } = useProfileEditor();
  const helpRequestsQuery = useHelpRequests();
  const savedProfilesQuery = useSavedProfiles();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [demoAvailabilityStatus, setDemoAvailabilityStatus] = useState<AvailabilityUi>('open');
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const displayName =
    currentProfile.data?.display_name ||
    (auth.user?.firstName || auth.user?.lastName
      ? `${auth.user.firstName} ${auth.user.lastName}`.trim()
      : auth.user?.email || 'Student');
  const myProfileId = currentProfile.data?.id ?? null;
  const useMocks = shouldUseMocks();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (statusMenuRef.current && !statusMenuRef.current.contains(event.target as Node)) {
        setShowStatusMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const apiAvailabilityStatus = useMemo<AvailabilityUi>(() => {
    if (useMocks || !currentProfile.data) return 'open';
    const p = currentProfile.data;
    if (p.visibility === 'private') return 'invisible';
    if (!p.open_to_connect) return 'not-available';
    return 'open';
  }, [currentProfile.data, useMocks]);

  const availabilityStatus = useMocks ? demoAvailabilityStatus : apiAvailabilityStatus;
  const notificationItems = useMemo<NotificationItem[]>(() => {
    if (useMocks) return [];
    const items: NotificationItem[] = [];
    const profileId = currentProfile.data?.id;
    const myUserId = auth.user?.id;
    const helpRequests = helpRequestsQuery.data?.raw || [];
    const incomingPending = helpRequests.find(
      (req) => req.status === 'pending' && profileId && req.helper_profile === profileId,
    );
    if (incomingPending) {
      items.push({
        id: `incoming-${incomingPending.id}`,
        type: 'request',
        title: 'New help request',
        description: `${incomingPending.seeker_display_name || 'A student'} wants help with ${incomingPending.topic.toLowerCase()}.`,
        href: '/requests',
        read: false,
      });
    }
    const accepted = helpRequests.find(
      (req) =>
        req.status === 'accepted' &&
        myUserId &&
        (req.seeker === myUserId || req.helper_profile === profileId),
    );
    if (accepted) {
      items.push({
        id: `accepted-${accepted.id}`,
        type: 'accepted',
        title: 'New connection',
        description: 'An accepted request is now listed in Connections.',
        href: '/connections',
        read: false,
      });
    }
    const completeness = currentProfile.data?.profile_completeness || 0;
    if (completeness < 85) {
      items.push({
        id: 'profile-reminder',
        type: 'profile',
        title: 'Complete your profile',
        description: 'Add skills, availability, or credentials so students can find you.',
        href: '/profile/edit',
        read: false,
      });
    }
    if ((savedProfilesQuery.data?.profiles.length || 0) > 0) {
      items.push({
        id: 'saved-reminder',
        type: 'saved',
        title: 'Saved profiles',
        description: 'Review your saved peers when you are ready to connect.',
        href: '/saved',
        read: true,
      });
    }
    return items.slice(0, 5);
  }, [auth.user?.id, currentProfile.data, helpRequestsQuery.data?.raw, savedProfilesQuery.data?.profiles.length, useMocks]);

  const handleLogout = () => {
    auth.logout();
    setShowUserMenu(false);
    navigate('/login', { replace: true });
  };

  const patchAvailability = async (status: AvailabilityUi) => {
    if (useMocks || auth.isDemo) {
      setDemoAvailabilityStatus(status);
      toast.success('Demo mode: status is local only.');
      return;
    }
    const payload =
      status === 'invisible'
        ? { open_to_connect: false, visibility: 'private' as const }
        : status === 'not-available'
          ? { open_to_connect: false, visibility: 'public' as const }
          : { open_to_connect: true, visibility: 'public' as const };
    try {
      await updateProfile.mutateAsync(payload);
      toast.success('Status updated.');
    } catch {
      toast.error('Could not update status.');
    }
  };

  const mobileNavItems = navItems.slice(0, 5);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside className="fixed hidden h-screen w-64 flex-col border-r border-[#E2E8F0] bg-white lg:flex">
        <div className="border-b border-[#E2E8F0] p-6">
          <Logo showSubtitle={true} />
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-[#FFF3EA] text-[#FF5F05]' : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                {isActive && <div className="absolute bottom-0 left-0 top-0 w-1 rounded-r bg-[#FF5F05]" />}
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E2E8F0] p-4">
          <div className="mb-3 flex items-center gap-3">
            <InitialsAvatar name={displayName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-[#0F172A]">{displayName}</p>
              <p className="text-xs text-[#64748B]">Verified Student</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-[#64748B] transition-colors hover:text-[#DC2626]"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-white">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="hidden max-w-md flex-1 sm:block">
              {location.pathname !== '/discover' ? (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-10 pr-4 text-sm transition-colors focus:border-[#13294B] focus:outline-none"
                  />
                </div>
              ) : (
                <p className="text-sm text-[#64748B]">Use the Discover search bar for AI-assisted matching.</p>
              )}
            </div>

            <div className="ml-auto flex items-center gap-4">
              <div className="relative hidden sm:block" ref={statusMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="flex items-center gap-1.5 rounded-full bg-[#FFF3EA] px-3 py-1.5 text-xs font-medium text-[#FF5F05] transition-colors hover:bg-opacity-80"
                >
                  {availabilityStatus === 'open' ? 'Open to Connect' : 'Status'}
                  <ChevronDown className="h-3 w-3" />
                </button>
                {showStatusMenu && (
                  <AvailabilityStatusDropdown
                    currentStatus={availabilityStatus}
                    onStatusChange={async (status) => {
                      setShowStatusMenu(false);
                      await patchAvailability(status);
                    }}
                  />
                )}
              </div>

              <div className="relative" ref={notifRef}>
                <button
                  type="button"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative rounded-lg p-2 transition-colors hover:bg-[#F8FAFC]"
                >
                  <Bell className="h-5 w-5 text-[#64748B]" />
                  {notificationItems.some((item) => !item.read) && (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#FF5F05]" />
                  )}
                </button>
                {showNotifications && <NotificationDropdown showSamples={useMocks} items={notificationItems} />}
              </div>

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="transition-opacity hover:opacity-80"
                >
                  <InitialsAvatar name={displayName} size="sm" />
                </button>
                {showUserMenu && (
                  <UserMenuDropdown
                    userName={displayName}
                    userEmail={auth.user?.email}
                    myProfileId={myProfileId}
                    onLogout={handleLogout}
                  />
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
          <Outlet />
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 gap-1 border-t border-[#E2E8F0] bg-white px-1 py-2 lg:hidden">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-medium ${
                isActive ? 'bg-[#FFF3EA] text-[#FF5F05]' : 'text-[#64748B]'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="truncate px-0.5 text-center leading-tight">
                {item.label.replace(' Profiles', '').replace('My Profile', 'Profile')}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
