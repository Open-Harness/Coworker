# GitHub, for us, and it just works

The first factory: coding. Used by us, on a repo of ours, on staging, with a real model. "Today" is read from the spike's code on
25 November 2026, not run.

## Setting up: two clicks

1. Connect GitHub. 2. Pick the repo. That is all: no lanes, templates, agents, events, lists of who may ask.

It then does by itself: reads the repo and its instructions (AGENTS.md, README, CI), finds how to install and test, makes
the environment, tries it, and says in one message what it found and what it cannot do. Whoever can write to the repo may ask.

## The journey

| # | What happens | Today |
|---|---|---|
| 1 | You mention it on an issue, label it, or tell it in chat | Heard, if the issue and comment events were chosen |
| 2 | It answers on the issue within a minute: what it understood, done-when, or one question | Only if the model thinks of it. No done-when |
| 3 | It works in a clone that installs and tests | A bare container with no repo in it (F78). Bash only, no edit tool |
| 4 | It opens a pull request that says what, why and how it was tested, linked to the issue | The token allows it. No tool for it and no `gh`: it must find out how |
| 5 | A fresh instance reviews it, and fixes are made, before you are asked | Nothing |
| 6 | CI fails: it reads the log, fixes it, pushes. CI passes: it knows | A failed check is heard, never a passed one (F75), and nothing wakes whoever did the work (F56) |
| 7 | **You review it on GitHub like anyone's.** Every comment is answered or done, and it says which | A line comment is not an event it hears (F74). A review on its own pull request is not linked to the task (F76) |
| 8 | Conflicts and a moved main: it rebases | Not heard |
| 9 | You merge, or tell it to. It may merge by itself only where you said so | It cannot merge, and does not hear a merge (F75) |
| 10 | The issue is closed, whoever asked is told, and it stops | Nothing: the task stays open |
| 11 | Quiet for a day: it looks again, and says what it waits for, once | Nothing wakes it (F64) |
| 12 | You corrected it: it proposes a note for this repo | Nothing (F63) |

## In the console

Being redone: this was drawn for someone doing the work. The console is for whoever runs the system (first-principles 26 to 31).

- **Its GitHub**, as it sees it: issues and pull requests it has, each with what it waits for (you, CI, itself), done ones
  gone. Opens as an issue or a pull request: the conversation, the diff, the checks, and what it did beside it, live.
- **The co-worker**: talk to it; what it is doing now; what it may do on this repo; its notes.
- **Your inbox**: what it needs from you, shown in full. Answering on GitHub answers it here too.

## Done when

1. Ten real issues in our repo, taken to a merged pull request or an honest "no" with the reason.
2. For each: the minutes of your attention, what it cost, and how often you had to say something twice.
3. Nothing was lost: a deploy and a crash in the middle of a job change nothing.
4. You used it a week without opening the code to see what it was doing.
