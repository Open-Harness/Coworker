import type { Files, Playbook } from "../types.ts";
import { joinFront } from "./front.ts";
import {
  agentFrontPlain,
  becausePlain,
  evalPlain,
  kindPlain,
  objectivePlain,
  ownSkillFront,
  reachPlain,
  triggerPlain,
  usedSkillPlain,
} from "./plain.ts";
import { dump } from "./yaml.ts";

const skillPath = (id: string): string => `skills/${id}/SKILL.md`;
const isOwnSkillPage = (path: string): boolean => /^skills\/[^/]+\/SKILL\.md$/u.test(path);

/** A playbook as the files it is kept in. The same playbook is always the same files. */
export function writeFiles(p: Playbook): Files {
  const files: Record<string, string> = {};
  for (const [path, text] of Object.entries(p.skillFiles)) if (path.startsWith("skills/") && !isOwnSkillPage(path)) files[path] = text;
  files["SKILL.md"] = joinFront({ name: p.name }, p.page);
  files["objective.yaml"] = dump(objectivePlain(p.objective));
  files["workflow.yaml"] = dump({ kinds: p.kinds.map(kindPlain) });
  files["triggers.yaml"] = dump({ triggers: p.triggers.map(triggerPlain) });
  for (const a of p.agents) files[`agents/${a.id}.md`] = joinFront(agentFrontPlain(a), a.told);
  files["skills.yaml"] = dump({ use: p.skills.filter((s) => s.from !== "here").map(usedSkillPlain) });
  for (const s of p.skills)
    if (s.from === "here") files[skillPath(s.id)] = joinFront(ownSkillFront(s), p.skillFiles[skillPath(s.id)] ?? "");
  files["reach.yaml"] = dump(reachPlain(p.reach));
  for (const { id, ...rest } of p.evals) files[`evals/${id}.yaml`] = dump(evalPlain(rest));
  files["because.yaml"] = dump(Object.fromEntries(Object.entries(p.because).map(([line, b]) => [line, becausePlain(b)])));
  return files;
}
