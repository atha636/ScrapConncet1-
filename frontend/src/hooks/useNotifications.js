import { useEffect, useState, useCallback } from "react";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../services/notificationService";
import useSocket from "./useSocket";

export default function useNotifications() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

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