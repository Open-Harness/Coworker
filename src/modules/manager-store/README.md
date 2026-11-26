# manager-store

One manager's own Durable Object: what a manager keeps that is not the workspace's. One object per manager, made in the workspace's
jurisdiction (`durableManagerStores`), and addressed by the `objectId` the workspace's tree keeps for it.

Built: who it is (`ManagerRecord`) and its playbook, version by version (`open`, `head`, `versions`, `version`, `copy`, `save`).
`save` is the one authoritative path to a new version: the number is taken inside the insert, so two saves never share one.

To come, as tables of this object and calls on `ManagerStoreApi`, in this order: `work` (a `Work` as `work` moves it, keyed by id, with
its `next` alarm), `thread` (a fork of the manager on one piece of work: `threads` rows and its lines), `run` (what each turn cost, by call
id, so a replay never counts twice), `box` (the snapshot id and last command of the work's container), `ask` (the open asks of this
manager's work). The intake of what came in is not here: it is the workspace's (`console_item`), because one thing that comes in is
decided over every manager that hears its place.

## Invariants

- An id nobody opened answers nothing (`head` is undefined), so guessing one makes nothing.
- `open` is once. A second call, even with other files, changes nothing and says `AlreadyOpen`.
- Version 1 is the copy the template gave; `copy().given` is always version 1, and `now` the newest.

## How to test

Through the interface, with a namespace stub: `env.MANAGER_STORE.getByName(name)`.
