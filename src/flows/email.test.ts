import { describe, expect, it } from "vitest";
import { fakeFiles } from "~/modules/email/testing.ts";
import { outbox } from "~/modules/mail/testing.ts";
import { eventually } from "../../test/flows.ts";
import { addressOf, allow, events, mail } from "../../test/email.ts";
import { board, chatLog, runOf, say, team } from "../../test/team.ts";

const ask = (
  id: string,
  extra: {
    readonly from?: string;
    readonly subject?: string;
    readonly headers?: Readonly<Record<string, string>>;
    readonly dkim?: boolean;
  } = {},
) => ({
  from: extra.from ?? "ama@acme.test",
  to: "",
  subject: extra.subject ?? "Export docs for v2.3",
  text: "Can the docs say what the row limit is?",
  messageId: `<${id}@acme.test>`,
  ...(extra.headers === undefined ? {} : { headers: extra.headers }),
  ...(extra.dkim === undefined ? {} : { dkim: extra.dkim }),
});

describe("email", () => {
  it("flw:email/new-request", async () => {
    const launch = await team("mailnew");
    await allow(launch, "ama@acme.test");
    const delivered = await mail(addressOf(launch), { ...ask("new-1"), to: addressOf(launch) });
    expect(delivered.rejected).toBeUndefined();
    const tasks = await eventually(
      async () => (await board(launch)).tasks,
      (found) => found.length === 1,
    );
    expect(tasks[0]?.title).toBe("Export docs for v2.3");
    expect((await events(launch)).map(({ line }) => line)).toContain(
      "email from ama@acme.test: “Export docs for v2.3” → explicit candidate",
    );
    expect((await chatLog(launch)).some(({ text }) => text.startsWith("Candidate (explicit), email from ama@acme.test."))).toBe(true);
  });

  it("flw:email/reply-follows", async () => {
    const launch = await team("mailfollow");
    await allow(launch, "ama@acme.test");
    await mail(addressOf(launch), { ...ask("follow-1"), to: addressOf(launch) });
    await eventually(
      async () => (await board(launch)).tasks,
      (found) => found.length === 1,
    );
    // Someone not on the list: a reply to the Task's address passes no Gate.
    const reply = { ...ask("follow-2", { from: "bo@else.test", subject: "Re: Export docs for v2.3" }), to: addressOf(launch, "DT-1") };
    await mail(addressOf(launch, "DT-1"), reply);
    await eventually(chatLog.bind(undefined, launch), (lines) =>
      lines.some(({ text }) => text.startsWith("Follow-up on DT-1, email from bo@else.test.")),
    );
    expect((await events(launch)).map(({ line }) => line)).toContain(
      "email from bo@else.test: “Re: Export docs for v2.3” → follow-up on DT-1",
    );
    expect((await board(launch)).tasks).toHaveLength(1);
  });

  it("flw:email/threading", async () => {
    const launch = await team("mailthread");
    await allow(launch, "ama@acme.test");
    await mail(addressOf(launch), { ...ask("thread-1", { headers: { References: "<root@acme.test>" } }), to: addressOf(launch) });
    const sent = await eventually(
      async () => outbox.lastTo("ama@acme.test"),
      (found) => found?.from === launch.manager.address,
    );
    expect(sent?.subject).toBe("Re: Export docs for v2.3");
    expect(sent?.headers?.["In-Reply-To"]).toBe("<thread-1@acme.test>");
    expect(sent?.headers?.["References"]).toBe("<root@acme.test> <thread-1@acme.test>");
    expect(sent?.replyTo).toBe(addressOf(launch, "DT-1"));
    expect(sent?.text).toContain("This is DT-1");
  });

  it("flw:email/dedupe", async () => {
    const launch = await team("maildedupe");
    await allow(launch, "ama@acme.test");
    const message = { ...ask("dedupe-1"), to: addressOf(launch) };
    await mail(addressOf(launch), message);
    await mail(addressOf(launch), message);
    await eventually(
      async () => (await board(launch)).tasks,
      (found) => found.length === 1,
    );
    expect((await events(launch)).filter(({ line }) => line.includes("Export docs"))).toHaveLength(1);
    expect((await board(launch)).tasks).toHaveLength(1);
  });

  it("flw:email/auto-reply", async () => {
    const launch = await team("mailauto");
    await allow(launch, "ama@acme.test");
    const away = { ...ask("auto-1", { subject: "Out of office", headers: { "Auto-Submitted": "auto-replied" } }), to: addressOf(launch) };
    const bounce = {
      ...ask("auto-2", {
        from: "mailer-daemon@acme.test",
        subject: "Undelivered Mail Returned to Sender",
        headers: { "Content-Type": "multipart/report; report-type=delivery-status; boundary=x" },
      }),
      text: "--x\r\nContent-Type: text/plain\r\n\r\nIt bounced.\r\n--x--",
      to: addressOf(launch),
    };
    expect((await mail(addressOf(launch), away)).rejected).toBeUndefined();
    await mail(addressOf(launch), bounce);
    const lines = (await events(launch)).map(({ line }) => line);
    expect(lines).toContain("email from ama@acme.test: “Out of office” → dropped: an automatic reply or a bounce");
    expect(lines.filter((line) => line.endsWith("dropped: an automatic reply or a bounce"))).toHaveLength(2);
    expect((await board(launch)).tasks).toHaveLength(0);
    expect((await chatLog(launch)).some(({ text }) => text.startsWith("Candidate"))).toBe(false);
  });

  it("flw:email/no-loop", async () => {
    const launch = await team("mailloop");
    await allow(launch, launch.manager.address);
    await mail(addressOf(launch), {
      ...ask("loop-1", { from: launch.manager.address, subject: "Re: Export docs" }),
      to: addressOf(launch),
    });
    expect((await events(launch)).map(({ line }) => line)).toContain(
      `email from ${launch.manager.address}: “Re: Export docs” → dropped: our own mail came back`,
    );
    expect((await chatLog(launch)).some(({ text }) => text.startsWith("Candidate"))).toBe(false);
  });

  it("drops the app's own mail, and takes a person on the mail domain to the Gate like anybody else", async () => {
    const launch = await team("mailsame");
    await allow(launch, "hello@co-worker.tech", "person@co-worker.tech");
    const from = (sender: string, id: string) =>
      mail(addressOf(launch), { ...ask(id, { from: sender, subject: `Mail ${id}` }), to: addressOf(launch) });
    await from("hello@co-worker.tech", "same-1");
    await from("person@co-worker.tech", "same-2");
    await from("stranger@co-worker.tech", "same-3");
    const lines = (await events(launch)).map(({ line }) => line);
    expect(lines).toContain("email from hello@co-worker.tech: “Mail same-1” → dropped: our own mail came back");
    expect(lines).toContain("email from person@co-worker.tech: “Mail same-2” → explicit candidate");
    expect(lines.find((line) => line.includes("“Mail same-3”"))).toContain("ignored");
    const tasks = await eventually(
      async () => (await board(launch)).tasks,
      (found) => found.length === 1,
    );
    expect(tasks.map(({ title }) => title)).toEqual(["Mail same-2"]);
    // Nothing that only looks like a person: a manager of any workspace is dropped too.
    await from("support.elsewhere@co-worker.tech", "same-4");
    expect((await events(launch)).map(({ line }) => line)).toContain(
      "email from support.elsewhere@co-worker.tech: “Mail same-4” → dropped: our own mail came back",
    );
  });

  it("flw:email/dkim", async () => {
    const launch = await team("maildkim");
    await allow(launch, "ama@acme.test");
    await mail(addressOf(launch), { ...ask("dkim-1", { dkim: false }), to: addressOf(launch) });
    // A passing result from a receiver nobody trusts counts for nothing.
    const forged = {
      ...ask("dkim-2", { dkim: false, headers: { "Authentication-Results": "evil.example; dkim=pass header.d=acme.test" } }),
      to: addressOf(launch),
    };
    await mail(addressOf(launch), forged);
    const lines = (await events(launch)).map(({ line }) => line);
    expect(lines.filter((line) => line.endsWith("ignored: The sender could not be verified"))).toHaveLength(2);
    expect((await board(launch)).tasks).toHaveLength(0);
  });

  it("flw:email/unknown-address", async () => {
    const launch = await team("mailunknown");
    const nobody = launch.manager.address.replace(/^[^.@]+/u, "nobody");
    expect((await mail(nobody, { ...ask("unknown-1"), to: nobody })).rejected).toBe("There is no such address here");
    expect((await mail("launch@nowhere.example.test", { ...ask("unknown-2"), to: "launch@nowhere.example.test" })).rejected).toBe(
      "There is no such address here",
    );
  });

  it("flw:email/too-big", async () => {
    const launch = await team("mailbig");
    await allow(launch, "ama@acme.test");
    const delivered = await mail(addressOf(launch), { ...ask("big-1"), to: addressOf(launch) }, 30 * 1_048_576);
    expect(delivered.rejected).toBe("The message is over 25 MB. Send a link to large files instead.");
    expect((await board(launch)).tasks).toHaveLength(0);
  });

  it("flw:email/attachment", async () => {
    const launch = await team("mailfiles");
    await allow(launch, "ama@acme.test");
    const body = [
      "--b1",
      "Content-Type: text/plain; charset=utf-8",
      "",
      "The numbers are attached.",
      "--b1",
      'Content-Type: text/plain; name="limits.txt"',
      'Content-Disposition: attachment; filename="limits.txt"',
      "",
      "Exports over 150k rows time out.",
      "--b1--",
    ].join("\r\n");
    const message = {
      ...ask("files-1", { headers: { "Content-Type": 'multipart/mixed; boundary="b1"' } }),
      text: body,
      to: addressOf(launch),
    };
    await mail(addressOf(launch), message);
    await eventually(
      async () => (await board(launch)).tasks,
      (found) => found.length === 1,
    );
    const stored = fakeFiles.keys().filter((key) => key.startsWith(`email/${launch.manager.managerId}/`));
    expect(stored).toHaveLength(1);
    expect(new TextDecoder().decode(await fakeFiles.get(stored[0] ?? ""))).toBe("Exports over 150k rows time out.");
    await say(launch, "start a reader on DT-1", "files-run");
    const run = await eventually(
      () => runOf(launch, "run-1").catch(() => undefined),
      (found) => found?.run?.report === "ready",
    );
    expect(run?.run.note).toBe("Read the file: Exports over 150k rows time out.");
  });

  it("shows on the mail's event what the manager decided: the task it made", async () => {
    const launch = await team("maildecided");
    await allow(launch, "ama@acme.test");
    await mail(addressOf(launch), { ...ask("decided-1"), to: addressOf(launch) });
    const heard = await eventually(
      async () => (await events(launch)) as readonly { readonly decision?: object }[],
      (found) => found[0]?.decision !== undefined,
    );
    expect(heard[0]?.decision).toEqual(expect.objectContaining({ kind: "accept", task: "DT-1" }));
  });
});
