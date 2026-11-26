# team-start

Setting up a workspace: the steps from an account to a manager that works.

**Owns**

- `CreateWorkspacePage`: a name, an address, the region and who from work may join; or asking to join a workspace that
  is there already. Someone in no workspace sees it at `/ws`, anyone at `/start`.
- `StartPage`: the steps after it, each at its own address (`teamLinks.step`): models, the manager's kind, its mission,
  where it listens, and invites. `only` is one step opened from Getting started: it has no row of steps, and ends back
  in the workspace.
- `GitHubInstalledPage`: where GitHub sends an Owner back after installing the App.
- `GettingStarted`: what is left, in an Owner's sidebar until all of it is done. It is read from the workspace, so
  something done in Settings counts too.

**Invariants**

- Only making the workspace, the manager and its mission are required. Everything else can be skipped, and nothing
  skipped is lost: it is in Getting started.
- Nothing is remembered about the steps. The address says where a person is; the server says what is done.
- A GitHub installation is connected by a person's click, never by opening a link.
- Keys, invites, links and GitHub go through the settings' own API (`team-settings`).

**Testing**: `team-start.test.tsx` renders the pages against a server in memory. `ui:onboarding/first`
(`e2e/onboarding.spec.ts`) goes through all of it in a browser against the real server.
