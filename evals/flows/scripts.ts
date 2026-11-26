import type { Rule } from "../world/models.ts";

/*
 * What models do in a flow, by what they are told and offered. Nothing here knows how the product arranges its turns:
 * a rule fires when its tool is offered and its words are there.
 */

/**
 * The judge answers every kind it is asked about, read from its prompt (`kind <manager>/<kind>: <when>`, intake README): yes for
 * those named, no for the rest. A judge that leaves a kind unanswered is `CouldNot`, so none of these does.
 */
export const judges = (yes: readonly { manager: string; kind: string; fit?: number }[], no = "It does not fit"): Rule => ({
  tool: "judge",
  times: "always",
  do: { judge: { yes: yes.map((one) => ({ ...one, why: "It does not do what it says" })), no } },
});
/** The judge says yes to one kind of one manager, and no to every other kind of every manager. */
export const takes = (manager: string, kind = "bug", fit = 0.9): Rule => judges([{ manager, kind, fit }]);
/** The judge says no to every kind: it is a wish. */
export const leaves = (_manager: string): Rule => ({ tool: "judge", times: "always", do: { judge: { yes: [], no: "It is a wish" } } });

/**
 * What a checker's evidence is for: the done-whens the work was given, and the `leaves` of the step it checks (templates `repo`
 * and `customers`). Evidence for a check is by the checker; a leave is met when its evidence is.
 */
export const IDS = { repo: ["fixed", "met"], customers: ["answered", "source", "sourced"] } as const;
export const evidenceOf = (ids: readonly string[], met: boolean, says: string, at?: string) =>
  ids.map((check) => ({ check, met, says, ...(at === undefined ? {} : { at }) }));

export const FIX = "echo $(($1 + $2))";
export const DONE_WHEN = "sh add.sh 1 2 answers 3";
export const saysDone: readonly Rule[] = [
  { tool: "done_when", start: true, do: { call: "done_when", args: { checks: [{ id: "fixed", says: DONE_WHEN, by: "agent" }] } } },
  { after: "done_when", do: { call: "report", args: { result: "done", says: "Understood: it subtracts.", evidence: [] } } },
];
/** Changes a file in the box and says it is done. `with`: what it leaves in add.sh. */
export const builds = (left: string = FIX, says = "It adds now."): readonly Rule[] => [
  {
    tool: "bash",
    sees: "Make the change in the clone",
    start: true,
    do: { call: "bash", args: { command: `printf '%s\\n' '${left}' > add.sh && git add -A && git commit -qm 'Add, do not subtract'` } },
  },
  {
    after: "bash",
    tool: "report",
    do: { call: "report", args: { result: "done", says, evidence: [{ check: "tests", met: true, says: "sh test.sh passed" }] } },
  },
];
export const opensIt = (title = "Add, do not subtract", body = "It subtracted. Tested with sh test.sh."): readonly Rule[] => [
  { tool: "github_push", sees: "Open the pull request", start: true, do: { call: "github_push", args: {} } },
  { after: "github_push", tool: "github_open_pull_request", do: { call: "github_open_pull_request", args: { title, body } } },
];
/** The doer, from an issue to a pull request. */
export const fixes: readonly Rule[] = [...saysDone, ...builds(), ...opensIt()];

/** The reviewer, once each time it is written. */
export const checksIt = (met = true, says = "Read it and ran the tests."): readonly Rule[] => [
  { tool: "check", do: { call: "check", args: { evidence: evidenceOf(IDS.repo, met, says, "add.sh:1"), says } } },
];
/** The reviewer, for as many pieces of work as there are. */
export const checksAlways = (): readonly Rule[] => checksIt().map((rule) => ({ ...rule, times: "always" as const }));
