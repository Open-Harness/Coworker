import { env, exports } from "cloudflare:workers";
import { expect, it } from "vitest";
import config from "../wrangler.jsonc?raw";
import type { Env } from "./main.ts";

const bindings = env as unknown as Env;
const worker = (exports as unknown as { default: Record<string, unknown> }).default;

it("gate:bindings", async () => {
  expect(typeof bindings.AUTH.prepare).toBe("function");
  expect(typeof bindings.WORKSPACE.idFromName).toBe("function");
  expect(typeof bindings.MANAGER.idFromName).toBe("function");
  expect(typeof bindings.FILES.put).toBe("function");
  expect(typeof bindings.EMAIL.send).toBe("function");
  expect(typeof bindings.VAULT_MASTER_KEY.get).toBe("function");
  expect(typeof worker["email"]).toBe("function");
  expect(typeof worker["fetch"]).toBe("function");
  // Local and test runs never reach a real service.
  expect(config).not.toMatch(/"remote"\s*:\s*true/u);
  expect(bindings.DT_WORLD).toBe("fake");
});
