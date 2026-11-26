# playbook

A playbook as files: read, checked, compared, merged. Pure.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec B1 to B7 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `playbook` in [docs/book.md](../../../docs/book.md).

## The files

| File                   | Holds                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `SKILL.md`             | Front matter `name`. Then the page: at most 120 lines, its sections are `##` headings                                           |
| `objective.yaml`       | `Objective`                                                                                                                     |
| `workflow.yaml`        | `kinds:` a list of `Kind`                                                                                                       |
| `triggers.yaml`        | `triggers:` a list of `Trigger`                                                                                                 |
| `agents/<id>.md`       | Front matter `name`, `is`, `skills`, `tools`, `model` (`inherit`, or `connection`, `model`, `thinking`). The rest is `told`     |
| `skills.yaml`          | `use:` the skills that are there already: `id`, `name`, `layer`, `says`, `from`                                                 |
| `skills/<id>/SKILL.md` | A skill of its own. Front matter `name`, `layer` (`craft` or `playbook`), `says`. `from` is `here`. Other files of it beside it |
| `reach.yaml`           | `ReachFile`                                                                                                                     |
| `evals/<id>.yaml`      | `Eval` without its `id`                                                                                                         |
| `because.yaml`         | A map of lines to `Because`                                                                                                     |

Every key is as in `types.ts`. An unknown key, a missing one, or one of another shape is a problem at its file and line; the rest is still
read, so that all problems are said at once.

## Lines

What a comment, a suggestion, a diff and `because` speak of.

| Line                                                                                                             |                                    |
| ---------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `page`, `page/<heading>`                                                                                         | The page, and each section         |
| `objective`, `objective/said`, `objective/measure`, `objective/aim`, `objective/notWorse/<n>`, `objective/owner` |                                    |
| `workflow/<kind>`, `workflow/<kind>/<step>`                                                                      | A kind without its steps; one step |
| `triggers/<id>`                                                                                                  |                                    |
| `agents/<id>`, `agents/<id>/told`, `agents/<id>/model`                                                           |                                    |
| `skills/<id>`                                                                                                    |                                    |
| `reach/<account>/<place>`, `reach/limits`, `reach/mayAsk/<account>/<place>`, `reach/never/<n>`                   |                                    |
| `evals/<id>`                                                                                                     |                                    |

`because` needs one for `page`, `objective`, every kind, step, trigger, agent, skill that is `here`, grant and eval.

## What `check` refuses

Each in one sentence that names the thing. A step, agent, skill, kind, person, tool, account, action, event or model that is not there. A step
that cannot end: its `back` leads nowhere, or round and round without `times`. A step checked by whoever does it. A page over 120 lines. A cron or
wait with no limit. A cron agent that may write outside. A step, agent, craft skill of its own or cron without an eval. A line without a
`because`. A grant or limit wider than the one above. A measure that is read from a field it may write.

## Settled by the evals

- A problem of `read` has the file as `at`; for a thing in a list its `line` is that thing (`triggers/issues`, `workflow/bug/build`, `agents/doer`, `skills/review`, `evals/bug-build`).
- A problem of `check` has `at` the file of the thing (`workflow.yaml`, `triggers.yaml`, `agents/<id>.md`, `skills.yaml`, `skills/<id>/SKILL.md`, `objective.yaml`, `reach.yaml`, `evals/<id>.yaml`, `SKILL.md`, `because.yaml`) and `line` the thing as in Lines; the owner is `objective/owner`, a measure `objective/measure`, a kind's grants and limits `workflow/<kind>`, the limits of the reach `reach/limits`.
- In `objective/notWorse/<n>` and `reach/never/<n>`, `<n>` counts from 1.
- `lines` goes in this order: the page, the objective, the workflow (a kind, then its steps), triggers, agents, skills, reach, evals; the sections of the page in file order.
- A line holds what no line below it holds: `workflow/<kind>` is the kind without its steps, `agents/<id>` is the agent without `told` and `model`, `page` is the page before its first `##`. Changing a part changes that line, and only it (a parent line may also show it for `objective`, `page` and `agents/<id>`).
- `diff` is the lines whose text differs, read through `lines`: `was` and `becomes` are the text of the line before and after, `null` when the line is not there. A different way of writing the same playbook is no difference.
- `apply` puts each `becomes` where `was` is, in any order, all or nothing; a `was` that is not the text of that line now (a line already changed, added, removed, or never there) is a problem naming that line.
- `merge` is `diff` three ways, line by line: a line only one side changed takes that side, the same change on both is made once, a line changed in two ways (or changed and removed) is a `Clash` of that line, and every clash is listed.
- The body of `SKILL.md`, an agent or a skill is what follows the front matter and one blank line, kept as it is; the front matter is the first block only.
- A page is counted by its `\n`: a final newline does not start a line, an empty line is a line, 120 is allowed and 121 is not.
- `times` of a `back` is a whole number from 1 up; a `back` names a step of its own kind.
- A skill used by a step or an agent is there when it is a skill `here` or is in `Surroundings.skills`; so must be each entry of `skills.yaml`. A tool is there when it is in `Surroundings.tools` or is an action of an account.
- An eval is `of` the line it judges (`workflow/<kind>/<step>`, `agents/<id>`, `skills/<id>`, `triggers/<id>`); a skill of layer `playbook`, a kind and an event trigger need none. Every eval needs its own `because` too.
- A permission is wider when it is stronger (off, then ask, then on; what is not listed is off). A place is wider when no grant of that account above is for it or for `*`. A limit is wider only when both are set and the part's is more; equal is not wider.
- `read` never throws. A key twice is a problem at its file. Anchors and aliases are read, as the templates use them; what they could blow up into is never walked in full.
- Not shown, because the types do not say which actions write: _a cron agent that may write outside_, and _a measure read from a field it may write_.
