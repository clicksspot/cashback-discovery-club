// Web Crypto keeps encryption compatible with the deployed runtime.
async function encryptionKey(secret: string) {
  if (!secret) throw new Error("Secure credential storage is unavailable.");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptCredentials(value: { sid: string; token: string }, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await encryptionKey(secret), new TextEncoder().encode(JSON.stringify(value)));
  return JSON.stringify({ version: 1, iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) });
}

export async function decryptCredentials(payload: string, secret: string): Promise<{ sid: string; token: string }> {
  try {
    const stored = JSON.parse(payload);
    if (stored.version !== 1) throw new Error();
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: new Uint8Array(stored.iv) }, await encryptionKey(secret), new Uint8Array(stored.data));
    const value = JSON.parse(new TextDecoder().decode(decrypted));
    if (typeof value.sid !== "string" || !value.sid || typeof value.token !== "string" || !value.token) throw new Error();
    return { sid: value.sid, token: value.token };
  } catch {
    throw new Error("Stored Impact credentials could not be read. Please replace them in Settings.");
  }
}