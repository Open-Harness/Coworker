import { expect } from "vitest";
import { liveApp } from "~/modules/liveapp/service.ts";
import { isFailure } from "~/modules/outsiders/service.ts";
import { liveIt, mailPerson, setting, staging, until, within } from "./support.ts";

const MINUTE = 60_000;

/** A person mails the manager, as themselves, from their own mailbox. */
async function mailTheManager(from: string) {
  const { live, session } = await staging();
  const person = mailPerson(from);
  const subject = `DT live ${Date.now()}`;
  const before = new Set((await liveApp.board(session, live)).tasks.map(({ id }) => id));
  const started = Date.now();
  const sent = await person.send({ to: live.manager.address, subject, text: "Please add a task: write the launch post" });
  if (isFailure(sent)) throw new Error(sent.reason);
  return { person, session, live, subject, sent, started, before };
}

const taskTitled = async (subject: string, before: ReadonlySet<string>) => {
  const { session, live } = await staging();
  return (await liveApp.board(session, live)).tasks.find(({ id, title }) => !before.has(id) && title === subject);
};

liveIt(
  "live:email/round-trip",
  async () => {
    const { person, subject, sent, started, before } = await mailTheManager(setting("LIVE_ALLOWED_MAILBOX"));
    // A task is on the board, and the manager's reply reaches the mailbox threaded onto the mail sent: both within 60 seconds.
    const [task, reply] = await Promise.all([
      until(() => taskTitled(subject, before), within(started, MINUTE)),
      until(
        async () => {
          const inbox = await person.inbox(subject);
          if (isFailure(inbox)) throw new Error(inbox.reason);
          return inbox.find(({ inReplyTo }) => inReplyTo === sent.messageId);
        },
        within(started, MINUTE),
      ),
    ]);
    expect(task, "no task on the board within 60 seconds").toBeDefined();
    expect(reply, "no threaded reply within 60 seconds").toBeDefined();
    expect(reply?.inReplyTo).toBe(sent.messageId);
    expect(reply?.subject).toMatch(/^Re: /u);
  },
  2 * MINUTE,
);

liveIt(
  "live:email/stranger",
  async () => {
    const { person, session, live, subject, sent, started, before } = await mailTheManager(setting("LIVE_STRANGER_MAILBOX"));
    const lines = async () => (await liveApp.events(session, live)).map(({ line }) => line).filter((line) => line.includes(`“${subject}”`));
    // The mail was taken in and ignored: exactly one new line in Events says so.
    const first = await until(async () => ((await lines()).length > 0 ? await lines() : undefined), within(started, MINUTE));
    expect(first, "no line in Events for the mail within 60 seconds").toBeDefined();
    await new Promise((resolve) => setTimeout(resolve, 10_000));
    const seen = await lines();
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain("ignored");
    // No task on the board, and no reply to the stranger.
    const after = (await liveApp.board(session, live)).tasks.filter(({ id }) => !before.has(id));
    expect(after).toEqual([]);
    const inbox = await person.inbox(subject);
    if (isFailure(inbox)) throw new Error(inbox.reason);
    expect(inbox.filter(({ inReplyTo }) => inReplyTo === sent.messageId)).toEqual([]);
  },
  2 * MINUTE,
);
