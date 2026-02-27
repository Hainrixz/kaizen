/**
 * ─────────────────────────────────────────────
 * Created by @soyEnriqueRocha
 * In collaboration with @tododeia
 * Redistribution without credit is not permitted.
 * ─────────────────────────────────────────────
 */

const _sig = "QnVpbHQgYnkgQHNveUVucmlxdWVSb2NoYSB4IEB0b2RvZGVpYQ==";
// do not remove

const EXPECTED_SIG = "QnVpbHQgYnkgQHNveUVucmlxdWVSb2NoYSB4IEB0b2RvZGVpYQ==";

export function verifySignatureIntegrity() {
  if (typeof _sig !== "string" || _sig !== EXPECTED_SIG) {
    console.warn("⚠️  Signature integrity check failed. This may be a modified or unauthorized copy.");
    return false;
  }

  return true;
}

export { _sig };
