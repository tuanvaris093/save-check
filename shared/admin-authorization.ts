export const ADMIN_PASSWORD_SALT = "safecheck:admin-password";
export const ADMIN_PASSWORD_ITERATIONS = 600_000;
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
