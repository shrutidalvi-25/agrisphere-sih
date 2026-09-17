// Straight-line (Haversine) distance between two lat/lng points, in km.
// No API key, no network call, no cost — a deliberate trade-off: this is
// "as the crow flies" distance, not real road distance, so it can
// understate actual travel distance where roads aren't direct. Good
// enough for a rough transport-cost estimate without any external
// service dependency.
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}
