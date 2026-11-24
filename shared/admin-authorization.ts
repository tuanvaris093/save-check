export const ADMIN_PASSWORD_SALT = "safecheck:admin-password";
export const ADMIN_PASSWORD_ITERATIONS = 600_000;
const SESSION_DURATION = 24 * 60 * 60 * 1000;
const CLOCK_TOLERANCE = 5 * 60 * 1000;
const TOKEN_PREFIX = "sv2";
const encoder = new TextEncoder();

function hex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function adminPasswordVerifier(password: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const value = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: encoder.encode(ADMIN_PASSWORD_SALT),
      iterations: ADMIN_PASSWORD_ITERATIONS,
    },
    key,
    256,
  );
  return hex(value);
}

function sessionKey(password: string, usage: "sign" | "verify") {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export async function createAdminSession(password: string, now = Date.now()) {
  const expiresAt = now + SESSION_DURATION;
  const payload = `${TOKEN_PREFIX}.${expiresAt}`;
  const key = await sessionKey(password, "sign");
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return { token: `${payload}.${hex(signature)}`, expiresAt };
}

export async function isAdminTokenValid(
  password: string,
  token: string,
  now = Date.now(),
) {
  const match = /^(sv2\.(\d{13}))\.([a-f0-9]{64})$/.exec(token);
  if (!match) return false;
  const [, payload, expiry, signature] = match;
  const expiresAt = Number(expiry);
  if (expiresAt <= now || expiresAt > now + SESSION_DURATION + CLOCK_TOLERANCE)
    return false;

  const key = await sessionKey(password, "verify");
  const bytes = Uint8Array.from({ length: 32 }, (_, i) =>
    Number.parseInt(signature.slice(i * 2, i * 2 + 2), 16),
  );
  return crypto.subtle.verify("HMAC", key, bytes, encoder.encode(payload));
}
