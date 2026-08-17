import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiBell, FiCheck, FiCheckCircle } from 'react-icons/fi';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/ApiClient';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Returns true if the notification is less than 7 days old */
const isWithinOneWeek = (notification) => {
  if (!notification.created_at) return true;
  return Date.now() - new Date(notification.created_at).getTime() < ONE_WEEK_MS;
};

const requestBrowserPermission = async () => {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return await Notification.requestPermission();
};

const fireBrowserNotification = (title, body) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const n = new Notification(title, {
    body,
    icon: '/favicon.png',
    badge: '/favicon.png',
    tag: 'leave-system',
  });
  n.onclick = () => {
    window.focus();
    n.close();
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

export const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  // Only unread + within-one-week notifications are stored here
  const [notifications, setNotifications] = useState([]);
  // IDs currently animating out (fade-out before removal)
  const [removingIds, setRemovingIds] = useState(new Set());
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const notifiedIds = useRef(new Set());

  // ── Permission: ask once on mount ─────────────────────────────────────────
  useEffect(() => {
    requestBrowserPermission();
  }, []);

  // ── Filter helper: unread + within one week ────────────────────────────────
  const filterVisible = (items) =>
    items.filter((item) => !item.is_read && isWithinOneWeek(item));

  // ── Fetch unread count + fire OS notifications for new ones ────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadNotificationCount();
      const count = res.data.unread_count || 0;
      setUnreadCount(count);

      if (count > 0) {
        const listRes = await getNotifications();
        const items = listRes.data.results || listRes.data || [];
        const visible = filterVisible(items);

        visible.forEach((item) => {
          if (!notifiedIds.current.has(item.id)) {
            notifiedIds.current.add(item.id);
            fireBrowserNotification(
              'Leave System – New Notification',
              item.message || 'You have a new notification.'
            );
          }
        });
      }
    } catch (err) {
      console.error('Failed to fetch unread notification count', err);
    }
  }, []);

  // ── Fetch the full list for the dropdown (only unread, within a week) ──────
  const fetchNotificationsList = async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      const items = res.data.results || res.data || [];
      setNotifications(filterVisible(items));
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 15 s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Load full list when the dropdown opens
  useEffect(() => {
    if (isOpen) fetchNotificationsList();
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Pop a notification out with a fade animation, then remove it ────────────
  const popNotification = (id) => {
    setRemovingIds((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }, 300); // matches the CSS transition duration
  };

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      popNotification(id);
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      // Animate all out, then clear
      const allIds = notifications.map((n) => n.id);
      setRemovingIds(new Set(allIds));
      setTimeout(() => {
        setNotifications([]);
        setRemovingIds(new Set());
        setUnreadCount(0);
      }, 300);
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const getBadgeStyle = (type) => {
    switch (type) {
      case 'LEAVE_APPROVED':  return 'bg-emerald-100 text-emerald-800';
      case 'LEAVE_REJECTED':  return 'bg-rose-100 text-rose-800';
      case 'LEAVE_CANCELLED': return 'bg-amber-100 text-amber-800';
      default:                return 'bg-blue-100 text-blue-800';
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition flex items-center justify-center focus:outline-none"
        title="Notifications"
      >
        <FiBell className="text-xl" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 bg-rose-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-100">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Unread · last 7 days</p>
            </div>
            {notifications.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition"
              >
                <FiCheckCircle /> Mark all as read
              </button>
            )}
          </div>

          {/* Browser permission nudge */}
          {'Notification' in window && Notification.permission === 'default' && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between gap-2">
              <p className="text-[11px] text-amber-700">Enable browser notifications to get OS pop-ups.</p>
              <button
                onClick={requestBrowserPermission}
                className="text-[11px] font-bold text-amber-800 underline shrink-0"
              >
                Enable
              </button>
            </div>
          )}

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading notifications...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <FiBell className="text-3xl text-slate-200 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">You're all caught up!</p>
                <p className="text-[11px] text-slate-300 mt-1">No unread notifications.</p>
              </div>
            ) : (
              notifications.map((item) => {
                const isRemoving = removingIds.has(item.id);
                return (
                  <div
                    key={item.id}
                    style={{
                      transition: 'opacity 300ms ease, transform 300ms ease, max-height 300ms ease',
                      opacity: isRemoving ? 0 : 1,
                      transform: isRemoving ? 'translateX(16px)' : 'translateX(0)',
                      maxHeight: isRemoving ? '0' : '200px',
                      overflow: 'hidden',
                    }}
                    className="p-3.5 hover:bg-slate-50 flex items-start justify-between gap-3 bg-blue-50/40"
                  >
                    <div className="space-y-1 flex-1">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${getBadgeStyle(
                          item.notification_type
                        )}`}
                      >
                        {item.notification_type?.replace('LEAVE_', '')}
                      </span>
                      <p className="text-xs text-slate-700 leading-snug">{item.message}</p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(item.created_at).toLocaleString()}
                      </p>
                    </div>
                    {/* Mark as read — pops it out */}
                    <button
                      onClick={() => handleMarkRead(item.id)}
                      className="text-slate-400 hover:text-blue-600 p-1 transition shrink-0"
                      title="Mark as read"
                    >
                      <FiCheck className="text-sm" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
