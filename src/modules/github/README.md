# github

GitHub as a Source: one GitHub App, one installation per workspace. Webhooks become Triggers, replies go back as
comments, and a sandbox gets a token for one repo.

**Owns**

- Inbound (`github.source(…).webhook`, mounted at `POST /in/github`): the `X-Hub-Signature-256` is checked with
  GitHub's own `@octokit/webhooks-methods` before the body is read; a bad or missing one is 401. The installation
  names the workspace (the `github_installation` table in D1). Every manager that hears the repo gets the event
  if it chose that event for that repo; otherwise a line in its Events says why not. The App's own comments
  (`<slug>[bot]`) are dropped the same way, so a reply never loops.
- What a Trigger is made of: its id is the `X-GitHub-Delivery` plus the manager, its Thread `acme/api#12`, its
  sender GitHub's numeric user id (verified, since the webhook was signed), and its scope `repo:acme/api:<event>`
  for the admission table. A pull request also names the issues it closes (`Fixes #12`) and the Task its branch
  or title names (`dt-14-…`, `DT-14`), so it follows that Task. A failed check run reaches the pull requests it ran on.
- Mentions: `@<app slug>` or `@<manager slug>` in the title or body addresses the manager.
- Outbound (`github.channel`): a comment on the issue or pull request, with an installation token made for it.
- Installing (`GitHubApi.installUrl`): GitHub's own install page for the App, which sends the Owner back to the App's
  callback address, `/github/installed`, with the installation, the `state` it was opened with and a sign-in `code`
  (the App has "Request user authorization during installation" on). There is none without the App's slug and its
  sign-in client (`GITHUB_APP_SLUG`, `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`).
- Claiming (`GitHubApi.claim`): the code buys a token for that person, used once and kept nowhere, and they must
  administer every repo the installation reaches. Its id proves nothing.
- Tokens (`github.repoToken`): one repo, at most an hour, and read-only for a pull request from a fork. The App's
  private key never leaves `internal/api.ts`.
- `startingEvents(template)`: what a repo given to a manager hears until someone changes it.

**Invariants**

- Nothing is read from an unsigned body.
- No workspace connects an installation unless GitHub says the person administers all its repos.
- The same delivery twice is one Trigger (the Workspace stores Triggers by id).
- No token for code from a fork can write to the base repo.

**Testing**: `github.test.ts` drives the Source with a fake Hub and the real App adapter against a scripted GitHub.
The flows in `src/flows/github.test.ts` post GitHub's own example payloads (`@octokit/webhooks-examples`), signed,
to the Worker, with the in-memory GitHub of `testing.ts`.
