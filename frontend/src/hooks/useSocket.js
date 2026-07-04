import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
  /\/api\/?$/,
  ""
);

/**
 * Subscribes to a socket.io event for the component's lifetime.
 * @param {string} event - "newPickup" | "updatePickup"
 * @param {(payload: any) => void} handler
 */
export default function useSocket(event, handler) {
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket"] });
    socket.on(event, (payload) => handlerRef.current?.(payload));
    return () => socket.disconnect();
  }, [event]);
}