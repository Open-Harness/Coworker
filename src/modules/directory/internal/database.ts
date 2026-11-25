import { drizzle, type DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import { migrations } from "./migrations.ts";

export async function openDatabase(storage: DurableObjectStorage): Promise<DrizzleSqliteDODatabase> {
  const db = drizzle(storage);
  await migrate(db, migrations);
  return db;
}
