# templates

Playbooks with blanks: filled, saved from a manager, newer versions offered. Pure.

Not built. `types.ts` is the contract and compiles; `service.ts` says so where it is called. What it must do: spec T1 to T5 in
[docs/spec.md](../../../docs/spec.md). What shows it: the evals under `templates` in [docs/book.md](../../../docs/book.md).

A template's folder is a playbook's files and `template.yaml`, which is `Template` without `files`. A blank is `{{id}}` anywhere in a file.
A value that is only a blank (`"{{perWork}}"`) loses its quotes when the blank is a number. A model blank's answer is `inherit`, or
`<connection> <model> <thinking>`, and becomes the map of `ModelChoice`. An answer is text: it can never add a line or a key.
A `best` of `whoever makes it` is whoever does; an empty one `from: the repo` is what reading the place found.

`docs/templates/repo` and `docs/templates/customers` are written. `calls`, `docs` and `releases` are drawn (Settings, Templates) and still to write.

## Settled by the evals

- `read` gives every file of the folder but `template.yaml` as `files`, as it is. A problem of it is at `template.yaml` and names the blank. A model blank whose best is not `inherit`, a blank other than a place with no best, and a blank twice, are problems.
- A blank has an answer when it has one in `answers` or a `best` (an empty best is one). A blank with neither is left: `Blank` lists them, in the order of the template. The types give `fill` no way to know who makes it, so a person is always answered.
- A number answer is digits, with or without a decimal part; anything else is a problem that names the blank. A model answer is `inherit` or `<connection> <model> <thinking>` with thinking one of `off`, `low`, `medium`, `high`; anything else is a problem that names the blank. A model that is not connected is the check's problem, at `agents/<id>`.
- An answer is put in once, as text: never read again for blanks of its own, and never able to add a key. One that has more than one line may be put in as one text or refused.
- `fill` gives `Problems` when the files do not read or check against what is around.
- `saveAs`: each place (but `*`) becomes a place blank with no best; each person (owner, judges, who does, checks or is asked, who may ask, whose a measure is) a person blank; the model of each agent that is not `inherit` a model blank for that agent, best `inherit`; a secret (`ghp_`, `sk-`, `xoxb-` or `AKIA` and what follows) is cut out; the cases of every eval become none. What was cut is in `gone` by file, without saying what it was. Every blank is used and every `{{id}}` is a blank. `whose` is `this workspace`, `version` is 1, `needs` the accounts it uses.
- `newer` is `Same` when the template is not a newer version, or changes nothing here. Otherwise the three sides are what was given (`given`), what the template makes with the manager's own values (found by matching its lines to `given`), and `now`. A line only the template changed is a change (`was` as it is now, `becomes` without blanks); a line both changed in two ways is a clash and not a change; the same change on both is neither.
- `GET /templates` lists exactly `calls`, `customers`, `docs`, `releases` and `repo` (ours) and the workspace's own saved ones. After `try` with a place, `blanks` say what was found: the place's own blank has the place as `best`, and `install` and `test` have what reading it found. `manager.make` with only a place reads the place the same way. A saved template's place blank has the id the account gives it (`repo` for GitHub, `mailbox` for mail), but a flow takes it from `blanks` (`is.a === "place"`).
