import { describe, expect, it } from "vitest";
import { triggers } from "./service.ts";
import type { Actor, Policy, Trigger } from "./types.ts";

const ama: Actor = { kind: "email", id: "ama@acme.test", human: true, verified: true };
const of = (actor: Actor, extra: Partial<Trigger> = {}): Trigger => ({
  id: "email:<1@acme.test>",
  source: "email",
  managerId: "m1",
  scope: "mailbox",
  threads: [{ kind: "email", key: "<1@acme.test>" }],
  actor,
  addressed: "direct",
  at: 0,
  title: "Export docs",
  text: "Please",
  attachments: [],
  replyTo: { kind: "email", to: actor.id, subject: "Export docs", messageId: "<1@acme.test>", references: [] },
  ...extra,
});
const policy = (extra: Partial<Policy> = {}): Policy => ({
  ...triggers.defaultPolicy,
  allowed: [{ kind: "handle", handle: { kind: "email", id: "AMA@acme.test" } }],
  ...extra,
});

describe("the Gate", () => {
  it("makes an allowed person who addressed the manager explicit", () => {
    expect(triggers.gate(of(ama), policy())).toEqual({ _tag: "Candidate", strength: "explicit" });
    expect(triggers.gate(of({ ...ama, id: "bo@acme.test" }), policy({ allowed: [{ kind: "domain", domain: "acme.test" }] }))._tag).toBe(
      "Candidate",
    );
  });

  it("treats a sender the platform does not vouch for as unknown", () => {
    expect(triggers.gate(of({ ...ama, verified: false }), policy())).toEqual({
      _tag: "Ignored",
      reason: "The sender could not be verified",
    });
  });

  it("follows the admission table for strangers, ignoring them by default", () => {
    const stranger = of({ ...ama, id: "eve@else.test" });
    expect(triggers.gate(stranger, policy())._tag).toBe("Ignored");
    expect(triggers.gate(stranger, policy({ admission: { mailbox: "explicit" } }))).toEqual({ _tag: "Candidate", strength: "explicit" });
    expect(triggers.gate(stranger, policy({ admission: { mailbox: "inferred" }, acceptMode: "off" }))._tag).toBe("Ignored");
  });

  it("lets bots in only from the bot list, and only as inferred", () => {
    const bot: Actor = { kind: "github", id: "41898282", human: false, verified: true };
    expect(triggers.gate(of(bot), policy())._tag).toBe("Ignored");
    expect(triggers.gate(of(bot), policy({ bots: [{ kind: "github", id: "41898282" }] }))).toEqual({
      _tag: "Candidate",
      strength: "inferred",
    });
  });

  it("narrows a sent policy and drops what is malformed", () => {
    const narrowed = triggers.policyOf({
      acceptMode: "auto",
      allowed: [{ kind: "domain", domain: "Acme.test" }, { kind: "handle" }, 3],
      admission: { mailbox: "nope" },
    });
    expect(narrowed).toEqual({ acceptMode: "auto", allowed: [{ kind: "domain", domain: "acme.test" }], admission: {}, bots: [] });
  });
});
