# manager

One manager in one Durable Object: its pi-durable harness (the manager's conversation and, from `run.start`, its
Runs), its mission page and sub-pages, and its board with lanes, fields and tasks.

**Owns**

- The manager's tools: one per action in `docs/old/actions.md` that is built, named by the action id with `.` written `_`
  (`task.create` → `task_create`), because providers allow no dots in tool names. Each call goes through
  `actions.call`, so it is checked against the manager's Permissions and described in one sentence.
- Its documents (`internal/state.ts`), all pi-durable documents. A tool's change commits in the same transaction as
  the call's receipt, so a call replayed after a crash changes nothing twice.
- Templates (`internal/templates.ts`): Kanban, Incident and Support differ only in lanes, fields, default view, the
  mission page's first text and Permissions.

- Asking (`internal/asking.ts`): an action set to ask, and `question.ask`, put one item in a person's Inbox in the
  Workspace object and park the tool call on a signal; the answer wakes it. Approvals go to the manager's owner.
- Audit lines (`internal/outbox.ts`): written with the change, then sent to the Workspace object's log by key.
- People's buttons (`act`): the same action, checked against the person's preset.

**Invariants**

- An object nobody provisioned answers `NotProvisioned`; guessing an id makes nothing.
- An action that is not built (no input in `internal/parameters.ts`) or set to off is not offered to the manager at all. A person's call to one is refused and logged.
- An action set to ask writes nothing, not even an audit line, until a person allows or denies it.
- A manager is not started without a model: `provision` asks its brain (`ready`) and returns `NoModel` with the
  workspace's own reason. Outside the fake world the brain is the workspace's model connection (`brain` module), reached
  through the Workspace object; the manager holds no key.
- The Workspace object makes managers, in its region, and keeps their list; the Worker reaches one only through it.

**Testing.** `testing.ts` has `scriptedBrain()`, a model that turns a few phrases into actions, and `offered`, the
tool names it was last offered. The flows in `src/flows/manager.test.ts` drive it through the HTTP routes.

**Settings and screens.** The board's settings (`lane.*`, `field.*`, `view.default`), a task's `task.values`,
`task.comment` and `task.owner`, and the manager's own `self.permissions` are actions with handlers (`internal/board-handlers.ts`,
`internal/permissions-handlers.ts`): a button and the manager's tool run the same one. A task keeps its comments and a
history of the audit lines' own sentences (`internal/history.ts`); `task(id)`, `permissions()` and `templateCards()` feed the
Task page, the Permissions screen and the gallery.

**Streaming and stopping.** `conversation()` and `run()` end with one more line, `streaming: true`, while the model is writing an answer: the words so far, read from the conversation's live document (`internal/partial.ts`), a little behind the model and before the answer has an entry. Asking again shows it grown; asking after the answer is whole shows the entry instead. `run.stop` (a person's button or the manager's `run_stop` tool) writes the run's end in its commit (`ended`, report `dropped`, note "Stopped by <name>", `stopped` set) and then aborts the run's conversation (`internal/stop.ts`), so nothing more is written. A stopped run ignores a late `report`. Stopping a run that already ended changes nothing. The scripted brain writes a long answer for "write at length", and a run told "keeps going" writes for minutes.

**Saved agents and settled tasks.** `run.start` (a manager's tool or a person's button) names a saved agent. The Workspace object is asked first (`agent(name)`, in `internal/launch.ts`, before the commit), and the run keeps what it got: the agent's version, instructions, thinking level, tools (`bash` is `run_command`, `read` is `read_file`; a run with skills also has `read_skill`), model choice, environment id and its skills' versions. Editing or deleting the agent later changes nothing for that run; a later start of a deleted agent says plainly it is gone and names the agents there are. `RunView` shows `agentVersion`, `model` and `modelNotice`. The manager's prompt lists the agents it may start (`internal/agents-section.ts`). A task a person moves into the last lane is `settled` (`TaskView.settled`): `stage` is `idle` with an empty `stageLabel` until a run reports after it or it moves out. A question the manager asks is also a `ChatLine` with `question.itemId`.

**Its agents.** Two kinds, each one value: `internal/manager-agent.ts` (what people write to) and `internal/worker.ts` (what does a
run). `agentsFor` in `internal/engine.ts` is the list. How a kind becomes a conversation is `agent-engine`'s; what a saved agent is
is `agents`'.
