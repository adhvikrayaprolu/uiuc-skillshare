import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Compass,
  MessageCircle,
  User,
  LogOut,
  Search,
  Bell,
  ChevronDown,
} from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import { InitialsAvatar } from '../components/ui/InitialsAvatar';
import { Logo } from '../components/ui/Logo';
import { NotificationDropdown } from '../components/layout/NotificationDropdown';
import { UserMenuDropdown } from '../components/layout/UserMenuDropdown';
import { AvailabilityStatusDropdown } from '../components/layout/AvailabilityStatusDropdown';
import { availabilityLabels, type AvailabilityStatus } from '../lib/availabilityStatus';
import { useAuth } from '../hooks/useAuth';
import { useCurrentProfile, useProfileEditor } from '../hooks/useProfileEditor';
import { useNotifications } from '../hooks/useNotifications';
import { useToast } from '../components/ui/ToastProvider';
import { APP_HOME, MY_PROFILE } from '../lib/routes';
import { useRequestBucket } from '../hooks/useHelpRequests';

const navItems = [
  { path: APP_HOME, label: 'Home', icon: Home, matches: [APP_HOME] },
  { path: '/discover', label: 'Discover', icon: Compass, matches: ['/discover', '/profiles'] },
  { path: '/requests', label: 'Requests', icon: MessageCircle, matches: ['/requests'] },
  { path: MY_PROFILE, label: 'Profile', icon: User, matches: [MY_PROFILE] },
];

const isActivePath = (pathname: string, matches: string[]) =>
  matches.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

