import { describe, expect, it } from "vitest";
import type { Playbook } from "~/modules/playbook/types.ts";
import { createWorking } from "./service.ts";
import { memoryStore } from "./testing.ts";
import type { TakeInput, WorkingDeps } from "./types.ts";

const check = { id: "ok", says: "It is so", by: "agent" } as const;
const playbook: Playbook = {
  name: "Coding",
  page: "A manager.",
  objective: {
    said: "Fix.",
    measure: {
      counts: "Fixes",
      unit: "a week",
      better: "more",
      read: { from: "person", person: "pat", asks: "How many?" },
      settles: "0d",
      before: { unknown: "none" },
    },
    aim: { value: 1, by: "2027-01-01" },
    notWorse: [],
    owner: "pat",
  },
  kinds: [
    {
      id: "bug",
      name: "Bug",
      when: "It is broken.",
      alone: "do",
      steps: [
        {
          id: "understand",
          name: "Understand",
          by: { agent: "doer" },
          does: "Read it.",
          skills: [],
          leaves: [{ id: "said", says: "It is said", by: "connector" }],
          checkedBy: { code: true },
          otherwise: { ask: "pat" },
        },
      ],
      doneWhen: [check],
      may: [],
      limits: {},
      look: "1d",
    },
  ],
  triggers: [],
  agents: [
    {
      id: "doer",
      name: "Doer",
      is: "Does",
      told: "Do it.",
      skills: [],
      tools: ["report"],
      model: { connection: "c1", model: "m1", thinking: "low" },
    },
  ],
  skills: [],
  skillFiles: {},
  reach: { grants: [], limits: {}, mayAsk: [], never: [] },
  evals: [],
  because: {},
};

const input = (id: string): TakeInput => ({
  item: {
    id,
    trigger: "event",
    by: "event",
    account: "github",
    place: "a/b",
    thread: "github:a/b#7",
    event: "issue",
    actor: { address: "github:1", name: "ama", bot: false },
    addressed: true,
    at: 1,
    title: "It breaks",
    text: "It breaks",
    same: id,
  },
  took: {
    _tag: "Took",
    item: id,
    gated: [],
    verdicts: [],
    why: "",
    manager: "m",
    kind: "bug",
    version: 1,
    waits: false,
    mandate: { grants: [], limits: {}, strength: "asked", because: { by: "person", id: "ama" }, version: 1, state: "holds" },
  },
  answers: "pat",
});

function deps(answer: Response) {
  const store = memoryStore();
  const later: Promise<unknown>[] = [];
  const working: WorkingDeps = {
    store,
    boxes: {
      run: async () => ({ _tag: "Unavailable", why: "No containers are free" }),
      read: async () => undefined,
      write: async () => undefined,
      put: async () => undefined,
      bundle: async () => ({ _tag: "Unavailable", why: "none" }),
      state: async () => ({ state: "none", seconds: 0, snapshot: null, bundle: null, lastUsed: 0 }),
      pause: async () => undefined,
      end: async () => undefined,
    },
    outside: {
      models: async () => ({
        connections: [
          {
            id: "c1",
            source: "endpoint",
            label: "C",
            baseUrl: "https://m.test/v1",
            models: ["m1"],
            check: { _tag: "Works", checkedAt: 1 },
          },
        ],
        choice: null,
      }),
      call: async () => answer,
      installation: async () => undefined,
      github: {
        installUrl: () => undefined,
        installation: async () => undefined,
        claim: async () => ({ _tag: "NotSignedIn" }),
        token: async () => ({ _tag: "Failed", reason: "none" }),
        comment: async () => ({ _tag: "Gone", reason: "none" }),
      },
      git: { push: async () => ({ _tag: "Refused", why: "no" }) },
      fetch: async () => new Response("", { status: 502 }),
      asks: async () => ({ op: "gone" }),
      mail: async () => ({ is: "refused", why: "no mailbox" }),
      mcp: async () => ({ is: "failed", why: "no servers" }),
    },
    clock: { now: () => 1_000 },
    playbook: () => playbook,
    manager: { id: "m", name: "Coding" },
    alarm: () => undefined,
    later: (running) => void later.push(running),
  };
  return { store, working, later };
}

describe("working", () => {
  it("takes an item as one piece of work, once, and follows the conversation it came from", async () => {
    const { working } = deps(new Response("", { status: 503 }));
    const taken = createWorking(working);
    const [one, again] = [await taken.take(input("i1")), await taken.take(input("i1"))];
    expect(again).toEqual(one);
    if ("_tag" in one) throw new Error(one.why);
    expect(taken.open()).toEqual([{ id: one.work, manager: "m", kind: "bug", title: "It breaks", follows: ["github:a/b#7"] }]);
  });

  it("does not take an item whose kind the playbook does not have, and says so", async () => {
    const { working } = deps(new Response("", { status: 503 }));
    const taken = createWorking(working);
    const asked = input("i3");
    const refused = await taken.take({ ...asked, took: { ...asked.took, kind: "nothing-like-it" } });
    expect(refused).toMatchObject({ _tag: "NoSuchKind" });
    expect(taken.open()).toEqual([]);
  });

  it("says why work waits when the model does not answer, and keeps what it was to do", async () => {
    const { working, store, later } = deps(new Response("overloaded", { status: 503 }));
    const taken = createWorking(working);
    const took = await taken.take(input("i2"));
    if ("_tag" in took) throw new Error(took.why);
    const { work } = took;
    await Promise.all(later);
    expect(store.hold(work)?.why).toMatch(/did not answer \(503\)/u);
    expect(store.nextJob(work)?.job.do).toBe("start");
  });
});
