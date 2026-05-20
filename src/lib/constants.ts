// Named constants for the auth surface. Per security.md §0 and code-style.md §7:
// no magic numbers for security-relevant values; every TTL, salt-round count,
// and rate-limit window has a name and a comment citing the rule it came from.

// --- Password hashing ---
// security.md §1: bcrypt salt rounds = 12. Not 10, not 14. Twelve.
export const BCRYPT_ROUNDS = 12;

// --- Token TTLs ---
// security.md §2 + AGENTS.md §7 Phase 3/4:
//   verification: 15 minutes
//   password reset: 1 hour
export const VERIFICATION_TOKEN_TTL_MS = 15 * 60 * 1000;
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

// --- Token shape ---
// security.md §2: crypto.randomBytes(32).toString("hex") => 64 hex chars.
export const TOKEN_HEX_LENGTH = 64;

// --- Email ---
// Dev placeholder. Phase 6 must swap to a verified custom-domain address
// (e.g., "SecureGate <no-reply@securegate.dev>") per AGENTS.md "Domain status".
// onboarding@resend.dev works without domain verification but Resend only
// permits sending to the account-owner's email — fine for dev smoke tests
// against delivered@resend.dev, not for shipping.
export const FROM_ADDRESS = "SecureGate <onboarding@resend.dev>";
