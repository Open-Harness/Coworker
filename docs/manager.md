# How a manager works

**Why, not what to build.** [spec.md](spec.md) and `src/modules/*/types.ts` are what to build, and win.

The shape was agreed on 25 November 2026 ([first-principles.md](first-principles.md), 39 to 46); the words are in [design.md](design.md).
This page is the reasoning and the types under it. It joins DeepSeek's super-agent (docs 000 to 008), our older
[model.md](old/model.md), and first-principles. Where a type here still says *feed*, *station*, *policy* or *plan*, read *trigger*, *step*, *playbook*.

## In plain words

A person says **what they want to get to**. That is an objective, and everything below is made to move it. The co-worker turns it
into a plan; the person explains and says yes, and never designs. A manager is a small factory with a **mandate**: what it is for,
and how far it may go.

1. **Things come in.** Some arrive (a mail, a mention, a deal that moved). Some it goes and finds: *every weekday at 07:00 the
   researcher reads the 140 target companies and looks for a new site or a new head of operations.* Some become true by waiting
   (a lead has been quiet for three days). Some a person or another manager hands it.
2. **Its policy decides.** First code: is this someone who may ask, or something it was told to look for? Then judgement: which of
   its kinds of work is this, if any? Take it on, add it to work already open, leave it alone, stop, or say it could not tell.
3. **What it takes on gets a mandate**: who or which rule allowed it, what it may do, until when, for how much. It never grows.
4. **The kind of work says how it is done**: the steps, which agent does each, what done means, who checks.
5. **Agents do it**, inside the work's mandate. Later messages about it go to whoever has it, with no second decision.
6. **The answer goes back where it came from.** A person hears of it only when they must act or can use the result.
7. **It is measured by the objective**, read from a system it does not write to. What it wrongly took on or left, and what it cost,
   explain the number. The co-worker proposes changes from both.

So "when do you look for work" was the wrong question. The right ones are: **what comes in, what may it take on, how is each kind
done, how far may it go.** The co-worker asks them, having looked first.

## Where we and DeepSeek say the same

| DeepSeek | Ours, agreed | |
|---|---|---|
| Take little attention, give much value (000) | Measured by what it finishes per minute of your attention | Same |
| Source, Trigger, Thread (001) | Connector, event, thread (32, 36, 38) | Same, other words |
| A person's later message goes to the work, not to a new decision (002) | One instance stays with one thing for weeks | Same |
| Channel: the answer goes to where it was asked (001) | 17, 36 | Same |
| It speaks only when a person must act or can use it (000) | 17 | Same |
| One question, structured (000) | An ask, to one person | Same |
| Setting up: an agent probes the machine, asks one thing at a time, makes one plan, starts narrow (SETUP.md) | The root provisions managers (25) | Theirs says **how**, for an installation. Ours does not, and must look at the business too |
| A panel with: does anything need me, is it healthy, the history of one piece of work (005) | Look at it in aggregate (30) | Theirs adds the history: why was this taken on? |

## The gap

| Part of the chain | DeepSeek | Our model.md | The spike | First principles, the drawn screens |
|---|---|---|---|---|
| Things that arrive | Source | Source | Email, GitHub | Connectors |
| **Things it goes and finds** | A Source. No example of one that searches | A Schedule source that fires a prompt; no list, no finding, no "same again" | A `schedule` tool in chats only; managers have none (F64) | **Nothing.** A clock that says "look for new work" |
| **Things true by waiting** | A Source ("no assignee for N hours"). Judging never waits | No | No | No |
| Who may ask | Allowed list, table per place, bots | Same, and people | Built (`gate.ts`) | **Not shown** |
| **What it may take on unasked** | Rules in words, each judged once | `rules[]` | In the list of actions, no code (`Policy` has none, F60) | **Nothing** |
| **Watch before doing** | off, observe, auto, for all rules at once | Same | Stored; auto and observe do the same (F60) | "Trust per kind of work" as a sentence |
| A decision, with why | Accept, stop, ignore, unavailable | and attach | Kept per event | **Not shown**: things come in, work appears |
| **Mandate** | Rule, version, scope, sender. Never changes | Same | Four fields, shown on the task. The worker is never told of it | Scope is of the manager. **A piece of work has none**, so every job has the manager's whole reach |
| How each kind is done | Out of scope: one executor, one repo | A board | Title and a brief | "Factory", "kinds come after" |
| Policy has versions; a change reaches running work | Yes | Yes | No | No |
| Setting it up | An agent with its operator, from SETUP.md | No | A form | A wizard: name, connectors, "look for new work", a limit |

