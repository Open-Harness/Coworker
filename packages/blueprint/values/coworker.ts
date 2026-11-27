import { Blueprint, Schema } from "orthograph";

// The words of docs/design.md, as values. One word for one thing, on screen, in code and here.

/** A short name a person reads: a workspace, a manager, a piece of work, a chat. */
export const Title = Blueprint.value(Blueprint.text({ max: 200 }));
/** A name for one thing among a few: `Coding`, `Bo Larsen`. */
export const Name = Blueprint.value(Blueprint.text({ max: 80 }));
/** What a workspace or a manager is called in an address: `acme`, `coding`. */
export const Address = Blueprint.value(Blueprint.text({ max: 40 }));
/** Words a person or the co-worker wrote: why, what it says, a question, a line of a chat. */
export const Words = Blueprint.value(Blueprint.text({ max: 8000 }));
/** A mail address, proven before it counts (spec P4). */
export const Mail = Blueprint.value(Blueprint.email());
/** Money in US cents. A price that is not known says so; it is never zero (spec M4). */
export const Cents = Blueprint.value(Blueprint.uint(64));
/** A playbook's version number. Going back is a new one (spec B4). */
export const VersionNumber = Blueprint.value(Blueprint.uint(32));
/** Milliseconds since 1970. */
export const At = Blueprint.value(Blueprint.uint(64));
/** The key of a press or a tool call: the same key twice is the first press again. */
export const Key = Blueprint.value(Blueprint.text({ max: 200 }));

/** Who a person is in a workspace (spec P5). */
export const Role = Blueprint.value(Schema.Literals(["Owner", "Builder", "Member"]));
/** The people of a workspace and their roles, by person id. Kept on the workspace so a role is decided without a lookup. */
export const People = Blueprint.value(Schema.Record(Schema.String, Schema.Literals(["Owner", "Builder", "Member"])));
/** What the co-worker, an action or an MCP tool may do: alone, with a yes, or not at all (spec C10, X3, X13). */
export const Permission = Blueprint.value(Schema.Literals(["on", "ask", "off"]));
/** Where a workspace's storage is. */
export const Region = Blueprint.value(Schema.Literals(["eu", "us"]));

/** A connector, ours, in code (spec X1). */
export const ConnectorId = Blueprint.value(Schema.Literals(["github", "email", "slack", "whatsapp", "crm", "calendar"]));
/** One conversation in a connector: an issue, a mail chain, a Slack thread, a WhatsApp chat, a deal. */
export const ThreadRef = Blueprint.value(
  Schema.Struct({ connector: Schema.String, account: Schema.String, place: Schema.String, id: Schema.String }),
);
/** A playbook's files, by path: SKILL.md, objective, workflow, triggers, agents, skills, reach, evals, because (spec B1). */
export const Files = Blueprint.value(Schema.Record(Schema.String, Schema.String));
/** One part of a playbook, as the screens name it. */
export const Part = Blueprint.value(
  Schema.Literals(["playbook", "objective", "workflow", "triggers", "agents", "skills", "reach", "evals"]),
);
/** A path and a line in a playbook's files: what a comment is on. */
export const Line = Blueprint.value(Blueprint.text({ max: 300 }));
/** A step of a kind of work: the board's column. Steps are the playbook's data, not a machine (inventory, question 1). */
export const Step = Blueprint.value(Blueprint.text({ max: 60 }));
/** A kind of work, by its id in the playbook. */
export const Kind = Blueprint.value(Blueprint.text({ max: 60 }));
/** What makes something come in (spec I1). */
export const TriggerBy = Blueprint.value(Schema.Literals(["cron", "event", "wait", "asked"]));
/** What work nobody asked for does, per kind (spec I6). */
export const Alone = Blueprint.value(Schema.Literals(["off", "watch", "ask", "do"]));
/** What an ask needs of its person (spec A1). */
export const Need = Blueprint.value(Schema.Literals(["decide", "approve", "do", "review", "know"]));
/** An answer that holds from now on, for a thread, a person or a kind (spec A6). */
export const Always = Blueprint.value(Schema.Literals(["thread", "person", "kind"]));
/** Who a piece of work waits for (`Next.who`). */
export const Who = Blueprint.value(Schema.Literals(["itself", "ci", "outside", "person", "manager"]));
/** How urgent a card is. */
export const Priority = Blueprint.value(Schema.Literals(["now", "soon", "later"]));
/** A done-when line: what must be true (spec W2). */
export const Checks = Blueprint.value(Schema.Array(Schema.String));
/** A thread's part: one that does, or a fresh one that checks and never saw the doing (spec W5). */
export const ThreadRole = Blueprint.value(Schema.Literals(["does", "checks"]));
/** How a thread said it ended (spec H4). */
export const Report = Blueprint.value(Schema.Literals(["done", "no", "stuck"]));
/** A layer of skills (docs/design.md, A playbook). */
export const Layer = Blueprint.value(Schema.Literals(["harness", "connector", "craft", "playbook"]));
/** A model to answer, with its thinking level, or the one above (spec M2). */
export const ModelChoice = Blueprint.value(
  Schema.Union([Schema.Struct({ connection: Schema.String, model: Schema.String, thinking: Schema.String }), Schema.Literal("inherit")]),
);
/** The fields of a press, by name: what the screens send with a doing. */
export const Values = Blueprint.value(Schema.Record(Schema.String, Schema.String));

/** A doing's id, as the registry names it: `work.add`, `soul.save`. */
export const DoingId = Blueprint.value(Blueprint.text({ max: 60 }));
/** What the co-worker may do alone, with a yes, or not at all, by doing id (spec C10). */
export const Mays = Blueprint.value(Schema.Record(Schema.String, Schema.Literals(["on", "ask", "off"])));
/** A whole split into parts, in cents, by manager id. The parts never add up to more than the whole (spec C11). */
export const Spending = Blueprint.value(Schema.Record(Schema.String, Schema.BigIntFromString));
/** How the co-worker talks: to whom, how, what it may say, and how it signs (the Talking page). */
export const Talking = Blueprint.value(Schema.Struct({ who: Schema.String, how: Schema.String, may: Schema.String, sign: Schema.String }));
/** When something runs on its own: a cron line, or a sentence the co-worker turns into one. */
export const When = Blueprint.value(Blueprint.text({ max: 120 }));
/** A web address: an MCP server, a link to a file. */
export const Url = Blueprint.value(Blueprint.text({ max: 2000 }));
/** A secret value: a key, a token, a password. Recorded nowhere, shown never (the vault holds it). */
export const SecretValue = Blueprint.value(Blueprint.visibility.secret(Blueprint.text({ max: 8000 })));
/** A person's word on what intake decided about an item: it was right, or it was wrong (spec I5). */
export const Should = Blueprint.value(Schema.Literals(["right", "wrong"]));
/** How an action call or an audit line ended (the audit log's outcome). */
export const Outcome = Blueprint.value(Schema.Literals(["done", "asked", "refused", "failed"]));
/** Who holds a conversation: the manager, or a person who took it (spec X6). */
export const Holder = Blueprint.value(Schema.Literals(["manager", "person"]));
/** A count: cases, runs, rows. */
export const Count = Blueprint.value(Blueprint.uint(32));
