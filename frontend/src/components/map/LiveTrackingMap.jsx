import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// A distinct colored dot for the collector's live position, rather than
// reusing the same pin as the destination — with two markers on one map,
// they need to read as different things at a glance, not just be
// distinguishable by which one happens to be moving.
const collectorIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#c05621;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Recenters/refits the map whenever the collector's position changes,
// rather than leaving the view fixed on wherever it first opened — the
// whole point of a live map is that it keeps both points in frame as one
// of them moves.
function FitBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(points, { padding: [32, 32], maxZoom: 16 });
  }, [map, points]);
  return null;
}

/**
 * Shows a destination pin and, once available, the collector's live
 * position as a separate moving marker with a dashed line between them.
 * Falls back to a static single-marker view (destination only) when no
 * live position has arrived yet — e.g. the collector hasn't turned
 * sharing on — rather than showing an empty map or an error.
 */
export default function LiveTrackingMap({ destination, collectorPosition, height = 240 }) {
  if (typeof destination?.lat !== "number" || typeof destination?.lng !== "number") return null;

  const points = collectorPosition
    ? [
        [destination.lat, destination.lng],
        [collectorPosition.lat, collectorPosition.lng],
      ]
    : [[destination.lat, destination.lng]];

  return (
    <div style={{ height }} className="rounded-md overflow-hidden border border-line">
      <MapContainer
        center={[destination.lat, destination.lng]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <Marker position={[destination.lat, destination.lng]}>
          <Popup>Pickup location</Popup>
        </Marker>
        {collectorPosition && (
          <>
            <Marker position={[collectorPosition.lat, collectorPosition.lng]} icon={collectorIcon}>
              <Popup>Collector</Popup>
            </Marker>
            <Polyline
              positions={points}
              pathOptions={{ color: "#c05621", weight: 2, dashArray: "6 6" }}
            />
          </>
        )}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}