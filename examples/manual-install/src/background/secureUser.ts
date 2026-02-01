/**
 * Secure user storage utilities: AES-GCM encryption + HMAC-SHA-256 integrity.
 * NOTE: This improves confidentiality/integrity versus plain storage but
 * a determined attacker with full local system access can still tamper.
 */

const INSTALL_KEY_STORAGE_KEY = "__vr_secure_install_key";
const USER_SECURE_KEY = "user_secure";

interface SecureEnvelopeV1 {
  v: 1;
  iv: string; // base64
  ct: string; // base64 ciphertext
  mac: string; // base64 HMAC over iv||ct
}

// ---- Base64 helpers ----
function b64encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function b64decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getOrCreateMasterKeyBytes(): Promise<Uint8Array> {
  const existing = await chrome.storage.local.get(INSTALL_KEY_STORAGE_KEY);
  let raw: string | undefined = existing[INSTALL_KEY_STORAGE_KEY];
  if (!raw) {
    const rnd = crypto.getRandomValues(new Uint8Array(32));
    raw = b64encode(rnd);
    await chrome.storage.local.set({ [INSTALL_KEY_STORAGE_KEY]: raw });
  }
  return b64decode(raw);
}

async function deriveKeys(): Promise<{ encKey: CryptoKey; macKey: CryptoKey }> {
  const master = await getOrCreateMasterKeyBytes();

  // Simple derivation: hash(label || master) for each purpose.
  const makeKeyBytes = async (label: string) => {
    const data = new Uint8Array(label.length + master.length);
    for (let i = 0; i < label.length; i++) data[i] = label.charCodeAt(i);
    data.set(master, label.length);
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
    return hash;
  };

  const encBytes = await makeKeyBytes("videoroll-aes-gcm");
  const macBytes = await makeKeyBytes("videoroll-hmac");

  const encKey = await crypto.subtle.importKey(
    "raw",
    encBytes,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  const macKey = await crypto.subtle.importKey(
    "raw",
    macBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  return { encKey, macKey };
}

async function hmac(macKey: CryptoKey, data: Uint8Array): Promise<Uint8Array> {
  const sig = await crypto.subtle.sign("HMAC", macKey, data);
  return new Uint8Array(sig);
}

export async function saveUserSecure(user: any): Promise<void> {
  const { encKey, macKey } = await deriveKeys();
  const json = JSON.stringify(user ?? null);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(json);
  const ctBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, encKey, encoded);
  const ct = new Uint8Array(ctBuf);
  const macInput = new Uint8Array(iv.length + ct.length);
  macInput.set(iv, 0);
  macInput.set(ct, iv.length);
  const macBytes = await hmac(macKey, macInput);
  const envelope: SecureEnvelopeV1 = {
    v: 1,
    iv: b64encode(iv),
    ct: b64encode(ct),
    mac: b64encode(macBytes),
  };
  await chrome.storage.local.set({ [USER_SECURE_KEY]: envelope });
  // Remove legacy plaintext key if still present
  await chrome.storage.local.remove(["user"]);
}

export async function removeUserSecure(): Promise<void> {
  await chrome.storage.local.remove([USER_SECURE_KEY]);
}

export async function getUserSecure(): Promise<any | null> {
  const stored = await chrome.storage.local.get(USER_SECURE_KEY);
  const envelope = stored[USER_SECURE_KEY] as SecureEnvelopeV1 | undefined;
  if (!envelope) return null;
  if (!envelope || envelope.v !== 1) return null;
  try {
    const { encKey, macKey } = await deriveKeys();
    const iv = b64decode(envelope.iv);
    const ct = b64decode(envelope.ct);
    const macStored = b64decode(envelope.mac);
    const macInput = new Uint8Array(iv.length + ct.length);
    macInput.set(iv, 0);
    macInput.set(ct, iv.length);
    const macCalc = await hmac(macKey, macInput);
    if (macCalc.length !== macStored.length) throw new Error("MAC length mismatch");
    for (let i = 0; i < macCalc.length; i++) {
      if (macCalc[i] !== macStored[i]) throw new Error("MAC mismatch");
    }
    const ptBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, encKey, ct);
    const json = new TextDecoder().decode(ptBuf);
    return JSON.parse(json);
  } catch (e) {
    // Integrity or decrypt failure -> purge
    await chrome.storage.local.remove([USER_SECURE_KEY]);
    return null;
  }
}

export async function migratePlainUserIfAny(): Promise<void> {
  const plain = await chrome.storage.local.get("user");
  if (plain && plain.user) {
    await saveUserSecure(plain.user);
    await chrome.storage.local.remove("user");
  }
}

export const __secureUserDebug = {
  deriveKeys,
};
