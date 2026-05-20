import { NextResponse } from "next/server";

// Per api-route-scaffolder skill §3. Every route handler returns through one
// of these helpers — no hand-rolled NextResponse.json calls. Keeps the wire
// shape ({ ok, data | error, message? }) consistent across the whole API.

/** 200: successful operation with optional payload */
export function ok<T>(data?: T) {
  return NextResponse.json({ ok: true, data }, { status: 200 });
}

/** 200: successful operation with a user-facing message */
export function okWithMessage(message: string) {
  return NextResponse.json({ ok: true, message }, { status: 200 });
}

/** 400: client sent malformed or invalid input */
export function badRequest(
  message = "Your request couldn't be processed. Please check the form and try again.",
) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

/** 401: not authenticated. Use sparingly — prefer notFound() for "exists but you can't see it" (security.md §7). */
export function unauthorized(message = "Please sign in to continue.") {
  return NextResponse.json({ ok: false, error: message }, { status: 401 });
}

/** 403: request rejected by policy (CSRF origin mismatch, disallowed CORS origin). NOT for ownership/role checks — use notFound() for those. */
export function forbidden(message = "This request was rejected.") {
  return NextResponse.json({ ok: false, error: message }, { status: 403 });
}

/** 404: resource does not exist OR exists but user doesn't own it (existence-safe) */
export function notFound(message = "We could not find what you were looking for.") {
  return NextResponse.json({ ok: false, error: message }, { status: 404 });
}

/** 429: rate-limited. retryAfterSeconds becomes a Retry-After header */
export function rateLimited(
  retryAfterSeconds: number,
  message = "Too many requests. Please wait a few minutes before trying again.",
) {
  return NextResponse.json(
    { ok: false, error: message },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}

/** 500: something went wrong on the server. Always log the full error server-side. */
export function serverError(message = "Something went wrong on our end. Please try again.") {
  return NextResponse.json({ ok: false, error: message }, { status: 500 });
}
