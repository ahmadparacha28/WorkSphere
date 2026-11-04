import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  X,
  RefreshCw
} from "lucide-react";

import api from "../services/api";
import "./NotificationBell.css";

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await api.get("/Notification/unread-count");
      setUnreadCount(response.data.unreadCount ?? 0);
    } catch (err) {
      console.error("Unable to load unread notifications:", err);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/Notification");

      setNotifications(
        Array.isArray(response.data) ? response.data : []
      );

      await loadUnreadCount();
    } catch (err) {
      console.error("Unable to load notifications:", err);
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [loadUnreadCount]);

  useEffect(() => {
    loadUnreadCount();

    const interval = setInterval(loadUnreadCount, 30000);

    return () => clearInterval(interval);
  }, [loadUnreadCount]);

  const toggleDropdown = () => {
    const nextState = !open;
    setOpen(nextState);

    if (nextState) {
      loadNotifications();
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/Notification/${id}/read`);

      setNotifications((previous) =>
        previous.map((item) =>
          item.id === id ? { ...item, isRead: true } : item
        )
      );

      setUnreadCount((previous) => Math.max(0, previous - 1));
    } catch (err) {
      console.error("Unable to mark notification as read:", err);
      setError("Unable to update notification.");
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put("/Notification/read-all");

      setNotifications((previous) =>
        previous.map((item) => ({ ...item, isRead: true }))
      );

      setUnreadCount(0);
    } catch (err) {
      console.error("Unable to mark all as read:", err);
      setError("Unable to update notifications.");
    }
  };

  const deleteNotification = async (id) => {
    const notification = notifications.find(
      (item) => item.id === id
    );

    try {
      await api.delete(`/Notification/${id}`);

      setNotifications((previous) =>
        previous.filter((item) => item.id !== id)
      );

      if (notification && !notification.isRead) {
        setUnreadCount((previous) => Math.max(0, previous - 1));
      }
    } catch (err) {
      console.error("Unable to delete notification:", err);
      setError("Unable to delete notification.");
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="notification-wrapper">
      <button
        type="button"
        className="notification-trigger"
        onClick={toggleDropdown}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={20} />

        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="notification-backdrop"
            onClick={() => setOpen(false)}
          />

          <div className="notification-dropdown">
            <div className="notification-heading">
              <div>
                <h3>Notifications</h3>
                <span>
                  {unreadCount} unread
                </span>
              </div>

              <button
                type="button"
                className="notification-close"
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
              >
                <X size={18} />
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-read-all"
                onClick={markAllAsRead}
              >
                <CheckCheck size={15} />
                Mark all as read
              </button>
            )}

            {error && (
              <div className="notification-error">
                {error}
                <button onClick={() => setError("")}>×</button>
              </div>
            )}

            <div className="notification-list">
              {loading ? (
                <div className="notification-empty">
                  <RefreshCw size={20} />
                  <p>Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="notification-empty">
                  <Bell size={28} />
                  <p>No notifications yet.</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`notification-item ${
                      item.isRead ? "read" : "unread"
                    }`}
                  >
                    <div className="notification-item-content">
                      <div className="notification-item-title">
                        <strong>{item.title}</strong>

                        {!item.isRead && (
                          <span className="notification-unread-dot" />
                        )}
                      </div>

                      <p>{item.message}</p>

                      <span className="notification-date">
                        {formatDate(item.createdAt)}
                      </span>
                    </div>

                    <div className="notification-item-actions">
                      {!item.isRead && (
                        <button
                          type="button"
                          title="Mark as read"
                          onClick={() => markAsRead(item.id)}
                        >
                          <Check size={16} />
                        </button>
                      )}

                      <button
                        type="button"
                        title="Delete notification"
                        onClick={() => deleteNotification(item.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              className="notification-refresh"
              onClick={loadNotifications}
              disabled={loading}
            >
              <RefreshCw size={14} />
              Refresh notifications
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default NotificationBell;