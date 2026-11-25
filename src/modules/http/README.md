# http

Owns the app's HTTP surface: `/api/directory/socket`, `/api/workspaces/<id>/socket`, `/api/me`, `/api/health`, pages.

Invariants

- Every socket has a person, which only this module sets; a client's own copy of the header is replaced.
- A socket opened by another site is refused.
- The objects' `/internal/` requests cannot be reached from outside: only the two socket routes are forwarded.

Test: `pnpm vitest --run src/modules/http`

**Settings routes** (`internal/settings*.ts`, `audit.ts`), all under `/api/workspaces/<id>/`: `general`, `logo`, `export`,
`templates`, `email`, `email/test`, `roles`, `permissions`, `access` (the role and own changes the shell asks), `me`, `me/profile`, `me/notifications`, `usage`, `budgets`,
`connections`, `secrets`, `models/<id>[/check]`, `environments/<id>[/test]`, `agents[/<id>]`, `skills[/<id>]`, `audit` (filters,
pages) and `audit/export`; and under a manager `tasks/<DT-n>` and `permissions`. Owners only unless a route says otherwise;
a deletion needs `{"confirm": <what>}` in its body; a route that is not for the method falls through to the older one.
