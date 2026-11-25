# Action catalogue

Every action a person can take on a manager's screens, and every action the manager can take. One action, two
callers: the button and the tool share an id. Builds on [model.md](model.md).

Each manager sets every action to **on**, **off** or **ask** ([model.md › Permissions](model.md#permissions-on-off-or-ask-per-action)).
A category sets the default for its actions, and a single action can override it. The defaults below are a starting
point for templates, not limits: an owner can change any of them.

**How defaults were chosen**

| Kind of action | Default | Why |
|---|---|---|
| Reads its own state | on | Costs nobody's attention |
| Changes its own board, tasks, mission | on | That is the manager's job |
| Writes to the outside world where it was asked | on | Answering where the request came from |
| Writes to the outside world somewhere new | ask | Reaches people who didn't ask |
| Widens its own authority or spending | ask | It should not grant itself more |
| Deletes something that can't be undone | ask | Cannot be taken back |
| Workspace keys, members, billing | off | Not the manager's to touch |

## 1. Read (category default: on)

| Id | Action | Screen |
|---|---|---|
| `board.read` | Read lanes, fields and tasks | Board |
| `task.read` | Read a task, its comments, runs and history | Task |
| `run.read` | Read a run's transcript | Agent run |
| `mission.read` | Read the mission page and sub-pages | Mission |
| `event.read` | Read events and past decisions | Events |
| `thread.read` | Read the thread a trigger came from | Events, Task |
| `policy.read` | Read its own Policy and Permissions | Settings |

## 2. Board (on)

| Id | Action | Screen |
|---|---|---|
| `lane.create` | Add a lane | Board |
| `lane.update` | Rename a lane, change its meaning, limit or approval | Board |
| `lane.reorder` | Reorder lanes | Board |
| `lane.delete` | Delete an empty lane | Board |
| `field.create` | Add a field (severity, service, due) | Board settings |
| `field.update` | Rename a field or change its options | Board settings |
| `field.delete` | Delete a field and its values | Board settings · **ask** |
| `view.default` | Set the view the board opens on | Board |

## 3. Tasks (on)

| Id | Action | Screen |
|---|---|---|
| `task.create` | Add a task | Board, chat |
| `task.update` | Edit title, description, done-when | Task |
| `task.values` | Set field values | Task, Board |
| `task.move` | Move to another lane | Board, Task |
| `task.approve` | Move out of a lane that needs approval | Board, Task · **ask** |
| `task.owner` | Set or change the owner | Task |
| `task.subtask` | Add, tick or remove subtasks | Task |
| `task.comment` | Comment | Task |
| `task.link` | Link or unlink dependencies | Task |
| `task.follow` | Follow or unfollow a thread | Task |
| `task.archive` | Archive a task | Task |
| `task.delete` | Delete a task for good | Task · **ask** |

## 4. Triage (on)

| Id | Action | Screen |
|---|---|---|
| `triage.accept` | Turn a candidate into a task | Events |
| `triage.attach` | Attach a candidate to an existing task | Events |
| `triage.ignore` | Decide a candidate is not work | Events |
| `triage.stop` | Stop a task because someone asked | Events, Task |
| `triage.requeue` | Look at a candidate again | Events |

## 5. Agents and runs (on)

| Id | Action | Screen |
|---|---|---|
| `run.start` | Start a workspace agent on a task, in a role | Task |
| `run.message` | Message a running agent | Agent run |
| `run.stop` | Stop a run | Agent run |
| `run.retry` | Start a new attempt | Task |
| `agent.create` | Make a throwaway agent for one job | Task |
| `agent.save` | Save a throwaway agent to the workspace | Agent run · **ask** |
| `run.concurrency` | Change how many runs go at once | Settings · **ask** |

## 6. Mission (on)

| Id | Action | Screen |
|---|---|---|
| `mission.update` | Edit the mission page | Mission |
| `mission.post` | Post a latest update | Mission |
| `page.create` | Add a sub-page | Mission |
| `page.update` | Edit a sub-page | Mission |
| `page.delete` | Delete a sub-page | Mission · **ask** |

## 7. Talk to the outside (ask)

| Id | Action | Screen | Default |
|---|---|---|---|
| `reply.thread` | Reply in the thread a request came from | Task, chat | **on** |
| `reply.ack` | Confirm it took a request | — | **on** |
| `message.new` | Start a new conversation in a channel it listens to | Chat | ask |
| `message.direct` | Message a person directly (DM, new email) | Chat | ask |
| `message.elsewhere` | Post somewhere it doesn't listen | Chat | ask |
| `question.ask` | Ask a person a question in their Inbox | — | **on** |

## 8. Who may ask (ask)

| Id | Action | Screen |
|---|---|---|
| `allow.add` | Add a person, group, domain or handle to the allowed list | Policy |
| `allow.remove` | Remove one | Policy · **on** |
| `admission.update` | Change the admission table | Policy |
| `accept.mode` | Switch between off, observe and auto | Policy |
| `rule.create` | Add a kind of proactive work | Policy |
| `rule.update` | Edit or turn a rule on or off | Policy |
| `bots.update` | Change which bots may suggest work | Policy |
| `person.create` | Add a person or a handle | People |
| `person.link` | Link a handle to a person | People |

## 9. Sources (ask)

| Id | Action | Screen |
|---|---|---|
| `source.add` | Listen to a new source (a Slack channel, a repo, a mailbox) | Sources |
| `source.scope` | Change what a source listens to | Sources |
| `source.pause` | Pause or resume a source | Sources · **on** |
| `source.remove` | Stop listening to a source | Sources |
| `schedule.update` | Add or change a schedule | Sources |

## 10. Itself (ask)

| Id | Action | Screen |
|---|---|---|
| `self.prompt` | Edit its own instructions | Agent editor |
| `self.model` | Change its own model | Agent editor |
| `self.tools` | Change its tools, skills or MCP connections | Agent editor |
| `self.permissions` | Change its own Permissions | Settings |
| `self.budget` | Raise its spending limit | Settings |
| `self.pause` | Pause itself | Settings · **on** |

## 11. Workspace (off)

Not offered to managers by default. Listed so nothing is left out.

| Id | Action | Screen |
|---|---|---|
| `vault.write` | Add or replace a key | Keys and vault |
| `connection.create` | Connect a new account (OAuth) | Connections |
| `member.invite` | Invite or remove a member | Workspace |
| `manager.create` | Create another manager | Managers |
| `manager.delete` | Delete a manager | Managers |
| `billing.update` | Change billing | Workspace |

There is no action that reads a key's value. Agents use keys through the engine and never see them.

## Rules for the catalogue

- **Every button names its action id.** A UI test fails if a button calls something not in this list, which keeps
  the manager's tools and the screens in step.
- **Every action is one tool**, with the same id, input and result for the button and the manager.
- **Every action has one sentence.** Each action defines `describe(input, by)`, which returns a plain sentence:
  "Manager moved *DT-14* to Review", "Add *@acme.com* to who may ask Launch v2.3". The same sentence is the `ask`
  prompt, the audit log line and the task history entry, so the three can't drift apart. Never show the bare id
  ("allow.add") to a person.
- **Every call is recorded with who made it**: `by: { kind: "person", id: PersonId } | { kind: "manager", id:
  ManagerId }`, plus when and the permission it ran under. Every change the action causes carries the same `by`, so a
  screen can show "the manager moved this" without looking anything up.

```ts
type By = { kind: "person"; id: PersonId } | { kind: "manager"; id: ManagerId };

interface Action<Input, Result> {
  id: ActionId;                                   // "task.move"
  category: CategoryId;                           // "tasks"
  run(input: Input, by: By): Promise<Result>;
  describe(input: Input, by: By): string;         // "Manager moved DT-14 to Review"
}

interface ActionRecord {
  action: ActionId;
  input: unknown;
  by: By;
  at: string;
  permission: Permission;                         // what it ran under
  approvedBy?: PersonId;                          // set when permission was "ask"
  sentence: string;                               // describe() at the time of the call
}
```

The pattern comes from UI SDK's agent bridge (`details.source`, `describeEntry`); see [ui-sdk.md](ui-sdk.md).
