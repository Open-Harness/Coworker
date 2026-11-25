import type { By } from "~/modules/actions/types.ts";
import type { SettingsApi, SettingsPlace, SkillCheck, SkillFiles, SkillView, VersionStamp } from "../types.ts";
import { said } from "./said.ts";
import { isRecord } from "./store.ts";

/*
 * Skills in the Agent Skills format: a folder with a `SKILL.md` and the files it names. Saved as versions. The files
 * are text, kept in the Workspace object (a skill that needs binaries waits for R2).
 */

const NAME = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/u;
const PATH = /^(?!\/)(?!.*(?:^|\/)\.\.?(?:\/|$))[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+){0,3}$/u;
const MAX_FILES = 50;
const MAX_FILE = 100_000;
const MAX_TOTAL = 1_000_000;

/** The front matter of SKILL.md, as far as the format needs: `name` and `description`. */
function frontMatter(text: string): { readonly name?: string; readonly description?: string } {
  const block = /^---\r?\n([\s\S]*?)\r?\n---/u.exec(text)?.[1] ?? "";
  const line = (key: string): string | undefined => new RegExp(`^${key}:\\s*(.+)$`, "mu").exec(block)?.[1]?.trim();
  const [name, description] = [line("name"), line("description")];
  return { ...(name === undefined ? {} : { name }), ...(description === undefined ? {} : { description }) };
}

export function checksOf(name: string, files: SkillFiles): readonly SkillCheck[] {
  const skill = files["SKILL.md"];
  if (skill === undefined) return [{ level: "error", text: "There is no SKILL.md" }];
  const meta = frontMatter(skill);
  const checks: SkillCheck[] = [
    meta.name === name
      ? { level: "ok", text: "Name matches the folder" }
      : { level: "error", text: `The name in SKILL.md (${meta.name ?? "none"}) is not the folder's, ${name}` },
    meta.description === undefined
      ? { level: "error", text: "SKILL.md has no description" }
      : { level: "ok", text: "Description says what it does and when to use it" },
  ];
  for (const path of Object.keys(files)) {
    if (path === "SKILL.md" || skill.includes(path) || skill.includes(path.split("/").at(-1) ?? path)) continue;
    checks.push({ level: "warn", text: `${path} is never mentioned in SKILL.md` });
  }
  return checks;
}

function problemWith(name: string, files: SkillFiles): string | undefined {
  if (!NAME.test(name)) return "A skill's name is 1 to 64 lowercase letters, digits and dashes";
  const paths = Object.keys(files);
  if (paths.length > MAX_FILES) return `A skill has at most ${MAX_FILES} files`;
  const bad = paths.find((path) => !PATH.test(path));
  if (bad !== undefined) return `${bad} is not a path inside the skill's folder`;
  const big = paths.find((path) => (files[path]?.length ?? 0) > MAX_FILE);
  if (big !== undefined) return `${big} is over ${MAX_FILE} characters`;
  if (paths.reduce((sum, path) => sum + (files[path]?.length ?? 0), 0) > MAX_TOTAL)
    return `A skill is at most ${MAX_TOTAL} characters in all`;
  return files["SKILL.md"] === undefined ? "A skill needs a SKILL.md" : undefined;
}

const filesOf = (text: string): SkillFiles => {
  const value: unknown = JSON.parse(text);
  return isRecord(value) ? Object.fromEntries(Object.entries(value).map(([path, body]) => [path, String(body)])) : {};
};

/** A skill's files at one version, or its latest when none is named. Undefined when there is no such skill or version. */
export function skillAt(
  place: SettingsPlace,
  which: { readonly name: string } | { readonly id: string },
  version?: number,
): { readonly id: string; readonly version: number; readonly files: SkillFiles } | undefined {
  const [column, value] = "id" in which ? (["s.id", which.id] as const) : (["s.name", which.name] as const);
  const row = place.sql
    .exec<{ id: string; version: number; files: string }>(
      `SELECT s.id, v.version, v.files FROM skill s JOIN skill_version v ON v.skill_id = s.id
       WHERE ${column} = ?1 AND (?2 IS NULL OR v.version = ?2) ORDER BY v.version DESC LIMIT 1`,
      value,
      version ?? null,
    )
    .toArray()[0];
  return row === undefined ? undefined : { id: row.id, version: row.version, files: filesOf(row.files) };
}

