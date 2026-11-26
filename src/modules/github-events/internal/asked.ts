import type { GithubRecord } from "../types.ts";
import type { GithubEvents } from "../types.ts";
import { checkRunFrom } from "./check.ts";
import { itemFrom, recordsOfPull } from "./item.ts";
import { isJson, list, type Json } from "./json.ts";
import { commentFrom, lineFrom, reviewFrom } from "./parts.ts";

/* GitHub's answers hold the same records as its deliveries: so there is one path, and asking is only another way in. */

const each = (value: unknown): readonly Json[] => (Array.isArray(value) ? value.filter(isJson) : []);

export const asked: GithubEvents["asked"] = (number, answers, at) => {
  const items: readonly GithubRecord[] =
    answers.pull !== undefined ? recordsOfPull(answers.pull, at) : [itemFrom(answers.issue, false, at)].filter((one) => one !== undefined);
  const runs = Array.isArray(answers.checks) ? each(answers.checks) : list(answers.checks, "check_runs");
  return [
    ...items,
    ...each(answers.comments).flatMap((one) => commentFrom(one, number, false, at) ?? []),
    ...each(answers.reviews).flatMap((one) => reviewFrom(one, number, at) ?? []),
    ...each(answers.lines).flatMap((one) => lineFrom(one, number, false, at) ?? []),
    ...runs.flatMap((one) => checkRunFrom(one, at) ?? []),
  ];
};
