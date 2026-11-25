# admin

Owns the admin view: creating agents, editing and deploying them, and looking into sessions.

Read `types.ts` for the screens. They use the page's session from `app`; storing and checking happen in `directory`.

Invariants

- Hiding the view is a courtesy. The server refuses every agent command from anyone who is not an administrator.
- What is deployed is always a saved version: unsaved changes cannot be deployed.
- Another administrator's newer version is announced, never overwritten.
- YAML and form are the same config. YAML that does not check cannot be applied.
- Templates use only tools that exist.

Test: `pnpm vitest --run --project page src/modules/admin`
