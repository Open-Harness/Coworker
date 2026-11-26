import { playbooks } from "~/modules/playbook/service.ts";
import type { Surroundings } from "~/modules/playbook/types.ts";
import type { Answers, Filled, Template } from "../types.ts";
import { blanksLeft, problemsOfValues, valuesOf } from "./answers.ts";
import { putValues } from "./put.ts";

/** Every blank has an answer or a best; then the files are put together, read and checked. */
export function fillTemplate(template: Template, answers: Answers, around: Surroundings): Filled {
  const left = blanksLeft(template, answers);
  if (left.length > 0) return { _tag: "Blank", blanks: left };
  const values = valuesOf(template, answers);
  const wrong = problemsOfValues(template, values);
  if (wrong.length > 0) return { _tag: "Problems", problems: wrong };
  const files = putValues(template.files, template.blanks, values);
  const read = playbooks.read(files);
  if (read._tag === "Problems") return { _tag: "Problems", problems: read.problems };
  const problems = playbooks.check(read.playbook, around);
  if (problems.length > 0) return { _tag: "Problems", problems };
  return { _tag: "Filled", files, from: { template: template.id, version: template.version } };
}