export function skillView(place: SettingsPlace, id: string): SkillView | undefined {
  const name = place.sql.exec<{ name: string }>("SELECT name FROM skill WHERE id = ?", id).toArray()[0]?.name;
  const versions = place.sql
    .exec<{ version: number; files: string; saved_at: number; saved_by: string; note: string }>(
      "SELECT * FROM skill_version WHERE skill_id = ? ORDER BY version DESC",
      id,
    )
    .toArray();
  const latest = versions[0];
  if (name === undefined || latest === undefined) return undefined;
  const files = filesOf(latest.files);
  const stamps: VersionStamp[] = versions.map((row) => ({
    version: row.version,
    savedAt: row.saved_at,
    savedBy: row.saved_by,
    note: row.note,
  }));
  return { id, name, files, version: latest.version, checks: checksOf(name, files), versions: stamps };
}

export const allSkills = (place: SettingsPlace): readonly SkillView[] =>
  place.sql
    .exec<{ id: string }>("SELECT id FROM skill ORDER BY name")
    .toArray()
    .flatMap(({ id }) => skillView(place, id) ?? []);

/** The agents that name a skill. */
const usedBy = (place: SettingsPlace, name: string): readonly string[] =>
  place.sql
    .exec<{ config: string }>(
      "SELECT config FROM agent_version v WHERE version = (SELECT MAX(version) FROM agent_version WHERE agent_id = v.agent_id)",
    )
    .toArray()
    .flatMap(({ config }) => {
      const parsed: unknown = JSON.parse(config);
      return isRecord(parsed) && Array.isArray(parsed["skills"]) && parsed["skills"].includes(name) ? [String(parsed["name"])] : [];
    });

export function saveSkill(place: SettingsPlace, input: Parameters<SettingsApi["saveSkill"]>[0], by: By) {
  const name = input.name.trim();
  const problem = problemWith(name, input.files);
  if (problem !== undefined) return { _tag: "Invalid", reason: problem } as const;
  const before = input.id === undefined ? undefined : skillView(place, input.id);
  if (input.id !== undefined && before === undefined) return { _tag: "NotFound" } as const;
  const clash = place.sql.exec<{ id: string }>("SELECT id FROM skill WHERE name = ?", name).toArray()[0];
  if (clash !== undefined && clash.id !== input.id) return { _tag: "NameTaken" } as const;
  if (before !== undefined && before.name !== name && usedBy(place, before.name).length > 0)
    return {
      _tag: "Invalid",
      reason: `${before.name} is used by ${usedBy(place, before.name).join(", ")}; take it out of them before renaming it`,
    } as const;
  const id = before?.id ?? place.ids.next("skill");
  const now = place.clock.now();
  if (before === undefined)
    place.sql.exec("INSERT INTO skill (id, name, created_at, created_by) VALUES (?, ?, ?, ?)", id, name, now, by.id);
  else place.sql.exec("UPDATE skill SET name = ? WHERE id = ?", name, id);
  if (before === undefined || JSON.stringify(before.files) !== JSON.stringify(input.files) || before.name !== name) {
    const version = (before?.version ?? 0) + 1;
    place.sql.exec(
      "INSERT INTO skill_version (skill_id, version, files, note, saved_at, saved_by) VALUES (?, ?, ?, ?, ?, ?)",
      id,
      version,
      JSON.stringify(input.files),
      (input.note ?? "").slice(0, 200),
      now,
      by.name,
    );
    said(place, by, "settings.skill", `${by.name} saved the skill ${name} as version ${version}`);
  }
  const saved = skillView(place, id);
  return saved === undefined ? ({ _tag: "NotFound" } as const) : ({ _tag: "Saved", value: saved } as const);
}

export function deleteSkill(place: SettingsPlace, id: string, by: By) {
  const found = skillView(place, id);
  if (found === undefined) return { _tag: "NotFound" } as const;
  const users = usedBy(place, found.name);
  if (users.length > 0)
    return { _tag: "Invalid", reason: `${found.name} is used by ${users.join(", ")}; take it out of them first` } as const;
  place.sql.exec("DELETE FROM skill_version WHERE skill_id = ?", id);
  place.sql.exec("DELETE FROM skill WHERE id = ?", id);
  said(place, by, "settings.skill", `${by.name} deleted the skill ${found.name}`);
  return { _tag: "Deleted" } as const;
}
