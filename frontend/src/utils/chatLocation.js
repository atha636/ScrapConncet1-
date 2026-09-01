// A shared live location is encoded as plain text using a recognizable
// prefix + a real Google Maps URL — no backend/schema changes needed
// (Message.text is just a string), and it degrades gracefully anywhere
// that isn't running this frontend's chat renderer: pasted elsewhere, in
// a push notification preview, in the /docs Swagger "try it out" response,
// it's still a normal clickable Maps link, not an opaque blob.
const LOCATION_PREFIX = "📍 Live location:";

export function encodeLocationMessage(lat, lng) {
  return `${LOCATION_PREFIX} https://www.google.com/maps?q=${lat},${lng}`;
}

// Returns { lat, lng, mapsUrl } if `text` is a shared-location message,
// otherwise null. Deliberately tolerant of the exact coordinate format
// (integers, negatives, varying decimal precision) since it's just parsing
// back out of the URL we generated.
export function parseLocationMessage(text) {
  if (!text?.startsWith(LOCATION_PREFIX)) return null;

  const match = text.match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (!match) return null;

  return { lat: parseFloat(match[1]), lng: parseFloat(match[2]), mapsUrl: text.slice(LOCATION_PREFIX.length).trim() };
}