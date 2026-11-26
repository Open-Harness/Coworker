import { describe, expect, it } from "vitest";
import { crash, DAY, flow, pass, until, type Flow, type Person } from "./kit.ts";
import { asks, opened, pulled, ready, waiting } from "./ready.ts";
import type { Rule } from "../world/models.ts";

/** Juno: one to talk to, that does what the buttons do, for whoever asks, and no more. */
async function juno(f: Flow, rules: readonly Rule[]): Promise<void> {
  await f.ama.done("models.default", { connection: f.connection, model: f.models.juno, thinking: "low" });
  await f.script(f.models.juno, rules);
}
const say = async (person: Person, text: string, chat?: string): Promise<string> =>
  chat === undefined
    ? (await person.write("/chats", { text, key: crypto.randomUUID() })).chat
    : (await person.write("/chats/:chat", { text, key: crypto.randomUUID() }, { chat })) && chat;
const answered = (person: Person, chat: string, has: RegExp) =>
  until(null, () => person.see("/chats/:chat", { chat }), ({ lines }) => lines.some((line) => line.by === "coworker" && has.test(line.text)), `it says ${has.source}`);

/** The co-worker may pause only with a yes (`manager.pause` is `ask` in the registry): it says so, and it is done once Ama says yes. */
async function pausedByJuno(f: Flow, manager: string): Promise<string> {
  await juno(f, [
    { tool: "act", start: true, do: { call: "act", args: { doing: "manager.pause", values: { manager } } } },
    { after: "act", do: { say: "Paused." } },
  ]);
  const chat = await say(f.ama, "Pause Coding");
  const { lines } = await answered(f.ama, chat, /Paused/u);
  expect(lines.at(-1)?.did[0]).toMatchObject({ doing: "manager.pause", state: "waits for you" });
  expect((await f.ama.see("/shell")).tree[0]?.is).not.toBe("paused");
  const [ask] = await until(null, () => waiting(f.ama), (all) => all.length === 1, "Ama is asked");
  await f.ama.write("/inbox/:ask", { answer: ask?.options[0]?.id ?? "" }, { ask: ask?.id ?? "" });
  await until(null, () => f.ama.see("/shell"), ({ tree }) => tree[0]?.is === "paused", "it is paused");
  return chat;
}

describe("a chat", () => {
  it("flow:juno/answers-and-the-chat-is-in-the-list", async () => {
    const f = await flow();
    await juno(f, [{ start: true, do: { say: "Good morning, Ama." } }]);
    const chat = await say(f.ama, "Hello");
    const { lines } = await answered(f.ama, chat, /Good morning/u);
    expect(lines[0]).toMatchObject({ by: { person: expect.any(String) }, text: "Hello" });
    expect((await f.ama.see("/chats")).chats.map(({ id }) => id)).toEqual([chat]);
  });
  it("flow:juno/answers-about-work-from-the-records-with-links", async () => {
    const f = await flow();
    const { work } = await opened(f);
    await juno(f, [
      { tool: "look", start: true, do: { call: "look", args: { at: "work", id: work } } },
      { after: "look", sees: "add\\.sh subtracts", do: { say: "It waits for your review." } },
    ]);
    const chat = await say(f.ama, "How is the add bug?");
    const { lines } = await answered(f.ama, chat, /waits for your review/u);
    expect(lines.at(-1)?.from.some(({ link }) => link.includes(work))).toBe(true);
  });
  it("flow:juno/knows-the-page-you-are-on", async () => {
    const f = await flow();
    await juno(f, [{ start: true, do: { say: "Yes." } }]);
    const { chat } = await f.ama.write("/chats", { text: "What is this?", key: "k", place: "/m/coding/board" });
    await answered(f.ama, chat, /Yes/u);
    expect((await f.seen(f.models.juno))[0]?.told).toContain("/m/coding/board");
  });
  it("flow:juno/a-fork-knows-everything-up-to-the-line-and-nothing-after", async () => {
    const f = await flow();
    await juno(f, [{ sees: "First thing", start: true, do: { say: "One." } }, { sees: "Second thing", start: true, do: { say: "Two." } }, { sees: "Third thing", start: true, do: { say: "Three." } }]);
    const chat = await say(f.ama, "First thing");
    const { lines } = await answered(f.ama, chat, /One/u);
    await say(f.ama, "Second thing", chat);
    await answered(f.ama, chat, /Two/u);
    const fork = (await f.ama.write("/chats/:chat/fork", { line: lines.at(-1)?.id ?? "" }, { chat })).chat;
    await say(f.ama, "Third thing", fork);
    await answered(f.ama, fork, /Three/u);
    const told = (await f.seen(f.models.juno)).at(-1)?.told ?? "";
    expect(told).toContain("First thing");
    expect(told).not.toContain("Second thing");
    expect((await f.ama.see("/chats/:chat", { chat: fork })).chat).toMatchObject({ under: chat, knew: expect.any(Number) });
  });
  it("flow:juno/a-crash-in-the-middle-answers-once", async () => {
    const f = await flow();
    await juno(f, [{ times: "always", start: true, do: { say: "Here I am." } }]);
    const chat = await say(f.ama, "Are you there?");
    await crash();
    await answered(f.ama, chat, /Here I am/u);
    const { lines } = await f.ama.see("/chats/:chat", { chat });
    expect(lines.filter((line) => line.by === "coworker")).toHaveLength(1);
  });
  it("flow:juno/a-chat-of-one-person-is-not-another's", async () => {
    const f = await flow();
    await juno(f, [{ start: true, times: "always", do: { say: "Hello." } }]);
    const chidi = await f.joins("Chidi", "Member");
    const chat = await say(f.ama, "A private thing");
    expect((await chidi.ask("/chats/:chat", { chat })).status).toBe(404);
    expect((await chidi.see("/chats")).chats).toEqual([]);
  });
});

