import journal from "./migrations/meta/_journal.json";
// `?raw`: celld refuses text module rules, so Vite inlines the SQL instead. Add each generated file here.
import m0000 from "./migrations/0000_init.sql?raw";
import m0001 from "./migrations/0001_agents.sql?raw";

export const migrations = { journal, migrations: { m0000, m0001 } };
