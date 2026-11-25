import { createServer } from "node:http";
import { liveSettings } from "../src/bin/live-settings.ts";
import { outsiders } from "../src/modules/outsiders/service.ts";

/**
 * `pnpm credentials run pnpm live:sign-in` signs a browser in to staging as the live tier's Owner. It asks staging for the
 * emailed link, reads it from the Owner's own mailbox, and sends the first browser that opens the address it prints there.
 * The link is never printed, and works once.
 */
const PORT = 8899;
const OPEN_FOR_MS = 10 * 60_000;
const settings: Readonly<Record<string, string | undefined>> = liveSettings();

function setting(name: string): string {
  const value = settings[name];
  if (value !== undefined) return value;
  return stop(`${name} is missing. Run it as: pnpm credentials run pnpm live:sign-in`);
}

function stop(reason: string): never {
  console.error(reason);
  process.exit(1);
}

const address = setting("LIVE_ALLOWED_MAILBOX");
const staging = setting("LIVE_STAGING_URL").replace(/\/$/u, "");
const time = { withinMs: 90_000, everyMs: 3_000, sleep: (ms: number) => new Promise<void>((done) => setTimeout(done, ms)), now: Date.now };
const owner = outsiders.mailboxPerson(
  { url: setting("LIVE_MAILBOX_URL"), token: setting("LIVE_MAILBOX_TOKEN"), address },
  (url, init) => fetch(url, init),
  time,
);
const ask = () =>
  fetch(`${staging}/api/auth/sign-in/magic-link`, {
    method: "POST",
    headers: { origin: staging, "content-type": "application/json" },
    body: JSON.stringify({ email: address, name: "Live runner", callbackURL: "/ws" }),
  });

console.log(`Asking ${staging} for a sign-in link to ${address}. It can take a minute.`);
const link = await outsiders.linkAfter(owner, "Your sign-in link", ask, time);
if (link === undefined) stop(`No sign-in link reached ${address}.`);
if (new URL(link).origin !== new URL(staging).origin) stop("The link in the mail is not staging's own.");

const server = createServer((request, response) => {
  // Only a browser going to this very address: nothing else asks a page of this computer for it.
  if (request.headers.host !== `localhost:${PORT}` || request.url !== "/") return void response.writeHead(404).end();
  response.writeHead(302, { location: link, "cache-control": "no-store", connection: "close" }).end();
  console.log("Signed in.");
  server.close();
  clearTimeout(closing);
});
const closing = setTimeout(() => stop("Nobody opened it. Run this again for a new link."), OPEN_FOR_MS);
server.listen(PORT, "localhost", () => console.log(`Open http://localhost:${PORT}/ in the browser to sign in.`));
