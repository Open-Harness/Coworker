import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  driver: "durable-sqlite",
  schema: "./src/modules/directory/internal/schema.ts",
  out: "./src/modules/directory/internal/migrations",
});
