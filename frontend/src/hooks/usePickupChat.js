import { useEffect, useState, useCallback } from "react";
import { getMessages, sendMessage as sendMessageApi } from "../services/messageService";
import { connectSocket } from "../lib/socket";

export default function usePickupChat(pickupId, open) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || !pickupId) return;

    let cancelled = false;
    const socket = connectSocket();

    setLoading(true);
    setError("");

    getMessages(pickupId)
      .then((res) => {
        if (!cancelled) setMessages(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the conversation.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    socket.emit("joinPickup", pickupId);

    const onNewMessage = (msg) => {
      if (msg.pickup === pickupId) setMessages((prev) => [...prev, msg]);
    };
    const onChatError = (msg) => {
      if (!cancelled) setError(msg);
    };

    socket.on("newMessage", onNewMessage);
    socket.on("chatError", onChatError);

    return () => {
      cancelled = true;
      socket.emit("leavePickup", pickupId);
      socket.off("newMessage", onNewMessage);
      socket.off("chatError", onChatError);
    };
  }, [pickupId, open]);

  const send = useCallback(
    async (text) => {
      if (!text.trim()) return;
      setSending(true);
      try {
        await sendMessageApi(pickupId, text.trim());
        // No optimistic append — the socket "newMessage" echo (sent to the
        // whole room, including the sender) is the single source of truth,
        // so we never risk showing a duplicate.
      } catch {
        setError("Message didn't send. Try again.");
      } finally {
        setSending(false);
      }
    },
    [pickupId]
  );

  return { messages, loading, error, sending, send };
}