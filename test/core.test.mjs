// Юніт-тести ядра Тотки: вектори RFC 6238 + base32 + otpauth
import {
  base32Decode, base32Encode, hotp, totp,
  parseOtpauth, buildOtpauth, normalizeAlgo,
} from "../core.js";

// Увага (Appendix B RFC 6238): для SHA256 сід — 32 байти ASCII,
// для SHA512 — 64 байти ASCII. Значення 91819424 — виправлена офіційною
// erratum-ом до RFC 6238 одруківка (у RFC надруковано 91819404).
const S20 = new TextEncoder().encode("12345678901234567890");
const S32 = new TextEncoder().encode("12345678901234567890123456789012");
const S64 = new TextEncoder().encode(
  "1234567890123456789012345678901234567890123456789012345678901234");
const TIMES = [59, 1111111109, 1111111111, 1234567890, 2000000000, 20000000000];
const V8 = [
  ["SHA1", S20, ["94287082", "07081804", "14050471", "89005924", "69279037", "65353130"]],
  ["SHA256", S32, ["46119246", "68084774", "67062674", "91819424", "90698825", "77737706"]],
  ["SHA512", S64, ["90693936", "25091201", "99943326", "93441116", "38618901", "47863826"]],
];

let fails = 0;
const eq = (got, want, msg) => {
  if (got !== want) { fails++; console.error(`FAIL ${msg}: got ${got}, want ${want}`); }
};

// base32
eq(base32Encode(S20), "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", "base32Encode");
const dec = base32Decode("gezd gnbv gy3t qojq gezd gnbv gy3t qojq====");
eq(Buffer.from(dec).toString("latin1"), "12345678901234567890", "base32Decode (регістр/пробіли/паддінг)");

// RFC 6238, 8 цифр (свій сід на алгоритм)
for (const [algo, seed, arr] of V8) {
  for (let i = 0; i < TIMES.length; i++) {
    const c = await hotp(seed, Math.floor(TIMES[i] / 30), 8, algo);
    eq(c, arr[i], `hotp ${algo} t=${TIMES[i]}`);
  }
}

// TOTP 6 цифр
eq(await totp(S20, 59, { digits: 6 }), "287082", "totp 6d t=59");
eq(await totp(S20, 1111111109, { digits: 6 }), "081804", "totp 6d t=1111111109 (нуль на початку)");

// otpauth туди-назад
const acc = parseOtpauth(
  "otpauth://totp/GitHub:user%40example.com?secret=GEZDGNBVGY3TQOJQ&issuer=GitHub&algorithm=SHA256&digits=8&period=60");
eq(acc.issuer, "GitHub", "parse issuer");
eq(acc.label, "user@example.com", "parse label");
eq(acc.algo, "SHA256", "parse algo");
eq(acc.digits, 8, "parse digits");
eq(acc.period, 60, "parse period");
eq(buildOtpauth(acc),
  "otpauth://totp/GitHub%3Auser%40example.com?secret=GEZDGNBVGY3TQOJQ&issuer=GitHub&algorithm=SHA256&digits=8&period=60",
  "buildOtpauth");
eq(parseOtpauth(buildOtpauth(acc)).secret, "GEZDGNBVGY3TQOJQ", "parse(build()) roundtrip");

// normalizeAlgo
eq(normalizeAlgo("sha-1"), "SHA1", "normalize sha-1");
eq(normalizeAlgo(undefined), "SHA1", "normalize undefined -> SHA1");

// помилки
const mustThrow = (fn, msg) => {
  try { fn(); fails++; console.error(`FAIL ${msg}: не кинув помилку`); }
  catch { /* ок */ }
};
mustThrow(() => parseOtpauth("https://example.com"), "не-otpauth кидає");
mustThrow(() => parseOtpauth("otpauth://hotp/x?secret=GEZDGNBVGY3TQOJQ"), "HOTP кидає");
mustThrow(() => base32Decode("!!!"), "сміття в secret кидає");

if (fails) { console.error(`\n${fails} FAILED`); process.exit(1); }
console.log("ALL OK — RFC 6238 вектори пройдено");
