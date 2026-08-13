import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiBell, FiCheck, FiCheckCircle } from 'react-icons/fi';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/ApiClient';

// ─── Browser Notification Helpers ────────────────────────────────────────────

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
    tag: 'leave-system', // groups so they don't stack infinitely
  });
  // Focus the tab when the user clicks the OS notification
  n.onclick = () => {
    window.focus();
    n.close();
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

export const NotificationBell = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Track which notification IDs have already triggered an OS popup
  const notifiedIds = useRef(new Set());

  // ── Permission: ask once on mount ──────────────────────────────────────────
  useEffect(() => {
    requestBrowserPermission();
  }, []);

  // ── Fetch unread count + fire OS notifications for new ones ────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadNotificationCount();
      const count = res.data.unread_count || 0;
      setUnreadCount(count);

      // Only bother fetching full list to check for new items if there are unread ones
      if (count > 0) {
        const listRes = await getNotifications();
        const items = listRes.data.results || listRes.data || [];

        items.forEach((item) => {
          if (!item.is_read && !notifiedIds.current.has(item.id)) {
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

  // ── Fetch the full list for the dropdown ──────────────────────────────────
  const fetchNotificationsList = async () => {
    setLoading(true);
    try {
      const res = await getNotifications();
      const items = res.data.results || res.data || [];
      setNotifications(items);
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

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
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
            <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
            {unreadCount > 0 && (
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
              <div className="p-6 text-center text-xs text-slate-400">No notifications found.</div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 hover:bg-slate-50 transition flex items-start justify-between gap-3 ${
                    !item.is_read ? 'bg-blue-50/40' : ''
                  }`}
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
                  {!item.is_read && (
                    <button
                      onClick={() => handleMarkRead(item.id)}
                      className="text-slate-400 hover:text-blue-600 p-1 transition"
                      title="Mark as read"
                    >
                      <FiCheck className="text-sm" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
