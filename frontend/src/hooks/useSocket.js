import { useEffect, useRef } from "react";
import { connectSocket } from "../lib/socket";

/**
 * Subscribes to a socket.io event for the component's lifetime, using the
 * shared authenticated connection.
 * @param {string} event - "newPickup" | "updatePickup"
 * @param {(payload: any) => void} handler
 */
export default function useSocket(event, handler) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const socket = connectSocket();
    const onEvent = (payload) => handlerRef.current?.(payload);
    socket.on(event, onEvent);
    return () => socket.off(event, onEvent);
  }, [event]);
}