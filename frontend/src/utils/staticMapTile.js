/**
 * Converts a lat/lng into the OSM tile that contains it, plus the exact
 * fractional position of that point *within* that tile (as a 0–100%
 * offset). This is what lets a thumbnail show a single static tile image
 * — no map library, no interactivity, one lightweight HTTP request — while
 * still placing a pin at the mathematically correct spot on top of it,
 * rather than just centering the tile and hoping the point is close
 * enough to the middle.
 *
 * Standard Slippy Map tilenames formula (used by every OSM-compatible tile
 * server): https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
 */
export function latLngToTile(lat, lng, zoom) {
  const latRad = (lat * Math.PI) / 180;
  const n = 2 ** zoom;

  const xExact = ((lng + 180) / 360) * n;
  const yExact = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;

  const x = Math.floor(xExact);
  const y = Math.floor(yExact);

  return {
    x,
    y,
    z: zoom,
    // Fractional position within this specific tile, as a percentage —
    // exactly where to place a pin so it lands on the real coordinate.
    pinXPercent: (xExact - x) * 100,
    pinYPercent: (yExact - y) * 100,
  };
}

/**
 * Builds the OSM standard tile URL for a given tile coordinate. Uses the
 * single `tile.openstreetmap.org` host (not the older sharded a/b/c.tile.
 * subdomains) per OSM's current tile usage policy, which discourages
 * subdomain-sharding against their standard server.
 */
export function tileUrl(x, y, z) {
  return `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;
}