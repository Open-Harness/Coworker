import type { By } from "~/modules/actions/types.ts";
import type { SettingsApi, SettingsPlace } from "../types.ts";
import { allAgents } from "./agents.ts";
import { viewOf } from "./general.ts";
import { secretNames } from "./keys.ts";
import { readLogo } from "./logo.ts";
import { allChanges } from "./roles.ts";
import { allSkills } from "./skills.ts";
import { said } from "./said.ts";
import { zip, type ZipEntry } from "./zip.ts";

/*
 * Everything the workspace holds, as a zip of JSON and files. No secret leaves it: the vault contributes names and
 * dates, model connections their label and address, and the invite link's secret is not in what the Workspace hands
 * over. A person reading it can see what is kept, not what it opens.
 */

const encoder = new TextEncoder();
const json = (path: string, value: unknown): ZipEntry => ({ path, bytes: encoder.encode(JSON.stringify(value, null, 2)) });
const EXTENSION: Readonly<Record<string, string>> = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };

export async function exportAll(place: SettingsPlace, input: Parameters<SettingsApi["exportAll"]>[0], by: By) {
  const entries: ZipEntry[] = [
    json("workspace.json", viewOf(place)),
    json("members.json", input.members),
    json(
      "environments.json",
      place.sandboxes.environments().map(({ output: _output, ...environment }) => environment),
    ),
    json(
      "secrets.json",
      secretNames(place).map(({ name, updatedAt }) => ({ name, updatedAt })),
    ),
    json("models.json", place.models.list()),
    json("agents.json", allAgents(place)),
    json("roles.json", allChanges(place)),
    json("billing.json", place.account.view(place.sandboxes.used)),
  ];
  for (const skill of allSkills(place)) {
    for (const [path, body] of Object.entries(skill.files))
      entries.push({ path: `skills/${skill.name}/${path}`, bytes: encoder.encode(body) });
  }
  for (const [path, value] of Object.entries(await place.extras())) entries.push(json(`${path}.json`, value));
  for (const manager of place.roster) {
    const api = place.manager(manager);
    const [board, pages] = await Promise.all([api.board(), api.pages()]);
    entries.push(json(`managers/${manager.slug}/manager.json`, manager), json(`managers/${manager.slug}/board.json`, board));
    entries.push(json(`managers/${manager.slug}/pages.json`, pages));
  }
  const logo = readLogo(place);
  if (logo._tag === "Logo") entries.push({ path: `logo.${EXTENSION[logo.type] ?? "bin"}`, bytes: logo.bytes });
  said(place, by, "settings.export", `${by.name} exported the workspace's data`);
  const day = new Date(place.clock.now()).toISOString().slice(0, 10);
  return { _tag: "Exported", name: `${place.profile.address}-${day}.zip`, bytes: zip(entries, place.clock.now()) } as const;
}
