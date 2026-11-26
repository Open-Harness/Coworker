# The parts of a playbook

| Part | Must say | Checked by code |
|---|---|---|
| `SKILL.md` | What it is for, how it works, when it stops and asks, what good looks like. One page | It is there, and under 120 lines |
| `objective.yaml` | What they said, the measure, the aim, what must not get worse | Each measure is read where the manager cannot write |
| `workflow.yaml` | Each kind of work: its steps, who, what must be true to go on, what if not | Every step can end. Who checks is not who did it |
| `triggers.yaml` | Crons, events, waits, what is handed over. Only when, at most | It makes a kind that is there. It has a limit |
| `agents/` | What it does, its skills, its model | Every skill is there |
| `skills/` | Crafts this one needs and nobody has | Same cases, with it and without it |
| `reach.yaml` | Accounts, what it may do alone, what it asks for, limits | A part of what whoever makes it may do |
| `evals/` | For each part: what good is, who judges, cases, the aim | None is missing |
| `because.yaml` | Each line: said, looked up, my idea | None is missing |

Prefer fewer. Two steps before five, one agent before three, a library skill before a new one. A step is there because
something must be true before the next may begin. Inside a step the agent is free.
