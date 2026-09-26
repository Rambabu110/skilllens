import { useEffect, useState, useRef } from "react";
import { Bell, CheckCheck, AlertCircle, Sparkles, BookOpen, X, Award } from "lucide-react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";

function formatRelativeTime(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffInSec = Math.floor((now - date) / 1000);

  if (diffInSec < 60) return "Just now";
  const diffInMin = Math.floor(diffInSec / 60);
  if (diffInMin < 60) return `${diffInMin}m ago`;
  const diffInHours = Math.floor(diffInMin / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

export default function NotificationBell() {
  const { token } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch unread count periodically if logged in
  useEffect(() => {
    if (!token) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    let isMounted = true;

    async function fetchCount() {
      try {
        const res = await client.get("/notifications/unread-count");
        if (isMounted && res.data) {
          setUnreadCount(res.data.unread_count || 0);
        }
      } catch (err) {
        // Ignore background polling errors
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30s
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  // Fetch list when opened
  useEffect(() => {
    if (isOpen && token) {
      setLoading(true);
      client
        .get("/notifications")
        .then((res) => {
          setNotifications(res.data || []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, token]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  async function handleMarkRead(id) {
    try {
      await client.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleMarkAllRead() {
    try {
      await client.post("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  }

  if (!token) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-[#A068FF]/50 text-slate-300 hover:text-white transition-all focus:outline-none"
        title="Notifications & Alerts"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-gradient-to-r from-[#A068FF] to-[#7C3AED] text-[10px] font-bold text-white shadow-sm ring-2 ring-[#060218] animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0c0622]/95 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_25px_rgba(160,104,255,0.15)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#A068FF]" />
              <span className="font-urbanist font-bold text-sm text-white">Cadre Notifications</span>
              {unreadCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#A068FF]/20 text-[#C084FC] border border-[#A068FF]/30 font-semibold font-mono">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-xs font-medium text-[#C084FC] hover:text-[#A068FF] flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {loading ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                <div className="w-5 h-5 rounded-full border-2 border-[#A068FF] border-t-transparent animate-spin" />
                <span className="text-xs">Loading alerts…</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <p className="text-xs text-slate-400">No notifications yet.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  System alerts, gap discoveries and badge achievements will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isUnread = !n.read;
                let Icon = Bell;
                let iconColor = "text-[#C084FC] bg-[#A068FF]/10 border-[#A068FF]/25";

                if (n.type.includes("GAP")) {
                  Icon = AlertCircle;
                  iconColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
                } else if (n.type.includes("BADGE") || n.type.includes("ACHIEVEMENT")) {
                  Icon = Award;
                  iconColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
                } else if (n.type.includes("RECOMMENDATION") || n.type.includes("MODULE")) {
                  Icon = BookOpen;
                  iconColor = "text-sky-400 bg-sky-500/10 border-sky-500/20";
                }

                return (
                  <div
                    key={n.id}
                    onClick={() => isUnread && handleMarkRead(n.id)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                      isUnread
                        ? "bg-[#A068FF]/[0.06] hover:bg-[#A068FF]/[0.1]"
                        : "hover:bg-white/[0.02] opacity-75"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${iconColor}`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-xs text-white truncate font-urbanist">
                          {n.title}
                        </p>
                        <span className="text-[10px] text-slate-500 shrink-0 font-mono">
                          {formatRelativeTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-snug line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                    {isUnread && (
                      <span className="w-2 h-2 rounded-full bg-[#A068FF] shadow-[0_0_8px_#A068FF] shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
