# mail

Owns sending email: one `Mailer` interface, the real one on Cloudflare Email Service's `send_email` binding, and a
fake in `testing.ts` that keeps what it was asked to send (`outbox` is the fake world's).

Invariants

- A failed send is a `Failed` value with the reason, never a throw.

Test: `pnpm vitest --run src/modules/mail`
