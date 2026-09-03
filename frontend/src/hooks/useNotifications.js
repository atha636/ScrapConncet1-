import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notificationService";
import useSocket from "./useSocket";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

// Mirrors NotificationBell's own per-type styling so a toast and its
// eventual entry in the bell dropdown read as the same event, not two
// unrelated designs.
const TOAST_TYPE = {
  pickup_accepted: "success",
  status_update: "info",
  new_message: "info",
};

function toastTitle(n) {
  if (n.type === "pickup_accepted") return "Pickup accepted";
  if (n.type === "status_update") return "Status updated";
  if (n.type === "new_message") return "New message";
  return "Notification";
}

export default function useNotifications() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications({ limit: 20 });
      setItems(res.data.data);
      setUnreadCount(res.data.unreadCount);
    } catch {
      // Silently ignore — a failed notification fetch shouldn't block the
      // rest of the app or throw up an error banner for something this minor.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Live delivery — pushed to this user's private room by the backend.
  useSocket("notification", (notification) => {
    setItems((prev) => [notification, ...prev].slice(0, 20));
    setUnreadCount((prev) => prev + 1);

    // The bell badge alone is easy to miss — a toast surfaces the event
    // the moment it happens, without requiring the user to notice a
    // number changed somewhere in the corner. Clicking it goes to the
    // same place NotificationBell's own click handler would.
    showToast({
      title: toastTitle(notification),
      message: notification.text,
      type: TOAST_TYPE[notification.type] || "info",
      onClick: notification.pickup
        ? () => navigate(user?.role === "collector" ? "/collector" : "/my-requests")
        : undefined,
    });
  });

  const markRead = useCallback(async (id) => {
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      await markNotificationRead(id);
    } catch {
      load(); // reconcile with the server if the optimistic update was wrong
    }
  }, [load]);

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      load();
    }
  }, [load]);

  return { items, unreadCount, loading, markRead, markAllRead };
}