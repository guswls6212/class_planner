/**
 * Public base URL resolution helpers.
 *
 * Use cases:
 * - Building share URLs / invite links / email content that points back to this app.
 * - Client-side: prefer `getClientBaseUrl()` (uses window.location.origin).
 * - Server-side: prefer `getServerBaseUrl(request?)` (env-first, header fallback with allowlist).
 *
 * Resolution order for `getServerBaseUrl`:
 *   1. `PUBLIC_BASE_URL` env (single source of truth in most deployments)
 *   2. Request headers (x-forwarded-host / host) — only if `ALLOWED_PUBLIC_HOSTS` env is set,
 *      and the candidate host appears in that allowlist (defends against Host Header Injection)
 *   3. Throws if neither resolves
 */

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function parseAllowedHosts(): string[] {
  const raw = process.env.ALLOWED_PUBLIC_HOSTS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function getClientBaseUrl(): string {
  if (typeof window === "undefined") {
    throw new Error(
      "getClientBaseUrl can only be called in browser context. Use getServerBaseUrl(request) on the server."
    );
  }
  return window.location.origin;
}

export function getServerBaseUrl(request?: Request): string {
  const envBaseUrl = process.env.PUBLIC_BASE_URL;
  if (envBaseUrl) return trimTrailingSlash(envBaseUrl);

  if (request) {
    const allowedHosts = parseAllowedHosts();
    if (allowedHosts.length > 0) {
      const xfHost = request.headers.get("x-forwarded-host");
      const host = request.headers.get("host");
      const candidate = xfHost ?? host;

      if (candidate && allowedHosts.includes(candidate)) {
        const proto = request.headers.get("x-forwarded-proto") ?? "https";
        return `${proto}://${candidate}`;
      }
    }
  }

  throw new Error(
    "Cannot resolve public base URL. Set PUBLIC_BASE_URL env, or set ALLOWED_PUBLIC_HOSTS env and pass a request whose host matches the allowlist."
  );
}
