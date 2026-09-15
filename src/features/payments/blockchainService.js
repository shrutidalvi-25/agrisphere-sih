// Anchors a payment's hash to Bitcoin via OpenTimestamps — a free, public
// timestamping protocol. No wallet, no private key, no gas: we submit the
// hash's raw bytes to a free public "calendar" server, which later batches
// thousands of submissions from everyone into a single Bitcoin transaction
// (that batching is what makes it free). The calendar returns a proof
// immediately; the underlying Bitcoin confirmation typically lands within
// a few hours, at which point the timestamp becomes independently
// verifiable by anyone — not just checkable against our own database.
//
// This calls the calendar's raw HTTP API directly rather than pulling in
// the official `opentimestamps` npm client, which is old, unmaintained,
// built for Node (not a browser bundle), and pulls in packages with known
// critical vulnerabilities. The tradeoff: we store the calendar's raw
// pending-attestation proof rather than assembling a complete, portable
// .ots file, so today's proof isn't yet openable in third-party OTS
// tools — it's independently timestamped and auditable, but "download a
// .ots file for outside verification" is a follow-up, not done here.
const CALENDAR_SERVERS = [
  'https://alice.btc.calendar.opentimestamps.org',
  'https://bob.btc.calendar.opentimestamps.org',
  'https://finney.calendar.eternitywall.com',
]

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

function bytesToBase64(bytes) {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

// `hash` is our existing SHA-256 hex digest (from paymentService's hash
// chain) — already the right shape for a calendar digest, so we submit it
// directly rather than hashing it again.
export async function anchorHash(hash) {
  const digest = hexToBytes(hash)

  for (const calendarUrl of CALENDAR_SERVERS) {
    try {
      // No explicit headers: fetch sends no Content-Type for a raw
      // Uint8Array body, which keeps this a CORS "simple request" and
      // skips the preflight OPTIONS call — these calendar servers 404 on
      // OPTIONS, so a preflight-triggering header (like an explicit
      // Content-Type) gets the whole request blocked by the browser
      // before it's even sent.
      const res = await fetch(`${calendarUrl}/digest`, {
        method: 'POST',
        body: digest,
      })
      if (!res.ok) continue

      const proofBytes = new Uint8Array(await res.arrayBuffer())
      return {
        calendarUrl,
        proofBase64: bytesToBase64(proofBytes),
        submittedAt: new Date().toISOString(),
      }
    } catch {
      // try the next calendar server
    }
  }
  return null
}

export function isAnchoringConfigured() {
  return true // no wallet or key required — always available
}
