/**
 * Whether a socket was opened by this site's own page. WebSockets ignore the same-origin policy, so without this any
 * website a teammate visits could drive the app through their browser. Non-browser clients send no Origin.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (origin === null) return true;
  if (!URL.canParse(origin)) return false;
  const host = request.headers.get("X-Forwarded-Host") ?? request.headers.get("Host") ?? new URL(request.url).host;
  return new URL(origin).host === host;
}
