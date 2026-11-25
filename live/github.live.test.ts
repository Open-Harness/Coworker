import { expect } from "vitest";
import { liveApp } from "~/modules/liveapp/service.ts";
import { isFailure } from "~/modules/outsiders/service.ts";
import { gitPerson, liveIt, setting, staging, until, within } from "./support.ts";

const MINUTE = 60_000;

liveIt(
  "live:github/round-trip",
  async () => {
    const { session, live } = await staging({ github: true });
    const person = gitPerson();
    const slug = setting("LIVE_APP_SLUG");
    const before = new Set((await liveApp.board(session, live)).tasks.map(({ id }) => id));
    const started = Date.now();
    const title = `DT live ${started}`;
    const issue = await person.openIssue(setting("LIVE_GITHUB_REPO"), title, `@${slug} please add a task: export the docs`);
    if (isFailure(issue)) throw new Error(issue.reason);
    try {
      // A task is on the board, and the manager comments back on the issue as the App (a Bot): both within 60 seconds.
      const [task, comment] = await Promise.all([
        until(
          async () => (await liveApp.board(session, live)).tasks.find((found) => !before.has(found.id) && found.title === title),
          within(started, MINUTE),
        ),
        until(
          async () => {
            const comments = await person.comments(issue);
            if (isFailure(comments)) throw new Error(comments.reason);
            return comments.find(({ authorType }) => authorType === "Bot");
          },
          within(started, MINUTE),
        ),
      ]);
      expect(task, "no task on the board within 60 seconds").toBeDefined();
      expect(comment, "no comment from the App within 60 seconds").toBeDefined();
      expect(comment?.author).toBe(`${slug}[bot]`);
      expect(comment?.body).toContain(task?.id ?? "no task");
    } finally {
      await person.close(issue);
    }
  },
  2 * MINUTE,
);
