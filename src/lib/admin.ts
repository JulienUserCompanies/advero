// Single-admin allowlist. Hardcoded rather than a role column on `profiles`
// because there's exactly one admin right now — revisit if that changes.
const ADMIN_EMAILS = ["julien@usercompanies.com"];

export function isAdminEmail(email: string | null | undefined): boolean {
  return Boolean(email) && ADMIN_EMAILS.includes(email!.toLowerCase());
}
