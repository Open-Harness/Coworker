# page

What every screen of the console stands on. A screen is a folder, `src/screens/<name>`, with two files:

- `route.ts`: `export default { path: "/m/:manager/board" } satisfies ScreenRoute` (or a list of them). Found by a glob, so a screen is
  registered by existing. `outside: true` makes it a page outside any workspace (`/sign-in`), with no shell around it.
- `index.tsx`: the page, `export default function Page({ params, search }: PageProps)`. Loaded when it is first wanted.

**Owns**

- `Screens`: the address to the page, in the shell's frame, under `/ws/<address>`; the live socket that asks again what changed.
- `useRead(path, parts)` and `<Reading from parts>`: a read of the console (`~/modules/api`), shared by every screen that asks for
  it. `Reading` draws what a read can be before it is an answer: waiting, failed (with "Try again"), gone, and offline (the last
  answer stays, dimmed, under a banner). A screen draws none of these itself.
- `useGo`, `useHref`: places of the workspace (`/inbox`); `//sign-in` is outside it. `useClock`: times in the workspace's zone.
- `useOutside`: whole paths outside a workspace (`/api/me`), for the door. `useBrowser`: what only the browser knows.

**Invariants**

- Nothing here reaches for a browser global: `Browser` is handed in by `src/browser.tsx`, the composition root.
- A read is asked once however many screens use it, and kept while it is asked again.
- Never draws a screen of its own: only the states every screen shares.

Test: `page.test.tsx`, through `service.ts`, without a browser.
