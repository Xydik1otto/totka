// Тотка — ядро: base32, HOTP/TOTP (RFC 4226/6238), парсер otpauth://
// Без залежностей. Працює і в браузері (WebCrypto), і в Node (webcrypto).

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Decode(input) {
  const clean = String(input ?? "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  if (!clean.length) {
    throw new Error("Secret порожній або некоректний (літери A–Z та цифри 2–7)");
  }
  let bits = 0, val = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) continue;
    val = (val << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((val >>> (bits - 8)) & 0xff);
      bits -= 8;
      val &= (1 << bits) - 1;
    }
  }
  return new Uint8Array(out);
}

export function base32Encode(bytes) {
  let bits = 0, val = 0, out = "";
  for (const b of bytes) {
    val = ((val << 8) | b) & 0xffffff;
    bits += 8;
    while (bits >= 5) {
      out += B32[(val >>> (bits - 5)) & 31];
      bits -= 5;
      val &= (1 << bits) - 1;
    }
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  return out;
}

const HASHES = { SHA1: "SHA-1", SHA256: "SHA-256", SHA512: "SHA-512" };

export function normalizeAlgo(a) {
  const s = String(a ?? "SHA1").toUpperCase().replace(/[^0-9A-Z]/g, "");
  return HASHES[s] ? s : "SHA1";
}

// RFC 4226 HOTP: HMAC(secret, 8-байтний big-endian counter) -> динамічне усічення
export async function hotp(secretBytes, counter, digits = 6, algo = "SHA1") {
  const hash = HASHES[normalizeAlgo(algo)];
  const msg = new ArrayBuffer(8);
  new DataView(msg).setBigUint64(0, BigInt(Math.floor(counter)), false);
  const key = await crypto.subtle.importKey(
    "raw", secretBytes, { name: "HMAC", hash }, false, ["sign"]
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, msg));
  const off = mac[mac.length - 1] & 0x0f;
  const bin =
    ((mac[off] & 0x7f) << 24) |
    (mac[off + 1] << 16) |
    (mac[off + 2] << 8) |
    mac[off + 3];
  return String(bin % 10 ** digits).padStart(digits, "0");
}

// RFC 6238 TOTP: HOTP від лічильника floor(unix_time / period)
export async function totp(secretBytes, timeSec, opts = {}) {
  const period = Number(opts.period) > 0 ? Number(opts.period) : 30;
  const digits = Number(opts.digits) > 0 ? Number(opts.digits) : 6;
  return hotp(secretBytes, Math.floor(timeSec / period), digits, opts.algo || "SHA1");
}

// Парсер otpauth://totp/Issuer:label?secret=...&issuer=...&algorithm=...&digits=...&period=...
export function parseOtpauth(uri) {
  const raw = String(uri ?? "").trim();
  const m = /^otpauth:\/\/(totp|hotp)\/([^?]*)\??(.*)$/i.exec(raw);
  if (!m) throw new Error("Це не посилання otpauth://");
  if (m[1].toLowerCase() === "hotp") {
    throw new Error("HOTP (без таймера) не підтримується — лише TOTP");
  }
  let labelRaw = m[2] || "";
  try { labelRaw = decodeURIComponent(labelRaw); } catch { /* залишаємо як є */ }
  let issuer = "", label = labelRaw;
  const i = labelRaw.indexOf(":");
  if (i > 0) {
    issuer = labelRaw.slice(0, i).trim();
    label = labelRaw.slice(i + 1).trim();
  }
  const p = new URLSearchParams(m[3] || "");
  const secret = (p.get("secret") || "").replace(/[\s-]/g, "");
  if (!secret) throw new Error("У посиланні немає secret");
  base32Decode(secret); // валідація
  const d = Number(p.get("digits"));
  const per = Number(p.get("period"));
  return {
    label: label || "Акаунт",
    issuer: (p.get("issuer") || issuer || "").trim(),
    secret,
    digits: d >= 5 && d <= 10 ? d : 6,
    period: per >= 10 && per <= 120 ? per : 30,
    algo: normalizeAlgo(p.get("algorithm")),
  };
}

export function buildOtpauth(acc) {
  const label = acc.issuer ? `${acc.issuer}:${acc.label}` : acc.label;
  const q = new URLSearchParams({ secret: acc.secret });
  if (acc.issuer) q.set("issuer", acc.issuer);
  if (normalizeAlgo(acc.algo) !== "SHA1") q.set("algorithm", normalizeAlgo(acc.algo));
  if (acc.digits && acc.digits !== 6) q.set("digits", String(acc.digits));
  if (acc.period && acc.period !== 30) q.set("period", String(acc.period));
  return `otpauth://totp/${encodeURIComponent(label)}?${q}`;
}
