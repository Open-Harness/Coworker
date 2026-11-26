# team-join

How a person gets in to the hosted app: signing in, and joining a workspace.

**Owns**

- `Session`: who is signed in at this browser, and the sign-in page for anyone who is not. `useMe` and `useLeave` give
  the screens under it the person, and a way out.
- `InvitePage`: an emailed invite, opened. Signed out it asks for the invited address; signed in with another one it
  says so; an invite that is used, expired or taken back says which, and what to do.
- `LinkPage`: a shared invite link, opened.
- `AccountsPage` (inside both): the other accounts a person writes from, straight after joining.
- `EmailProofPage`: the mailed link that proves another address.
- `Door`, `AskButton`: the one-card page all of these are drawn on, and asking the Owners to be let in.

**Invariants**

- Pages under `/join/` work for someone who is not signed in. The server decides every join; the pages only say what
  it answered.
- A sign-in link comes back to the page that asked for it. A provider's button shows only when the deployment has a
  client for it (`GET /api/sign-in`).

**Testing**: `team-join.test.tsx` renders the pages with an API in memory. `ui:join/invite` (`e2e/join.spec.ts`) does it
in a browser against the real server.
