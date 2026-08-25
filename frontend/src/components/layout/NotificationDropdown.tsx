import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { InitialsAvatar } from '../ui/InitialsAvatar';

export interface NotificationItem {
  id: string;
  type: 'request' | 'accepted' | 'profile' | 'saved';
  title: string;
  description: string;
  href: string;
  timeLabel?: string;
  from?: string;
  read: boolean;
}

const sampleNotifications: NotificationItem[] = [
  // TODO: Replace this local sample list with a backend-derived notification endpoint (e.g. GET /api/notifications/).
  {
    id: 'sample-1',
    type: 'request',
    title: 'New help request',
    description: 'Maya Johnson sent a request for resume review',
    href: '/requests',
    timeLabel: '2h ago',
    from: 'Maya Johnson',
    read: false,
  },
  {
    id: 'sample-2',
    type: 'accepted',
    title: 'Request accepted',
    description: 'Daniel Kim accepted your Figma design review request',
    href: '/connections',
    timeLabel: '5h ago',
    from: 'Daniel Kim',
    read: false,
  },
  {
    id: 'sample-3',
    type: 'profile',
    title: 'Availability updated',
    description: 'Sofia Garcia updated availability for this week',
    href: '/profile/edit',
    timeLabel: '1d ago',
    from: 'Sofia Garcia',
    read: true,
  },
];

interface NotificationDropdownProps {
  items?: NotificationItem[];
  showSamples?: boolean;
}

export function NotificationDropdown({ items, showSamples = true }: NotificationDropdownProps) {
  const list = items && items.length ? items : showSamples ? sampleNotifications : [];
  const unreadCount = list.filter((n) => !n.read).length;

  return (
    <div className="absolute right-0 top-12 w-96 bg-white rounded-xl shadow-lg border border-[#E2E8F0] overflow-hidden z-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
        <h3 className="font-semibold text-[#0F172A]">Notifications</h3>
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 bg-[#FF5F05] text-white text-xs font-medium rounded-full">
            {unreadCount} new
          </span>
        )}
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {list.length > 0 ? (
          list.map((notification) => (
            <Link
              key={notification.id}
              to={notification.href}
              className={`px-4 py-3 hover:bg-[#F8FAFC] transition-colors cursor-pointer border-b border-[#E2E8F0] last:border-0 ${
                !notification.read ? 'border-l-4 border-l-[#FF5F05] bg-[#FFFBF7]' : ''
              }`}
            >
              <div className="flex gap-3">
                {notification.from && (
                  <InitialsAvatar name={notification.from} size="sm" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-sm font-medium text-[#0F172A]">{notification.title}</h4>
                    {!notification.read && (
                      <div className="w-2 h-2 bg-[#FF5F05] rounded-full flex-shrink-0 mt-1"></div>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] mb-1">{notification.description}</p>
                  {notification.timeLabel && <p className="text-xs text-[#64748B]">{notification.timeLabel}</p>}
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="px-4 py-8 text-center">
            <Bell className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
            <p className="text-sm text-[#64748B]">No notifications yet</p>
          </div>
        )}
      </div>

      {/* Footer */}
      {list.length > 0 && (
        <div className="px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <button type="button" className="text-sm text-[#13294B] font-medium hover:text-[#FF5F05] transition-colors">
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
