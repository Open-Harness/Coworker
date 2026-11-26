# UI SDK and Astryx

Can we use [UI SDK](https://ui-sdk.dev/) ([vercel-labs/ui](https://github.com/vercel-labs/ui)) with Astryx? Checked
2026-11-23 against `@ui-sdk/core` 0.1.0-beta.16 and `@astryxdesign/core` 0.7.17.

**Short answer: yes, but only in a narrow role.** Keep Astryx for every component. Use UI SDK behaviours only to build
custom pieces that Astryx lacks, and style them with Astryx tokens. Don't adopt its agent bridge for the manager.
Copy its permission pattern instead.

## What UI SDK is

- **Headless behaviours.** There are 50+ of them, such as `createTransfer`, `createReorder`, `createRovingFocus`,
  `createUndoStack`, `createVirtualizer` and `createResize`. You combine them into a component with
  `definePrimitive({ name, state, api, slots, agent })`.
- **Rendering per framework.** `createParts(primitive)` exists for React, Vue, Svelte, Solid and web components.
- **Unstyled parts.** Each part gets `data-slot` and state attributes (`data-open`, `data-dragging`…). `className` and
  `style` can be functions of state, so any styling system fits.
- **An agent bridge.** `createAgent()` runs in the browser and offers `snapshot()`, `act()` and `query()`. It can be
  exposed as AI SDK tools or WebMCP. `allow()` gates actions, and `data-agent-confirm` marks controls that need a
  person.
- **Status.** Beta, Apache-2.0, about a month old.

## Where it overlaps Astryx

Astryx carries its own behaviour stack; its only dependency is `intl-messageformat`. So for anything Astryx already
renders, UI SDK would be a second implementation of the same thing.

| Need | Astryx | UI SDK |
|---|---|---|
| Menus, tabs, selects, dialogs, tree | ✅ components | ✅ behaviours (duplicate) |
| Reorder rows in one list | ✅ `createReorderable` + `List` | ✅ `createReorder` (duplicate) |
| **Move a card between lanes** | ❌ reorder is per collection | ✅ `createTransfer` (`TransferLists`, per-lane `limits`) |
| Undo for a board | ❌ | ✅ `createUndoStack` |
| Resizable panes | ✅ `Resizable` | ✅ `createResize` (duplicate) |
| Agent can see and drive controls | ❌ | ✅ only for UI SDK primitives |

The real gap is the kanban: `task.move` between lanes, with lane `limit` ([model.md](model.md) `Lane.limit`). UI SDK's
own kanban experiment (`examples/experiments/react/kanban.tsx`) builds exactly that from `createTransfer`,
`createRovingFocus` and `createUndoStack`.

## Using them together

One custom component, `Board`, built on UI SDK behaviours and drawn with Astryx parts:

```tsx
// src/modules/board/internal/BoardLanes.tsx — sketch
import { createTransfer, createRovingFocus, definePrimitive } from "@ui-sdk/core";
import { createParts } from "@ui-sdk/react/primitive";
import { Card, Badge } from "@astryxdesign/core";

const board = definePrimitive({ name: "board", /* lists, limits from Board.lanes */ });
const Parts = createParts(board);

// Cards stay Astryx <Card>; UI SDK only owns where they sit and how they move.
<Parts.Card render={(props, state) => <Card {...props} data-dragging={state.dragging} />} />
```

Moving a card calls the same `task.move` action as the button and the manager tool ([actions.md](actions.md)).

**Cost of doing this**

- `scripts/check-ui.ts` only allows `@astryxdesign/` imports. Allowing `@ui-sdk/core` and `@ui-sdk/react` would be one
  documented exception, limited to `modules/board/internal/`. This matches the rule for custom components.
- It hasn't been checked whether StyleX classes pass cleanly through `className`-as-function. Prove it on one lane
  before building the rest.
- It's beta. Pin the exact version, and keep it behind the `board` module so a swap touches one folder.

## The agent bridge: not for the manager

The bridge reads the **open page**. Our manager runs in a Durable Object with no page open, and it acts through the
action catalogue on the server. So the bridge can't be how the manager works.

It could later power an in-page co-pilot ("move everything blocked to Triage"), but it only sees UI SDK primitives. Astryx
controls would be invisible to it unless each one were wrapped. That is not worth it now.

## What to copy instead

The bridge's permission model matches ours almost exactly, which supports [actions.md](actions.md):

| UI SDK | Ours |
|---|---|
| `agent.actions` on a primitive | an action id shared by the button and the tool |
| `allow(action)` → allow, deny or wait for a person | `Permission = "on" \| "off" \| "ask"` |
| `data-agent-confirm="Delete this task"` | an `ask` phrased in plain words |
| `details.source === "agent"` on every change | every call records who made it |
| `data-agent-secret` / `data-agent-hidden` | no action reads a key's value |
| `createHistory` + `describeEntry` ("Agent set X to Y") | the task's history and the audit log |

Two ideas worth taking:

1. `details.source` on every change. Each `task.*` mutation should carry `by: { kind: "person" | "manager", id }`, so
   the UI can show "the manager moved this" without a separate lookup.
2. `describeEntry`-style sentences for the audit log, produced from the action id and its input. The same sentence can
   then be the `ask` prompt.

## Decision

- Astryx stays the component library. No UI SDK components.
- The kanban lanes use `createTransfer` + `createUndoStack` inside `modules/board/internal/`, behind a check-ui
  exception. This waits until the board is actually built, and starts with a StyleX spike.
- The agent bridge is not adopted. Its `source` and plain-sentence patterns are now in the action catalogue
  ([actions.md › Rules](actions.md#rules-for-the-catalogue)).