The spike's gate is good and stays. What is missing is the middle: **finding, kinds of work, mandate, and showing the decision.**

## Objectives, plans, primitives

The wizard (name, connectors, "look for new work", a limit) asks a person to design. That is backwards, and it skips the one thing
only they know: what they want to get to. So three things are missing above the manager.

| | What it is | Who writes it |
|---|---|---|
| **Objective** | What we want to get to: a result, how we would know, by when, and what must not get worse | The person says it. The co-worker makes it measurable and asks |
| **Plan** | Everything that will be there to reach it, in one file, made only of the primitives below | The co-worker |
| **Primitives** | The nine things a plan can be made of. Nothing else can be set up, by anyone | Us, in code |

```text
you explain  ->  objective  ->  plan  ->  rehearse on the past  ->  your yes  ->  made  ->  measured  ->  a new plan
                                  ^                                                |
                                  +---------- the settings screens ----------------+   (the same plan, seen in parts)
```

```ts
/** What we want to get to. It nests, as the managers do: one above is reached through the ones below. */
interface Objective {
  id: ObjectiveId; under: ObjectiveId | null;
  said: string;                           // the person's own words, kept
  result: Measure; target: number; by: Date;
  mustNot: { measure: Measure; worseThan: number }[];      // people's time, complaints, cost per result
  owner: PersonId;                        // who is asked when it and something else pull apart
}

/** A number we would act on. Never the manager's own count of its own work. */
interface Measure {
  id: MeasureId; name: string; counts: string;             // "Calls that took place, with a company that fits"
  read:
    | { from: AccountId; query: Query }                    // a system of record. The manager may not write this field
    | { from: PersonId; asks: string };                    // someone's judgement, asked for
  settles: Duration;                      // how long until a result counts: a fix that stays fixed for 14 days
  before: Reading | { unknown: string };  // what it was without the manager. Measured first, or it says why not
}

/** Everything that is there for an objective. The only thing that is applied, and what every settings screen shows a part of. */
interface Plan {
  version: Version; objective: Objective;
  managers: { name: string; above: ManagerName; mandate: Mandate; policy: Policy; board: Board }[];
  feeds: Feed[]; kinds: Kind[]; agents: Agent[];           // a kind names its steps, a step names its agent
  needs: { person: PersonId; does: "signs-in" | "allows"; what: string }[];
  because: Record<Path, Said | LookedUp | Proposed>;       // each line: you said it, it was found, or it is the co-worker's idea
}

plan:   (objective, facts) => Plan;                        // the co-worker. It reads, it changes nothing
check:  (plan, schema, mandate) => Problem[];              // code: every name exists, nothing wider than its own mandate
diff:   (now: Plan, next: Plan) => Change[];               // each change is one action a person could press as well
apply:  (changes, yes: PersonId) => Version;               // all or nothing. Going back is a new version
```

The nine primitives, and where each is seen afterwards:

| Primitive | Says | Its settings screen |
|---|---|---|
| Objective | What we want to get to, by when, what must not get worse | Overview, Playbook > Objective |
| Measure | What is counted, where it is read, what it was before | Overview |
| Feed | What comes in: it arrives, it is searched for, it becomes true, it is handed over | Intake > Feeds, Playbook > Triggers |
| Kind of work | When something is work, whether it starts alone, its stations, done when | Playbook > Workflow, Kinds of work |
| Agent | A role: instructions, skills, model | Playbook > Agents |
| Skill | How something is done well; which layer it is from | Playbook > Skills |
| Eval | What good is for one part, its cases, its line | Playbook > Evals |
| Mandate | How far it may go, until when, for how much | Playbook > Mandate |
| Connector | An account and what may be done with it | Connectors |

Four rules:

- **An objective does not always make a manager.** The co-worker first looks whether one that is there can carry it. A plan may be
  one feed added to Support.
- **How it is triggered is in the plan, never a form.** There are four triggers (the four feeds). "Weekdays at 07:00" is a property
  of a search, and the co-worker picks it by trying cadences on the past.
- **The screens and the plan are the same thing.** A change by hand is a new version of the plan; so is one the co-worker proposes.
  Neither can undo the other without it showing.
- **An objective can be watched like anything else.** Two weeks behind its line is an item for the co-worker, which looks for where
  it is lost and proposes a new plan. That is how "improve the managers" starts.

A ready-made one ("Sales", "Support") is a template: a playbook with blanks (which repo, who, the aim). Any number of managers are made from one, each keeps
its own copy, and any manager can be saved as one ([design.md](design.md)).

