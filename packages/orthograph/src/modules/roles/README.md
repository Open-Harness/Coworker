# roles

Owns `Blueprint.role`, `role.of(path)`, `anyone` and `signedIn`, and the `Principal` a call carries. The runtime
checks the allowed roles before the handler runs; a role-of loads the thing the payload field points at and runs the
rule on it. Test: `roles.test.ts`.