describe("doing", () => {
  it("flow:juno/does-what-the-button-does-by-the-same-doing", async () => {
    const f = await flow();
    const { manager } = await opened(f);
    await pausedByJuno(f, manager);
    const { lines: log } = await f.ama.see("/settings/audit-log?by&outcome&before");
    expect(log[0]).toMatchObject({ coworker: true, outcome: "done", permission: "ask", approvedBy: "Ama" });
  });
  it("flow:juno/cannot-do-what-the-person-asking-may-not", async () => {
    const f = await flow();
    const { manager } = await opened(f);
    await juno(f, [{ tool: "act", start: true, do: { call: "act", args: { doing: "manager.pause", values: { manager } } } }, { after: "act", do: { say: "I may not." } }]);
    const chidi = await f.joins("Chidi", "Member");
    const chat = await say(chidi, "Pause Coding");
    const { lines } = await answered(chidi, chat, /may not/u);
    expect(lines.at(-1)?.did[0]?.state).toBe("refused");
    expect((await f.ama.see("/shell")).tree[0]?.is).not.toBe("paused");
  });
  it("flow:juno/stops-before-what-a-person-decides-and-goes-on-after-a-yes", async () => {
    const f = await flow();
    const { manager } = await opened(f);
    const { files, version } = await f.ama.see("/m/:manager/playbook?version", { manager });
    const values = { manager, version: String(version), files: JSON.stringify({ ...files, "SKILL.md": `${files["SKILL.md"]}\nPlease.\n` }) };
    await juno(f, [{ tool: "act", start: true, do: { call: "act", args: { doing: "version.save", values } } }, { after: "act", do: { say: "It waits for you." } }]);
    const chat = await say(f.ama, "Make it polite");
    const { lines } = await answered(f.ama, chat, /waits for you/u);
    expect(lines.at(-1)?.did[0]?.state).toBe("waits for you");
    expect((await f.ama.see("/m/:manager/playbook?version", { manager })).version).toBe(1);
    const [ask] = await waiting(f.ama);
    await f.ama.write("/inbox/:ask", { answer: ask?.options[0]?.id ?? "" }, { ask: ask?.id ?? "" });
    await until(null, () => f.ama.see("/m/:manager/playbook?version", { manager }), (view) => view.version === 2, "version 2");
  });
  it("flow:juno/a-connector's-action-is-never-offered-to-it", async () => {
    const f = await flow();
    await ready(f);
    await juno(f, [{ start: true, do: { say: "Hello." } }]);
    await answered(f.ama, await say(f.ama, "Hello"), /Hello/u);
    const [{ tools = [] } = {}] = await f.seen(f.models.juno);
    expect(tools).toEqual(expect.arrayContaining(["find", "look", "act", "show_me", "note"]));
    for (const tool of tools) expect(tool).not.toMatch(/^(?:github|email|bash|write|edit)/u);
  });
  it("flow:juno/shows-you-step-by-step-and-the-last-one-is-yours", async () => {
    const f = await flow();
    const { manager } = await ready(f);
    const { steps } = await f.ama.write("/walk", { doing: "manager.settings", values: { manager, name: "Code" } });
    expect(steps[0]).toMatchObject({ does: "go" });
    expect(steps.some(({ does, value }) => does === "fill" && value === "Code")).toBe(true);
    expect(steps.at(-1)).toMatchObject({ yours: true });
    expect((await f.ama.see("/shell")).tree[0]?.name).toBe("Coding");
  });
  it("flow:juno/work-asked-in-chat-is-work-like-any-other", async () => {
    const f = await flow();
    const { repo, manager } = await ready(f);
    const values = { manager, kind: "bug", title: "add.sh subtracts", about: "sh add.sh 1 2 answers -1" };
    await juno(f, [{ tool: "act", start: true, do: { call: "act", args: { doing: "work.add", values } } }, { after: "act", do: { say: "On it." } }]);
    await answered(f.ama, await say(f.ama, "Please fix add.sh"), /On it/u);
    expect(await pulled(repo)).toHaveLength(1);
    expect((await f.ama.see("/m/:manager/board", { manager })).cards[0]?.from).toMatch(/chat/iu);
  });
});