## Skills, and the one that is the manager

What a manager knows is skills, in four layers. Each is a folder with a `SKILL.md`, as skills already are in our code
(`src/modules/settings/internal/skills.ts`: versions, checks, 50 files).

| Layer | Says | Whose | Who has it |
|---|---|---|---|
| **Harness** | How work, threads, asks and reports are done here, and each base tool | Ours, in code. Not editable | Every agent |
| **Connector** | How to use mail, the CRM, GitHub well. Plus what is odd about *your* CRM | Comes with the connector; your notes on top | Whoever may use that connector |
| **Craft** | One thing done well: a short mail, reading a company, Bo's way of writing | A library, yours, or made for this manager | An agent that names it |
| **Playbook** | What this manager is for and how it works, start to finish. The "mask" it puts on | Written for it, by the co-worker with you | One per manager. The manager reads all of it, an agent only its station |

So an agent at work = harness + the connectors it may use + its craft skills + its page of the playbook. Two rules:

- **A skill never grants anything.** It says what it would need; the mandate says what it may. Code compares the two.
- **Nothing is in a manager without a measure.** A skill nobody can show the use of is taken out.

The plan above and the playbook are one thing: **the plan is the playbook's folder.** The words are for the agent, the files with a
fixed shape are for code.

```text
sales/
  SKILL.md                  what it is for, how it works, when to stop and ask. One page
  objective.yaml            the objective, its measures, what must not get worse
  workflow.yaml             each kind of work and its stations
  triggers.yaml             crons, events, waits, what is handed over (the four feeds)
  agents/writer.md          instructions, its skills, model
  skills/bos-voice/SKILL.md a craft skill made for this manager
  reach.yaml                accounts, actions, limits it asks for. Becomes the mandate when you say yes
  evals/writer.yaml         what good is, the cases, the line, who judges
  because.yaml              each line: you said it, it was looked up, or it is the co-worker's idea
```

```ts
/** A kind of work is a path of stations. Between them the rules are fixed; inside one the agent is free. */
interface Station {
  id: StationId; does: string;
  by: AgentId | PersonId; skills: SkillId[];
  hands: Schema;                          // what it passes on
  leaves: Check[];                        // must be true to go on. Checked by someone else than `by`
  otherwise: { back: StationId } | { ask: PersonId } | { drop: string };
}

/** How we know a part is any good. `good` is the person's; the manager never edits its own. */
interface Eval {
  of: TriggerId | StationId | AgentId | SkillId | "playbook";
  good: string; judge: "code" | PersonId | { model: string; agreesWith: PersonId };   // a model judge is checked against a person's
  cases: Case[]; now: Score | null; line: Score;
}
interface Case { item: ItemId; happened: string; right: boolean; saidBy: PersonId; from: "past" | "live" | CommentId }

interface Comment {
  on: Path | CaseId; by: ActorId; text: string;             // a line of the playbook, or one thing it did
  became: { change: Change } | { answer: string } | { case: CaseId } | "open";
}
```

| Part | Its measure | When it is poor |
|---|---|---|
| A cron or other trigger | Finds that became work, how late, what it cost | Slower, narrower, or gone |
| A station | Work that passes the first time | Its brief or its gate changes |
| An agent | What the next one takes unchanged; cost | Other skill, other model |
| A skill | The same cases **with it and without it** | Taken out |
| The playbook | The objective | The workflow changes |
| **The set-up skill** | Lines of its drafts that people changed; questions that changed nothing | It asks or looks up other things next time |

**Improving it.** Each week the co-worker takes the weakest part, proposes *one* change, runs it on the cases, then beside the old one.
Better on the cases and the objective not worse: kept, as a new version. It may do that alone for wording, skills, models and how often
it looks. Stations, reach, and what "good" means are asked. The proposal is a suggestion on the playbook's page, like anyone's.

## The set-up skill

A harness skill of the co-worker's own, written in [skills/set-up-a-manager](skills/set-up-a-manager/SKILL.md). It holds how to get
from a sentence to a playbook; it does not hold the questions. **It writes a walkthrough for this one case**:

```ts
interface Walkthrough { objective: Objective; steps: Step[] }          // new steps may be added after each answer
type Step =
  | { is: "ask"; questions: Question[] }                               // a round: at most three, on one page
  | { is: "connect"; wants: { connector: ConnectorId; reads: string; tells: string; without: string }[] }
  | { is: "look"; findings: Finding[] }                                // what the past says, each with its source
  | { is: "draft"; playbook: Playbook };
interface Question { ask: string; picks: Choice[]; best: Choice; because: string; changes: Path[] }
```

