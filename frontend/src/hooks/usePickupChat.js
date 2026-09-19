import { useEffect, useState, useCallback, useRef } from "react";
import { getMessages, sendMessage as sendMessageApi, markMessagesRead } from "../services/messageService";
import { connectSocket } from "../lib/socket";

// How long after the last keystroke before "typing" is assumed to have
// stopped and stopTyping fires on its own — a person who stops typing
// without sending anything (got distracted, changed their mind) shouldn't
// leave the other side seeing "is typing…" forever.
const TYPING_STOP_DELAY_MS = 2500;

export default function usePickupChat(pickupId, open, currentUserId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [otherPartyTyping, setOtherPartyTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  useEffect(() => {
    if (!open || !pickupId) return;

    let cancelled = false;
    const socket = connectSocket();

    setLoading(true);
    setError("");

    getMessages(pickupId)
      .then((res) => {
        if (!cancelled) setMessages(res.data);
        // Opening the conversation is what "reading" it means here — best
        // effort, so a failure here never blocks the messages themselves
        // from showing.
        markMessagesRead(pickupId).catch(() => {});
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load the conversation.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    socket.emit("joinPickup", pickupId);

    const onNewMessage = (msg) => {
      if (msg.pickup !== pickupId) return;
      setMessages((prev) => [...prev, msg]);
      // A message arriving while the conversation is already open counts
      // as read immediately — there's no unread state to leave lingering
      // just because the chat window happened to already be in front of
      // the person.
      if (msg.sender?._id !== currentUserId) markMessagesRead(pickupId).catch(() => {});
    };
    const onChatError = (msg) => {
      if (!cancelled) setError(msg);
    };
    const onTyping = (payload) => {
      if (payload.pickupId === pickupId && payload.userId !== currentUserId) setOtherPartyTyping(true);
    };
    const onStopTyping = (payload) => {
      if (payload.pickupId === pickupId && payload.userId !== currentUserId) setOtherPartyTyping(false);
    };
    // The other party reading messages I sent — flip readAt locally on
    // whatever I've already sent so the checkmark updates without
    // refetching the whole conversation.
    const onMessagesRead = (payload) => {
      if (payload.pickupId !== pickupId) return;
      setMessages((prev) =>
        prev.map((m) => (m.sender?._id !== payload.readBy && !m.readAt ? { ...m, readAt: payload.at } : m))
      );
    };

    socket.on("newMessage", onNewMessage);
    socket.on("chatError", onChatError);
    socket.on("typing", onTyping);
    socket.on("stopTyping", onStopTyping);
    socket.on("messagesRead", onMessagesRead);

    return () => {
      cancelled = true;
      clearTimeout(typingTimeoutRef.current);
      socket.emit("leavePickup", pickupId);
      socket.off("newMessage", onNewMessage);
      socket.off("chatError", onChatError);
      socket.off("typing", onTyping);
      socket.off("stopTyping", onStopTyping);
      socket.off("messagesRead", onMessagesRead);
    };
  }, [pickupId, open, currentUserId]);

  const send = useCallback(
    async (text, imageFile) => {
      if (!text?.trim() && !imageFile) return;
      setSending(true);
      // Sending counts as no longer typing — stops the other party's
      // indicator from lagging behind a message that already arrived.
      isTypingRef.current = false;
      clearTimeout(typingTimeoutRef.current);
      connectSocket().emit("stopTyping", pickupId);
      try {
        await sendMessageApi(pickupId, text?.trim(), imageFile);
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

  // Called on every composer keystroke — cheaply no-ops if already in the
  // "typing" state so this doesn't re-emit on every character, only on the
  // leading edge and after the trailing pause.
  const notifyTyping = useCallback(() => {
    const socket = connectSocket();
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing", pickupId);
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("stopTyping", pickupId);
    }, TYPING_STOP_DELAY_MS);
  }, [pickupId]);

  return { messages, loading, error, sending, send, otherPartyTyping, notifyTyping };
}