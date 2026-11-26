import type { Problem } from "~/modules/playbook/types.ts";
import type { Answers, Template } from "../types.ts";
import { isNumber, modelOf, type Values } from "./blank.ts";

/* What each blank is to be: an answer, or else its best. */

/** Blanks with neither, by id, in the template's order. A person always has an answer: the types give no way to know who makes it. */
export function blanksLeft(template: Template, answers: Answers): readonly string[] {
  return template.blanks.filter((b) => answers[b.id] === undefined && b.best === null && b.is.a !== "person").map((b) => b.id);
}

export function valuesOf(template: Template, answers: Answers): Values {
  return Object.fromEntries(template.blanks.map((b) => [b.id, answers[b.id] ?? b.best?.value ?? ""]));
}

const bad = (id: string, says: string): Problem => ({ at: "template.yaml", line: id, says });

/** An answer that is not what its blank is, or that is more than a line. */
export function problemsOfValues(template: Template, values: Values): readonly Problem[] {
  return template.blanks.flatMap((b): readonly Problem[] => {
    const value = values[b.id] ?? "";
    if (/[\r\n\p{Zl}\p{Zp}]/u.test(value)) return [bad(b.id, `The answer for ${b.id} is more than one line, and it can only be one.`)];
    if (b.is.a === "number" && !isNumber(value)) return [bad(b.id, `The answer for ${b.id} is not a number, and it needs to be one.`)];
    if (b.is.a === "model" && value !== "inherit" && modelOf(value) === null)
      return [bad(b.id, `The answer for ${b.id} is not a model: say inherit, or a connection, a model and off, low, medium or high.`)];
    return [];
  });
}
