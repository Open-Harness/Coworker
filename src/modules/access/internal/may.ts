import { createActions } from "~/modules/actions/service.ts";
import type { MayDo, MayOpen, Standing } from "../types.ts";
import { RULES, type Rule } from "./rules.ts";

const NOBODY = { categories: {}, actions: {} } as const;

const checkerFor = ({ role, own }: Standing) =>
  createActions({
    sources: { manager: () => NOBODY, person: () => ({ preset: role, own }) },
    handlers: {},
    audit: () => undefined,
    clock: { now: () => 0 },
  });

export const mayDo: MayDo = (standing, actionId) => checkerFor(standing).check({ kind: "person", id: "me", name: "me" }, actionId) === "on";

const satisfies = (standing: Standing, rule: Rule): boolean => {
  switch (rule.kind) {
    case "everyone":
      return true;
    case "role":
      return rule.roles.includes(standing.role);
    case "action":
      return mayDo(standing, rule.id);
    case "all":
      return rule.rules.every((one) => satisfies(standing, one));
  }
};

export const mayOpen: MayOpen = (standing, page) => satisfies(standing, RULES[page]);
