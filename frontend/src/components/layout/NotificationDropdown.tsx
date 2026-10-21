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

interface NotificationDropdownProps {
  items?: NotificationItem[];
  loading?: boolean;
  error?: boolean;
  onNavigate?: () => void;
  onRead?: (id: string) => void;
  onReadAll?: () => void;
  unreadCount?: number;
  isUpdating?: boolean;
  hasNext?: boolean; hasPrevious?: boolean;
  onNext?: () => void; onPrevious?: () => void;
}

export function NotificationDropdown({ items = [], loading = false, error = false, onNavigate, onRead, onReadAll, unreadCount: totalUnread, isUpdating = false, hasNext, hasPrevious, onNext, onPrevious }: NotificationDropdownProps) {
  const list = items;
  const unreadCount = totalUnread ?? list.filter((n) => !n.read).length;

  return (
    <div className="absolute right-0 top-12 w-[min(24rem,calc(100vw-2rem))] bg-white rounded-xl shadow-lg border border-[#E2E8F0] overflow-hidden z-50">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
        <h3 className="font-semibold text-[#0F172A]">Notifications</h3>
        {unreadCount > 0 && (
          <span className="px-2 py-0.5 bg-[#B83E00] text-white text-xs font-medium rounded-full">
            {unreadCount} new
          </span>
        )}
      </div>

      {onReadAll && unreadCount > 0 && <button type="button" disabled={isUpdating} onClick={onReadAll} className="p-3 text-sm text-[#13294B]">Mark all read</button>}
      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto">
        {loading && <p role="status" className="p-4">Loading activity…</p>}
        {error && <p role="alert" className="p-4">Could not load recent activity. Open Requests to retry.</p>}
        {list.length > 0 ? (
          list.map((notification) => (
            <Link
              key={notification.id}
              to={notification.href}
              onClick={() => { onRead?.(notification.id); onNavigate?.(); }}
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
                      <div className="w-2 h-2 bg-[#B83E00] rounded-full flex-shrink-0 mt-1"></div>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] mb-1">{notification.description}</p>
                  {notification.timeLabel && <p className="text-xs text-[#64748B]">{notification.timeLabel}</p>}
                </div>
              </div>
            </Link>
          ))
        ) : (
          !loading && !error && <div className="px-4 py-8 text-center">
            <Bell className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
            <p className="text-sm text-[#64748B]">No notifications yet</p>
          </div>
        )}
      </div>

      {(hasPrevious || hasNext) && <div className="flex justify-between p-3" aria-label="Notification pages">
        <button disabled={!hasPrevious} onClick={onPrevious}>Previous</button><button disabled={!hasNext} onClick={onNext}>Next</button>
      </div>}
      {/* Footer */}
      {list.length > 0 && (
        <div className="px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <Link to="/requests" onClick={onNavigate} className="text-sm text-[#13294B] font-medium hover:text-[#B83E00] transition-colors">
            Open requests
          </Link>
        </div>
      )}
    </div>
  );
}
