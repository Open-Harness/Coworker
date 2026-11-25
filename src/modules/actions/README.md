# actions

The action catalogue (docs/actions.md as data) and its one door, `call`. A button and the manager's tool share an
id, an input and a result.

**Invariants**

- The catalogue is actions.md, id for id; a test reads the doc and compares.
- `check(by, id)`: for a manager, its own setting for the action, else for the category, else the catalogue's
  default. For a person, their own setting, else their preset's (`PRESETS`). Nobody known gets `off`.
- `call` writes exactly one audit line per call: who, the permission it ran under, the outcome, and `describe()`'s
  sentence. `off` is refused, `ask` without an approver returns `Ask` with the sentence to put to a person.
- Sentences never show a bare id.

**Testing:** `actions.test.ts`, with in-memory permission sources and handlers.

`ApprovalRequest` (a person's press that waits for an Owner) and `AuditQuery` (which lines of the log to read) are here too:
they are about the action log, which the Workspace object keeps.
