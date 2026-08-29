// Minimal VAPID (RFC 8292) sender for payload-free web pushes.
// Payload-free pushes need no message encryption; the service worker fetches
// the daily brief itself when woken.

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function b64urlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(raw, (ch) => ch.charCodeAt(0));
}

async function importVapidKey(privateJwk: string) {
  return crypto.subtle.importKey(
    "jwk",
    JSON.parse(privateJwk) as JsonWebKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
}

export async function sendPush(
  endpoint: string,
  publicKey: string,
  privateJwk: string,
): Promise<number> {
  const audience = new URL(endpoint).origin;
  const header = b64url(
    new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })),
  );
  const claims = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: "mailto:push@sahadeva.app",
      }),
    ),
  );
  const key = await importVapidKey(privateJwk);
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      new TextEncoder().encode(`${header}.${claims}`),
    ),
  );
  const jwt = `${header}.${claims}.${b64url(signature)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      TTL: "3600",
      Urgency: "normal",
      Authorization: `vapid t=${jwt}, k=${publicKey}`,
    },
  });
  return response.status;
}

export { b64urlToBytes };
