import { useEffect, useRef, useState } from "react";
import { connectSocket } from "../lib/socket";

// Sent no more often than this regardless of how fast the GPS itself
// updates — matches the server's own MIN_LOCATION_UPDATE_INTERVAL_MS (see
// setupSocket.js) so this doesn't rely on the server-side throttle alone
// to keep from flooding the socket with every tiny GPS jitter.
const CLIENT_THROTTLE_MS = 3000;

/**
 * The collector side of live tracking — while `active` is true, watches
 * the device's position and emits it to the pickup's room. The requester
 * side (useLiveLocation) just listens; all the actual GPS access and
 * permission handling lives here.
 *
 * @param {string|null} pickupId
 * @param {boolean} active - the collector's own "Share my location" toggle
 */
export default function useLocationSharing(pickupId, active) {
  // Same keyed-result approach as useLiveLocation — avoids a synchronous
  // setState(null) at the top of the effect when sharing turns off or the
  // pickup changes; the "no error for this state" case is derived below
  // instead of set explicitly.
  const [result, setResult] = useState({ key: null, error: null });
  const key = `${pickupId || ""}:${active}`;
  const lastSentAtRef = useRef(0);

  useEffect(() => {
    if (!active || !pickupId) return;

    if (!navigator.geolocation) {
      setResult({ key, error: "Location isn't available on this device." });
      return;
    }

    const socket = connectSocket();
    socket.emit("joinPickup", pickupId);

    const onLocationError = (msg) => setResult({ key, error: msg });
    socket.on("locationError", onLocationError);

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastSentAtRef.current < CLIENT_THROTTLE_MS) return;
        lastSentAtRef.current = now;
        socket.emit("collectorLocationUpdate", {
          pickupId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      () => setResult({ key, error: "Couldn't access your location — check location permissions." }),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      socket.emit("leavePickup", pickupId);
      socket.off("locationError", onLocationError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupId, active]);

  return { error: result.key === key ? result.error : null };
}