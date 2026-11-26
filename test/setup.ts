import { applyD1Migrations, type D1Migration } from "cloudflare:test";
import { env } from "cloudflare:workers";

const { AUTH, TEST_MIGRATIONS } = env as unknown as { AUTH: D1Database; TEST_MIGRATIONS: D1Migration[] };

/** The control-plane schema, applied to each test file's own D1. Applying it twice changes nothing. */
await applyD1Migrations(AUTH, TEST_MIGRATIONS);
