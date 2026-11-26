/** AES-256-GCM with a fresh 96-bit IV per message, written as `iv ‖ ciphertext`. */
const IV_BYTES = 12;

const importKey = (raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> =>
  crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);

export async function seal(
  rawKey: Uint8Array<ArrayBuffer>,
  plaintext: Uint8Array<ArrayBuffer>,
  context: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const additionalData = new TextEncoder().encode(context);
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData }, await importKey(rawKey), plaintext);
  const out = new Uint8Array(IV_BYTES + sealed.byteLength);
  out.set(iv);
  out.set(new Uint8Array(sealed), IV_BYTES);
  return out;
}

/** `undefined` when the key or the context is not the one it was sealed with, or the bytes were changed. */
export async function unseal(
  rawKey: Uint8Array<ArrayBuffer>,
  sealed: Uint8Array<ArrayBuffer>,
  context: string,
): Promise<Uint8Array<ArrayBuffer> | undefined> {
  if (sealed.byteLength <= IV_BYTES) return undefined;
  try {
    const additionalData = new TextEncoder().encode(context);
    const iv = sealed.slice(0, IV_BYTES);
    const opened = await crypto.subtle.decrypt({ name: "AES-GCM", iv, additionalData }, await importKey(rawKey), sealed.slice(IV_BYTES));
    return new Uint8Array(opened);
  } catch {
    return undefined;
  }
}

export const newDataKey = (): Uint8Array<ArrayBuffer> => crypto.getRandomValues(new Uint8Array(32));
