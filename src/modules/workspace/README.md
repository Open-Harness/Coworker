# workspace

Owns one tenant's Durable Object: its profile (name, address, region), and in later milestones its people and
handles, sources, vault, Inbox, audit log and list of managers. Callers reach it through a stub typed by
`WorkspaceApi` in `types.ts`.

Invariants

- An object nobody provisioned answers `NotProvisioned`. Guessing an id creates nothing.
- A workspace is provisioned once; a second provision changes nothing.
- `destroy` erases all of the object's storage, its data key included, so nothing it encrypted can be read again.

Test: `pnpm vitest --run src/modules/workspace`

**Joining** (`internal/joining.ts`, table `join_settings`): whether invite links are on, the link secret (160 bits, new on every switch-on, compared in constant time) and the approved email domains live here, not in D1. `allowsJoin` is the one question the control plane asks.

**Managers, the Inbox and the action log.** The object keeps the list of managers and makes each Manager object in
its own region. Managers write to it by idempotent calls only: `recordActions` (one line per key) and `ask` (one Inbox
item per id). A person's `answer` is recorded once, then delivered to every tool call waiting on that item.

**Model calls for managers.** `modelRoute` and `modelCall` are what a manager's brain uses: the Workspace object makes
the provider call with the workspace's credential, inside `vault.use`, and streams the answer back. A manager is never
handed a key. See `models/README.md`.

**Settings, the audit log and asks.** `settings(call, by)` is the one RPC the Settings screens use; it runs the `settings`
module over this object (`internal/place.ts` builds what it needs, `internal/settings-host.ts` is the door). `auditQuery`
reads the action log with filters and pages (`internal/audit.ts`). Each new Inbox item is offered once, when it is made, to
the people who asked to be mailed that kind (`internal/notices.ts`). A person's press whose own setting is ask waits as one
approval in each Owner's Inbox (`internal/person-asks.ts`): the first answer decides, and an allowed press runs through the
manager as that person's, approved by the Owner.

**Saved agents for runs.** `agent(name)`, `agents()` and `skillFile()` (settings `internal/launch.ts`) are what a manager reads of the saved agents and skills when it starts a run and while the run reads its skills. `modelRoute(wanted?)` takes a choice.
