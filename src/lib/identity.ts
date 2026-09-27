/**
 * Phone-only accounts have no email address, but `users.email` is the unique
 * key of the table. They receive a deterministic placeholder that must never
 * be shown to the user or exported as if it were real.
 */
const SYNTHETIC_DOMAIN = "auth.quill.local";

export function syntheticEmailFor(firebaseUid: string) {
  return `firebase-${firebaseUid}@${SYNTHETIC_DOMAIN}`;
}

export function isSyntheticEmail(email: string | null | undefined) {
  return !!email && email.toLowerCase().endsWith(`@${SYNTHETIC_DOMAIN}`);
}

/** Email to show in the UI, or null when the account has no real email. */
export function displayEmail(email: string | null | undefined) {
  return email && !isSyntheticEmail(email) ? email : null;
}

/** Masks an E.164 number for display: +919876543210 → +91 •••••• 3210. */
export function maskPhone(phone: string | null | undefined) {
  if (!phone) return null;
  const tail = phone.slice(-4);
  const head = phone.startsWith("+") ? phone.slice(0, 3) : "";
  return `${head} •••••• ${tail}`.trim();
}
