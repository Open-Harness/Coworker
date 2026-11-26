# auth

Identity, sessions, organizations, members and invitations, on Better Auth over the control-plane D1 (`AUTH`).

**Owns:** the Better Auth tables (`user`, `session`, `account`, `verification`, `organization`, `member`,
`invitation`) and `migrations/control/0001_auth.sql`, which `node scripts/auth-schema.ts` regenerates from
`internal/options.ts`.

**Invariants**

- An organization is a workspace. Only the workspaces module creates or deletes one, through `createOrganization` and
  `deleteOrganization`; `handle` answers 404 to the plugin's own create and delete routes.
- Sign-in is an email link, Google or GitHub. Accounts with one verified email are one user with several accounts.
- Sign-in links and invites go through the injected `Mailer`.

**Testing:** `auth.test.ts` runs real Better Auth on the test D1. `testing.ts` answers Google's and GitHub's OAuth
endpoints as Miniflare's `outboundService`; `outsideCode(person)` is the OAuth code that signs in as that person.

- `onSignUp` runs after a user row is made (Better Auth `databaseHooks`), for domain auto-join. `addMember` wraps the plugin's server-side `addMember`.

**Workspace members and renaming.** `membersOf` lists an organization's people; `renameOrganization` is for the workspaces
module only, and Better Auth's own `/organization/update` is closed (the name and slug are the workspace's name and address).
