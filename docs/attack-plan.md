# Plan of attack

**Set aside on 25 November 2026**: we are designing from first principles instead, see [first-principles.md](first-principles.md).
Kept for its list of what failed and how we stop it.

Proposed, not agreed. It covers everything in [findings.md](findings.md): 48 fixes (F) and 12 model questions (M).

## What went wrong, in one line

The book tested what I thought the product was, so a full score said nothing about the product you described. Fixing 48
findings one by one would keep that cause. So: make failures visible first, fix what needs no decision, decide the
model, then rebuild the screens on it once.

## Three tracks

| Track | What is in it | Needs you |
|---|---|---|
| A · Make it work | Findings where the right answer is already known | No, until the review at the end |
| B · Decide the model | M1 to M12, in two rounds | Yes: two sittings |
| C · Rebuild on the model | Connectors, the manager as an agent, Inbox, Board, Task, Events | One look per screen, from staging |

A and B run at the same time. C starts when B is written into `model.md` and the canvas.

### A · Make it work

In order. Each is done when a test that failed before passes, and it works on staging.

| Step | Findings |
|---|---|
| 1. See it: what each request spent and where, errors with a place to read them, slow pages recorded | F16 |
| 2. Connect a model: ChatGPT sign-in, Command Code, a retry that works, errors that say what to do | F1 to F9 |
| 3. The manager asks through the Inbox, and the settings it has are obeyed | F10, F11, F14, F26, F41 |
| 4. Speed: fewer trips to the database, pages that keep what they had, changes sent instead of asked for, files cached | F15, F17 to F20 |
| 5. Small and certain: the old chat at `/`, `DT-`, GitHub noise, the missing tools | F12, F13, F21, F22 |

### B · Decide the model

Two rounds, each with the code and options in front of you.

1. **People and work** (M1 to M6): what is in an Inbox and whose; tasks for people; the owner; which views; what a board
   looks like and who may change that.
2. **Connectors and managers** (M7 to M12): one connector with events, actions, permissions and its own view; the manager
   as an agent you can open; one stream of events and where it goes.

**Where I lean, to be argued with:** a person, a manager and a worker are all *members*. Each has an inbox, work given
to it, and connectors with permissions. A manager is a member with a mission and a board. A connector (GitHub, Email,
Slack, an MCP server) brings events, actions and a view, and each action is on, ask or off for each member. Events are
the raw stream; an inbox is what got through to one member. pi-durable already has the matching part: an *extension* is a
named set of tools, hooks and prompt sections a conversation selects, with tools loaded only when needed.

### C · Rebuild on the model

1. Connectors and their permissions: F45, F46, F48 (GitHub and Email moved onto it first, then MCP: F47)
2. The manager as an agent: F42, F43, F44
3. Inbox, then Task, then Board and List, from the templates named on the canvas: F25, F27 to F40

## How we stop it coming back

| What failed | What we do from now on |
|---|---|
| Fakes that copied our own assumptions (F2, F3, F6) | Fakes replay recorded real answers. A nightly run compares them with the real service |
| A scripted model that always did the right thing (F10) | A few behaviour tests with a real model, each run several times, with a pass rate |
| Parts tested alone (F1) | Every finding gets a test at the level where it broke, written first and seen to fail |
| "As on the canvas", checked by three titles (F25) | A screen is done when an agent that did not build it compares it with its template and canvas, and you have seen it |
| A score that measures the book (F23) | The score is journeys on staging: sign up, connect a model, make a manager, get asked, answer, see a task done |
| Settings stored and never obeyed (F26, F37) | One search for all of them, now; then a test per setting that shows it changes something |
| Slowness nobody measured (F15) | A limit per page that fails the build |

`ui:manager/board` and `acc:manager/tools-are-actions` pass without checking what they claim. Their tests would be
corrected first, so the score drops before it rises.
