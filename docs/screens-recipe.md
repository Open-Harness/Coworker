# How to build one screen

Written from the four that are green (`signin` `signup` `join` `start`, `home`, `palette`, `inbox`) and the shell. Read
[design/README.md](../design/README.md) for which drawing is which page, [../evals/README.md](../evals/README.md) for what the evals want.

## What is shared, and not yours to edit

| Where                        | What                                                                                                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/browser.tsx`            | The composition root of the console: the one place with `window`. Finds screens by glob.                                                                                                                                                           |
| `src/modules/page/`          | `Screens` (address to page, in the shell's frame), `Reading`, `useRead`, `useApi`, `useGo`, `useHref`, `useClock`, `useRefresh`, `useOutside`, `useBrowser`, and the four states (`Waiting`, `Unread`, `Missing`, `Offline`). Types in `types.ts`. |
| `src/modules/api/`           | The console API client, by the map in `types.ts`. Pages read through it and nothing else.                                                                                                                                                          |
| `src/shell.tsx`, `src/juno/` | The side navigation, ⌘K palette and nav items. They read `/shell`; a new screen needs nothing here.                                                                                                                                                |
| `src/door/`                  | `Door` and `SignIn`, for the pages outside a workspace.                                                                                                                                                                                            |
| `src/routes/`                | One splat route (`$.tsx`) and `index.tsx` hand every address to `Console`. **No route file per screen.**                                                                                                                                           |

If you need a change in one of these, make the smallest one, say so in your report, and keep it to the commit that needs it.

## Where a screen is registered

**Nowhere you edit.** A screen is a folder, `src/screens/<name>/`, found by `import.meta.glob("./screens/*/route.ts")`. Two files:

```ts
// src/screens/inbox/route.ts
import type { ScreenRoute } from "~/modules/page/types.ts";
export default { path: "/inbox", place: "Inbox" } satisfies ScreenRoute; // or an array, for a folder with several pages
```

```tsx
// src/screens/inbox/index.tsx: the first line says which Astryx template it adapts, which is what lets it keep the template's styling
// astryx-template: table-inbox
export default function InboxPage({ params, search }: PageProps) { ... }
```

- `path` is under `/ws/<address>`; `:manager` parts arrive in `params`, the query in `search`. More fixed parts beat a `:part`
  (`/m/:manager/playbook/versions` beats `/m/:manager/playbook/:part`).
- `outside: true` is a page outside any workspace (`/sign-in`), with no shell. The door's drawings are the only ones.
- `place` is how the palette says where you are ("Home"); a manager's pages are named by the manager.
- A folder can hold more than one page (`route.ts` default-exports a list) but each page is one `index.tsx`: switch on `route`/`params` inside it,
  or give the second page its own folder.
- Files other than `route.ts` and `index.tsx` are yours: split by what the code is about, none over 250 lines.

## The recipe

1. **Start from the drawing**: copy `design/src/screens/<name>/*` into `src/screens/<name>/`. Do not redraw. Keep the `// astryx-template:` line.
2. **Give it the view, not sample data.** Wrap the body in `<Reading from="/m/:manager/board" parts={params} ...>`; the child gets the typed view
   (`Reads["/m/:manager/board"]`, from `src/modules/api/types.ts`, which the `views-*` modules' `types.ts` define). `Reading` draws waiting,
   failed (with "Try again"), gone and offline itself; pass only your own `loading` skeleton, a `gone` text, or a `failed` sentence.
   Words, numbers and dates come from the view. Never copy a value of a fixture into the code.
3. **Changes** are `useApi().write(...)` (a doing is `/do` with a `key: newId()`), then `useRefresh()(["/inbox", "/shell"])` for what changed.
   The drawing's `go("name")` becomes `useGo()("/m/sales/board")`; a link is `useHref()`. Times are `useClock()`.
4. **Replace `design/src/shell` and `world` imports** (`go`, sample data, `manager`) with the above; nothing in `src/` imports `design/`.
5. **Run it** (below), read what is red, fix the screen, not the eval.

## Running

Use **Node 24** (`export PATH=$HOME/.nvm/versions/node/v24.18.0/bin:$PATH`): the scripts are `.ts` and the default `node` here is 18.

```bash
pnpm build                              # every time src/ changed; the evals test the finished build (about 5 s)
SCREENS_PORT=<yours> DESIGN_PORT=<yours> npx playwright test --config evals/screens/playwright.config.ts -g 'screen:inbox/'
SCREENS_AGAINST=design ... -g 'screen:inbox/'       # the drawing in the app's place: it is green, so it shows what the eval wants
pnpm typecheck && pnpm lint && pnpm check:ui && pnpm check:shape && pnpm check:size
```

- Each screen has five evals: `says-what-is-drawn`, `looks-as-drawn`, `...-on-a-phone`, `...-in-the-dark`, `by-the-keyboard-and-with-names`.
  The `-g` is a regex on the title: `screen:(home|palette)/`. One screen is about 13 s (5 evals, 6 s of it starting the two servers); eight screens
  about 40 s in 4 workers.
- Playwright starts its **own** app server and drawing server on your two ports. Do not leave one of yours running there (`pkill -f "port 8820"`,
  `pkill -f design/vite.config.mjs`), or it stops with "already used".
- A red eval says what it asked for: `It asked for: GET /api/ws/acme/x`. A path with no fixture answers 404, so a screen asking for the wrong
  path shows its "gone" state; read the list first.
- To see it: write a script that imports `open` and `draw` from `evals/screens/kit.ts`, takes `page.screenshot()` of both, and look at the two
  PNGs (`design/shot.mjs` does the drawings only). Save pictures under the scratchpad's `pictures/<your name>/`.

## Pitfalls we hit

- **Height.** Outside the shell nothing above the page has a height, so a page there that fills the window (`Layout height="fill"`, as `start`
  does) says `style={{ height: "100dvh" }}`, and one that centres itself (the door) `minHeight: "100dvh"`; inside the shell `fill` works. `check:ui`
  forbids CSS in `src/styles.css`. If a phone picture is 20% off because the bottom bar floats mid-page, this is it.
- **`exactOptionalPropertyTypes`.** An Astryx prop that is optional cannot be passed `undefined`: spread it, `{...(x ? { isOptional: true } : {})}`.
- **`check:ui`** allows `className`, `style`, `xstyle`, raw tags and `svg` only in a file whose first line is `// astryx-template: <name>`, and only in
  `src/screens`, `src/door`, `src/juno`, `src/shell.tsx`. Elsewhere, only Astryx components. Run it after every file.
- **The shell is already drawn.** Never draw a sidebar or a title bar of your own; the eval compares what is inside `#astryx-app-shell-main`
  (the whole `body` for the door).
- **Reads are shared and kept.** `useRead` of the same path and parts is one request; `refresh` keeps the old answer until the new one comes,
  so nothing flashes. The live socket (`/api/ws/<address>/live`) asks again what the server says changed; a test does not need it (the eval
  swallows it).
- **Hooks before the `Reading`.** A screen that reads `/shell` as well as its own view (`home`) calls `useRead("/shell")` outside `Reading`
  and draws once both are `Ok`.
- **What is not in `Reads`** (the door's `/api/me`, `/api/sign-in`, `/api/join/known`, `/api/start/repos`, `POST /api/workspaces`) goes through
  `useOutside()`, whole paths, narrowed by you from `unknown`; no `any`, no casts.
- **Clock.** The evals fix it at 09:54 on 25 Nov 2026 in Copenhagen. Use `useClock()`, never `Date`, or "Good morning" and "5 min ago" drift.
- **Keyboard eval**: every `button`, `a[href]`, input and `[role=tab]` has a name (`aria-label` or text) and can be reached by Tab, or lives in
  a group with one `tabindex=0`. Icon-only buttons need `aria-label`.
- **The formatter** is `npx oxfmt src/screens/<name>`; `pnpm format:check` is part of `pnpm check`.
- **The states** (`state-loading`, `state-error`, `state-empty`, `state-notyet`, `state-offline`, `state-gone`) are played on manager pages
  (`/m/coding/board`, `/m/coding`, `/m/docs/intake`, `/m/releases`, `/m/coding/work/ACME-377`), so they go green with those screens, and only if
  the screen uses `Reading` and passes `loading` / `gone` words that match `design/src/screens/states`.

## Before you commit

`pnpm typecheck`, `pnpm lint` (no new warnings in `src/`), `pnpm check:ui`, `pnpm check:shape`, `pnpm check:size`, `pnpm test` for any
test you added, `node evals/climb/main.ts --lock` (must print `d03f8489…a918da`), `node evals/climb/main.ts --only rules:` (241 of 241), then
`git add` your own folder and commit. Never touch `evals/`, `design/`, `docs/spec.md`, `docs/book.md`, `docs/design.md`, `docs/first-principles.md`,
`docs/templates/`, or a contract module's `types.ts`.