1. **You say it.** It says it back so that it can be measured.
2. **First round.** Only what nobody but you knows: what counts, what must not get worse, how far without asking.
3. **Connect, to look.** Read only, and it ends when the draft is made or thrown away. Skip one, and it says what it then cannot know.
4. **What it found.** How it went so far, where it is lost, how people do it today, how often looking pays. You can say "that is wrong".
5. **Second round**, made from what it found. Two at most. There is no third: what is left is a line marked "my idea" in the draft.
6. **The draft**: playbook, workflow, triggers, agents, skills, reach, evals. Everything can be edited, and commented on. A comment
   comes back as a change you accept, or an answer. It has already been run on past work.
7. **You judge about ten cases.** Those are the first evals. Then "Make it".

Its rules: never ask what can be looked up; never ask a question whose answer would not change a line; always have an answer of its
own, so that "you decide" works; nothing is made before step 7. The draft is **the manager's Playbook page** before it is there:
the same page, so comments go on working afterwards. It takes the place of Policy and Mission.

## What we measure

Received, delivered, returned and time to done count the manager's own activity. More of each can be better or worse, and the manager
writes them all. They stay in Intake, where they explain a number. They are never the number.

A measure is real when it is **read from somewhere the manager cannot write, or said by a person**; we **would do something else** if
it moved; and it has a **before**. Until it can be read, it says "Not yet" and when, and nothing stands in for it.

| | Result | Must not get worse | Only explains |
|---|---|---|---|
| Sales | Calls that took place with a company that fits (CRM, set by Bo); then won, and its value | People who said stop; Bo's minutes per call; cost per call | Came in, taken on, booked |
| Coding | Issues fixed that stay fixed for 14 days (GitHub) | Undone or reopened; the reviewer's minutes per fix; cost per fix | Merged, sent back, hours per step |
| Support | Solved, and not back within 7 days; how long the customer waited | Customers who say it was wrong; minutes of a person per case | Answered, handed on |
| The co-worker | Objectives on their line; people's minutes per result | Decisions people reversed; what it missed | Threads, runs, cost |

## The shape

```ts
interface Manager {
  id: ManagerId; name: string; above: ManagerId | null;
  objective: ObjectiveId;                 // what it is there to move
  mandate: Mandate;                       // its job, and how far it may go. A part of the one above's (10, 12)
  feeds: Feed[];                          // what comes in
  policy: Policy;                         // what of it becomes work
  board: Board;                           // where the work is (28)
}

/** How far someone may go. One shape at every level: manager, work, agent. A part, never more than it was made from. */
interface Mandate {
  strength: "asked" | "found";            // DeepSeek's direct and proactive. What it was asked is checked again when a policy changes
  for: string;                            // a manager: its job. Work: what was asked or found
  of: MandateId | PersonId;               // whose part this is; taken back there, gone here
  because: { asked: ActorId; item: ItemId } | { kind: KindId; policy: Version; item: ItemId } | { setUpBy: PersonId };
  may: Grant[]; limits: Limits; until?: Time;
  state: "holds" | { stopped: ActorId } | { revoked: Version };   // what it allows never changes; it can only end
}

/** A piece of work. Nothing open is without a next (16). */
interface Work {
  id: WorkId; kind: KindId; mandate: MandateId; answers: ManagerId;      // who answers for it (15)
  next: { what: string; who: AgentId | PersonId; by: Time };             // an ask to a person has a date too
  follows: ThreadId[];                    // what arrives on these goes to it, until it ends or hands one back to be judged
  report?: { done: CheckResult[]; checkedBy: AgentId };                  // never the one who did it (15)
}

/** One thing that brings items in. All four make the same Item, so all four meet the same policy. */
type Feed = { id: FeedId; name: string; on: boolean; makes: KindId[] } & (
  | { by: "event"; account: AccountId; where: string; events: EventKind[] }           // it arrives
  | { by: "search"; search: Search }                                                  // it goes and looks
  | { by: "waiting"; of: Query; holds: Check; for: Duration; look: Cadence }          // it becomes true
  | { by: "hand"; from: "people" | ManagerId });                                      // it is given

/** "Every weekday at 07:00, the researcher reads these companies, for these signs, and brings back at most ten." */
interface Search {
  when: Cadence;                          // hourly, weekdays 07:00, the first of the month; or after another feed
  run: { agent: RoleId } | { workflow: WorkflowId };
  over: Query | Item[];                   // a list in the CRM, a saved search, last week's lost deals. Read fresh each time
  brief: string;                          // what to look for, in words
  finds: Schema;                          // what one finding is: company, sign, source link, date
  same: FieldName[];                      // which fields make it the same finding again, so it comes in once
  atMost: number; limits: Limits;
  may: Grant[];                           // reading only. A search never writes to anyone
}

interface Item { id: ItemId; feed: FeedId; thread: ThreadId; by: Actor; at: Time; what: unknown }   // kept once, unchanged

interface Policy {
  version: Version;
  ask: Record<FeedId, { listed: Let; stranger: Let; overheard: Let; bots: ActorId[] }>;   // who may ask, per feed. Code
  kinds: Kind[];
  never: string[];                        // lines it does not cross, in words
}
type Let = "asked" | "maybe" | "no";      // a request, something to judge, or nothing

/** One kind of work: when it is that, whether it may start by itself, and how it is done. The joint of the whole thing. */
interface Kind {
  id: KindId; name: string;
  when: string;                           // in words, judged by a model
  examples: { item: ItemId; is: boolean; saidBy: PersonId }[];    // corrections land here
  alone: "off" | "watch" | "ask" | "do";  // work nobody asked for. Asked-for work always starts
  steps: Step[]; doneWhen: Check[];       // each step: which agent or person, what it hands on
  may: Grant[]; limits: Limits;           // what its mandate will say. A part of the manager's
}

type Decision = { item: ItemId; policy: Version; kinds: { kind: KindId; is: boolean; why: string }[] } & (
  | { took: WorkId; mandate: Mandate } | { joined: WorkId } | { left: string; would?: KindId }
  | { asked: AskId } | { stopped: WorkId } | { couldNot: string });
```