describe("what it knows", () => {
  it("flow:juno/a-note-says-who-and-where-is-used-and-can-be-forgotten", async () => {
    const f = await flow();
    await juno(f, [
      { tool: "note", start: true, do: { call: "note", args: { says: "Releases go out on Thursdays." } } },
      { after: "note", do: { say: "Noted." } },
      { sees: "Releases go out on Thursdays", start: true, do: { say: "On Thursday." } },
      { start: true, do: { say: "I do not know." } },
    ]);
    await answered(f.ama, await say(f.ama, "We release on Thursdays"), /Noted/u);
    const [note] = (await f.ama.see("/coworker")).memory;
    expect(note).toMatchObject({ says: "Releases go out on Thursdays.", by: expect.any(String) });
    await answered(f.ama, await say(f.ama, "When is the release?"), /On Thursday/u);
    await f.ama.done("note.forget", { note: note?.id ?? "" });
    expect((await f.ama.see("/coworker")).memory).toEqual([]);
    await answered(f.ama, await say(f.ama, "When is it, again?"), /do not know/u);
  });
  it("flow:juno/its-soul-is-what-it-is-told-first", async () => {
    const f = await flow();
    await f.ama.done("soul.save", { text: "Juno never uses exclamation marks." });
    await juno(f, [{ start: true, do: { say: "Hello." } }]);
    await answered(f.ama, await say(f.ama, "Hello"), /Hello/u);
    expect((await f.seen(f.models.juno))[0]?.told).toContain("never uses exclamation marks");
  });
  it("flow:juno/what-it-did-is-history-with-undo-where-there-is-one", async () => {
    const f = await flow();
    const { manager } = await opened(f);
    await pausedByJuno(f, manager);
    expect((await f.ama.see("/coworker")).history[0]).toMatchObject({ says: expect.stringMatching(/pause/iu), undo: "can" });
  });
  it("flow:juno/each-morning-it-lists-what-waits-for-a-person", async () => {
    const f = await flow();
    const { repo } = await ready(f);
    await f.script(f.models.doer, [{ tool: "ask", start: true, do: { call: "ask", args: { question: "Which one?" } } }]);
    await asks(f, repo);
    await until(repo, () => waiting(f.ama), (all) => all.length === 1, "Ama is asked");
    await pass(f.ama, DAY);
    const { items } = await until(null, () => f.ama.see("/inbox"), (view) => view.items.some(({ standing }) => standing === "know"), "the morning list");
    expect(items.filter(({ standing }) => standing === "know")).toHaveLength(1);
  });
});
