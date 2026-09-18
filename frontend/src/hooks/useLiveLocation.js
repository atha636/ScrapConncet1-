import { useEffect, useState } from "react";
import { connectSocket } from "../lib/socket";

/**
 * Joins a pickup's socket room and tracks the most recent
 * "collectorLocation" event for it — the requester side of live tracking.
 * Reuses the exact same room (and join/leave events) usePickupChat already
 * uses, so opening this view is enough to receive updates; no separate
 * subscription step exists on the server for this.
 *
 * @param {string|null} pickupId
 * @param {boolean} enabled - only join/listen while the tracking view is actually open
 */
export default function useLiveLocation(pickupId, enabled) {
  // Tracks which pickupId a given position belongs to, the same way
  // CollectorProfileCard/PublicProfile key their own async results — lets
  // "no position yet for *this* pickup" be derived by comparison instead
  // of a synchronous setState(null) at the top of the effect body, which
  // react-hooks/set-state-in-effect flags.
  const [result, setResult] = useState({ pickupId: null, position: null });

  useEffect(() => {
    if (!enabled || !pickupId) return;

    const socket = connectSocket();
    socket.emit("joinPickup", pickupId);

    const onLocation = (payload) => {
      if (payload.pickupId === pickupId) setResult({ pickupId, position: payload });
    };
    socket.on("collectorLocation", onLocation);

    return () => {
      socket.emit("leavePickup", pickupId);
      socket.off("collectorLocation", onLocation);
    };
  }, [pickupId, enabled]);

  return result.pickupId === pickupId ? result.position : null;
}