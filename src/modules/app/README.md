# app

Owns the screens: it joins the pieces of `ui` to the directory and workspace connections.

Read `types.ts` for what the browser's composition root (`src/routes/_app.tsx`) must provide.

Invariants

- Nothing connects before the visitor has a name.
- One workspace is connected at a time; opening another closes the first.
- A refused command shows its reason, and the text a person wrote is kept.
- Unsent text lasts as long as the page, per chat.

Test: `pnpm vitest --run --project page src/modules/app`
