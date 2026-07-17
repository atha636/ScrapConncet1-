import { io } from "socket.io-client";

const SOCKET_URL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
  /\/api\/?$/,
  ""
);

let socket = null;


export function getSocket() {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    transports: ["websocket"],
    autoConnect: false,
    auth: (cb) => cb({ token: localStorage.getItem("token") }),
  });

  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) s.connect();
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) socket.disconnect();
}