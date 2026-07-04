import { useState } from "react";

// status: "idle" | "locating" | "success" | "error"
export default function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const locate = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Your browser doesn't support location access.");
      return;
    }

    setStatus("locating");
    setError("");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("success");
      },
      (err) => {
        setStatus("error");
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location access was denied. Enable it in your browser settings."
            : "Couldn't get your location. Try again."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return { coords, status, error, locate };
}