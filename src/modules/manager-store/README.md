# manager-store

One manager's own Durable Object: what a manager keeps that is not the workspace's. One object per manager, made in the workspace's
jurisdiction (`durableManagerStores`), and addressed by the `objectId` the workspace's tree keeps for it.

Built: who it is (`ManagerRecord`) and its playbook, version by version (`open`, `head`, `versions`, `version`, `copy`, `save`).
`save` is the one authoritative path to a new version: the number is taken inside the insert, so two saves never share one.

Built too: its work, as `working` moves it. Tables (`internal/work-tables.ts`, and `boxes`' own): `work` (a `Work` as `work` moves it, by id), `seen` (event keys: an event
is applied once), `job` (what moving work asked to be done, in order, each once), `thread` and `message` (an agent's conversation, as a model is sent it), `spend` (what each
model call cost, by call id, priced or counted without a price), `hold` (why a work waits for something that is not a person), `once` (an outside act that was done, by its key),
`box` and `box_call` (the container, and what each call of it answered). Calls: `hearing` (what intake needs to decide over this manager), `take` (once per item), `heard`,
`board` (work, hold, cost and threads), `usage` (cost by day and model), `tick` (do what is due now). The object wakes itself by its alarm: for a work's date, for a hold's retry,
and soon, while something is half done, so that a lost object goes on.

To come: `ask` (the open asks of this manager's work; today an ask job is kept and not sent to the inbox). The intake of what came in is not here: it is the workspace's
(`console_item`, decided by `deciding`), because one thing that comes in is decided over every manager that hears its place.

## Invariants

- An id nobody opened answers nothing (`head` is undefined), so guessing one makes nothing.
- `open` is once. A second call, even with other files, changes nothing and says `AlreadyOpen`.
- Version 1 is the copy the template gave; `copy().given` is always version 1, and `now` the newest.

## How to test

Through the interface, with a namespace stub: `env.MANAGER_STORE.getByName(name)`.