Two pure functions and one judgement, in this order:

```ts
gate:   (item: Item, policy: Policy) => { let: Let; why: string };                  // code, no model. Today's gate.ts
judge:  (item, thread, kinds, openWork) => Verdict[];                               // a fresh fork that can only read (38)
decide: (gated, verdicts, policy, mandate) => Decision;                             // code. The model never grants anything
```

## What we take from DeepSeek, and what we change

Our `Mandate` is what first-principles calls scope, with who gave it and until when; `Kind` is one line of a factory, and a factory is
the kinds and the board together. Take as it is: the gate before the judgement; every kind judged each time, also the noes; decisions kept with the policy's
version; later messages go to the work without a new decision, until it ends or hands one back; what a mandate allows never changes, wider is new work; a person's stop is
final; waiting belongs to a feed; a changed policy throws away running judgements and tells open work; outside text never grants.

Change:

| Theirs | Ours | Why |
|---|---|---|
| One mode for all proactive work | One per kind: off, watch, ask, do | Trust is earned per kind |
| Nothing goes looking | `search` is a feed | That is most of sales, research, recruiting |
| One executor, one repo | Steps per kind, an agent each | Any factory (24) |
| One main session judges | A read-only fork per thread | 200 leads would wait for each other |
| A person is not a concept | A person has addresses on each connector | Already built, and right |
| A mandate is checked again only when ended work would resume | Also when the policy changes, and only ever to narrow or end it | Open work should not go on under a rule that is gone |
| The mandate is of a ticket | Manager, work and agent, each a part of the one above | The tree (10, 12) |
| An agent and an operator install it, from a file | The co-worker sets up managers with you, on the screen, for an objective | 25, and it reads the business first |

## After it is there

Everything found starts on **watch**; everything asked for, on. Weekly: kinds you never correct, it proposes to widen. Two corrections
in a row and the kind goes back to ask, by itself. A search that finds nothing new is slowed or dropped. Something left alone that a
person then did by hand is a miss, and a case.

## The pages of a manager

| Page | Answers |
|---|---|
| Overview | Is the objective on its line, what brings it, where is it lost, does anything need me? |
| **Intake** | What came in, what became of each, and why. Where it comes from: the feeds |
| Board | Where is the work? Each card says its mandate |
| **Playbook** | How does it work: the page itself, workflow, triggers, agents, skills, evals. And its rules: the objective, mandate, who may ask, kinds of work, never. Versions, comments |
| Connectors | What does it look like from inside? |
| Threads, Settings | As drawn |

Routines stop being a page of a manager: its searches and waits are feeds, under Intake. The co-worker keeps its own (a morning
summary is not something that comes in).
