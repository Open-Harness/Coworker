# The drawings

Every screen of the product, in Astryx, on one sample story. They are what the screens are compared with: `evals/screens` opens the app's
page beside the drawing. Where a drawing and [docs/design.md](../docs/design.md) differ, design.md is right.

**Look at them**: `node_modules/.bin/vite --config design/vite.config.mjs design`, then `http://localhost:5310/#m-coding-board`. Add `?mode=dark` before
the `#` for dark. Pictures: `node design/shot.mjs <folder> <hash>…` (1440, phone, dark). How one is drawn: [BRIEF.md](BRIEF.md).

Which page of the app is which drawing is [evals/screens/screens.ts](../evals/screens/screens.ts): 88 of them. What each page is given is in
[evals/screens/fixtures](../evals/screens/fixtures), typed by the views in `src/modules/views-*/types.ts`.

| Drawing | Page, under `/ws/<address>` | Folder in `src/screens` | Reads |
|---|---|---|---|
| `signin` `signup` `join` `start` | `/sign-in` `/sign-up` `/join` `/start`, outside a workspace | the same | what is there today: `/api/me`, `/api/sign-in`, `/api/workspaces` |
| the shell | everywhere | `src/shell.tsx` | `/shell`, live |
| `home` `palette` | `/`, ⌘K | `home`, `src/juno/palette.tsx` | `/home`, `/search` |
| `inbox` | `/inbox` | `inbox` | `/inbox` |
| `chats` `chat-support…` | `/chats`, `/chats/<chat>` | `chats` `chat` | `/chats`, `/chats/:chat` |
| `system` `root` | `/overview`, `/managers` | `system` `tree` | `/overview`, `/tree` |
| `juno-…` | `/juno`, `/juno/<page>` | `juno` | `/coworker` |
| `m-…-overview` | `/m/<manager>` | `overview` | `/m/:manager` |
| `m-sales-intake` `m-sales-search` | `…/intake`, `…/triggers/<trigger>` | `intake` `search` | `…/intake`, `…/triggers/:trigger` |
| `m-coding-board` `m-sales-board` | `…/board` | `board` `sales-board` | `…/board` |
| `task` | `…/work/<work>` | `task` | `…/work/:work` |
| `m-coding-threads` `thread` | `…/threads`, `…/threads/<thread>` | `threads` `thread` | the same |
| `m-sales-playbook…` | `…/playbook`, `…/playbook/<part>` | `playbook` | `…/playbook`, `…/versions` |
| `m-sales-playbook-compare` | `…/playbook/compare/<trial>` | `compare` | `…/compare/:trial` |
| `m-coding-settings` | `…/settings` | `manager-settings` | `…/settings` |
| `m-…-connectors` and one connector | `…/connectors`, `…/connectors/<connector>` | `inout.tsx`, `crm` `email` `slack` `whatsapp` `github` | `/m/:manager`, `…/connectors/<connector>` |
| `new` `new-fill` `new-check` | `/managers/new`, `…/<template>`, `…/<template>/check?place=` | `new` | `/templates`, `/templates/:template`, POST `…/try` |
| `setup…` | `/set-up`, `/set-up/<walk>` | `setup` | `/set-up/:walk` |
| `draft…` | `/set-up/<walk>/draft`, `…/draft/<part>` | `playbook` | `/set-up/:walk` |
| `set-…` | `/settings/<page>` | `settings` | `/settings/<page>`; agents, skills and environments read `/settings/shared`; profile, notifications and security `/settings/me` |
| `live`, `live-5`, `live-try` | the co-worker's pointer over any page, beside its chat | `live` | `/walk` |
| `state-…` | a page that is loading, failed, empty, not readable yet, offline, or gone | `states` | |

Two drawings have no eval of their own: `live…` is played by `evals/screens/live.eval.ts`, and `policy` and `feeds` are old parts other
drawings use.