type AvailabilityUi = AvailabilityStatus;

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const toast = useToast();
  const currentProfile = useCurrentProfile();
  const { updateProfile } = useProfileEditor();
  const notifications = useNotifications();
  const needsAction = useRequestBucket('needs_action');

  const [globalSearch, setGlobalSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  const displayName =
    currentProfile.data?.display_name ||
    (auth.user?.firstName || auth.user?.lastName
      ? `${auth.user.firstName} ${auth.user.lastName}`.trim()
      : auth.user?.email || 'Student');
  const myProfileId = currentProfile.data?.id ?? null;
  const pendingIncoming = myProfileId ? needsAction.data?.count ?? 0 : 0;

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
    const closeMenus = (event: KeyboardEvent) => {if (event.key === 'Escape') {setShowNotifications(false); setShowUserMenu(false); setShowStatusMenu(false);}};
    document.addEventListener('keydown', closeMenus);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', closeMenus);};
  }, []);

  const apiAvailabilityStatus = useMemo<AvailabilityUi>(() => {
    if (!currentProfile.data) return 'open';
    const p = currentProfile.data;
    if (p.visibility === 'private') return 'invisible';
    if (!p.open_to_connect) return 'not-available';
    return 'open';
  }, [currentProfile.data]);

  const availabilityStatus = apiAvailabilityStatus;
  const handleLogout = async () => {
    try {
      await auth.logout();
      setShowUserMenu(false);
      navigate('/login', { replace: true });
    } catch {toast.error('Could not sign out. Please try again.');}
  };

  const patchAvailability = async (status: AvailabilityUi) => {
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

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside className="fixed hidden h-screen w-64 flex-col border-r border-[#E2E8F0] bg-white lg:flex">
        <div className="border-b border-[#E2E8F0] p-6">
          <Logo showSubtitle={true} />
        </div>

        <nav aria-label="Main" className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(location.pathname, item.matches);
            const badge = item.path === '/requests' ? pendingIncoming : 0;

            return (
              <Link
                key={item.path}
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-[#FFF3EA] text-[#B83E00]' : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                {isActive && <div className="absolute bottom-0 left-0 top-0 w-1 rounded-r bg-[#B83E00]" />}
                <Icon className="h-5 w-5" aria-hidden="true" />
                {item.label}
                {badge > 0 && <span className="ml-auto rounded-full bg-[#B83E00] px-2 py-0.5 text-xs font-semibold text-white" aria-label={`${badge} need your action`}>{badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E2E8F0] p-4">
          <div className="mb-3 flex items-center gap-3">
            <InitialsAvatar name={displayName} size="md" />
            <div className="flex-1 min-w-0">
              <p className="truncate text-sm font-semibold text-[#0F172A]">{displayName}</p>
              <p className="text-xs text-[#64748B]">Student profile</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-[#64748B] transition-colors hover:text-[#DC2626]"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </button>
          <nav aria-label="Policies" className="mt-3 flex flex-wrap gap-x-3 text-xs text-[#64748B]">
            <Link to="/guidelines" className="hover:text-[#13294B]">Guidelines</Link>
            <Link to="/privacy" className="hover:text-[#13294B]">Privacy</Link>
            <Link to="/terms" className="hover:text-[#13294B]">Terms</Link>
          </nav>
        </div>
      </aside>

      <div className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-10 border-b border-[#E2E8F0] bg-white">
          <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="hidden max-w-md flex-1 sm:block">
              {location.pathname !== '/discover' ? (
                <form onSubmit={event => {event.preventDefault(); navigate(`/discover?q=${encodeURIComponent(globalSearch)}`);}} className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                  <input
                    type="text"
                    aria-label="Search helpers from any page" value={globalSearch} onChange={event => setGlobalSearch(event.target.value)} placeholder="Search skills or people…"
                    className="w-full rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] py-2 pl-10 pr-4 text-sm transition-colors focus:border-[#13294B] focus:outline-none"
                  />
                </form>
              ) : null}
            </div>

            <div className="ml-auto flex items-center gap-4">
              <div className="relative hidden sm:block" ref={statusMenuRef}>
                <button
                  type="button"
                  aria-expanded={showStatusMenu}
                  aria-label={`Your status: ${availabilityLabels[availabilityStatus]}`}
                  onClick={() => setShowStatusMenu(!showStatusMenu)}
                  className="flex items-center gap-1.5 rounded-full bg-[#FFF3EA] px-3 py-1.5 text-xs font-medium text-[#B83E00] transition-colors hover:bg-opacity-80"
                >
                  {availabilityLabels[availabilityStatus]}
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
                  aria-label="Notifications"
                  aria-expanded={showNotifications}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative rounded-lg p-2 transition-colors hover:bg-[#F8FAFC]"
                >
                  <Bell className="h-5 w-5 text-[#64748B]" />
                  {(notifications.query.data?.unread_count || 0) > 0 && (
                    <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[#B83E00]" />
                  )}
                </button>
                {showNotifications && <NotificationDropdown onNavigate={()=>setShowNotifications(false)} items={notifications.items} loading={notifications.query.isLoading} error={notifications.query.isError}
                  unreadCount={notifications.query.data?.unread_count}
                  onRead={id => notifications.markRead.mutate(id, {onError: () => toast.error('Could not mark notification read.')})}
                  onReadAll={() => notifications.markAllRead.mutate(undefined, {onError: () => toast.error('Could not mark notifications read.')})}
                  isUpdating={notifications.markAllRead.isPending}
                  hasNext={Boolean(notifications.query.data?.next)} hasPrevious={Boolean(notifications.query.data?.previous)}
                  onNext={() => notifications.setPage(page => page + 1)} onPrevious={() => notifications.setPage(page => Math.max(1, page - 1))} />}
              </div>

              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  aria-expanded={showUserMenu}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="transition-opacity hover:opacity-80"
                >
                  {/* Named by text rather than aria-label so the visible initials never contradict the name. */}
                  <span className="sr-only">Account menu</span>
                  <span aria-hidden="true"><InitialsAvatar name={displayName} size="sm" /></span>
                </button>
                {showUserMenu && (
                  <UserMenuDropdown
                    userName={displayName}
                    userEmail={auth.user?.email}
                    myProfileId={myProfileId} isPublished={currentProfile.data?.visibility === 'public'}
                    isStaff={Boolean(auth.user?.isStaff)}
                    onNavigate={() => setShowUserMenu(false)}
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

      <nav aria-label="Main" className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 gap-1 border-t border-[#E2E8F0] bg-white px-1 py-2 lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(location.pathname, item.matches);
          const badge = item.path === '/requests' ? pendingIncoming : 0;

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-xs font-medium ${
                isActive ? 'bg-[#FFF3EA] text-[#B83E00]' : 'text-[#475569]'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span>{item.label}</span>
              {badge > 0 && <span className="absolute right-1/4 top-1 min-w-[1.25rem] rounded-full bg-[#B83E00] px-1 text-center text-[10px] font-semibold text-white" aria-label={`${badge} need your action`}>{badge}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
