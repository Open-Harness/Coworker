import { arrayOf, each, isRecord, numberOf, textOf, wordsOf } from "~/modules/team-core/service.ts";
import type { EmailData, EventDecision, EventLine, GitHubEvent, GitHubSources, RepoSourceData } from "../types.ts";

/* A manager's sources and events, as the server sends them. Anything malformed is left out rather than shown wrong. */

export const EVENTS: readonly GitHubEvent[] = ["issues", "issue_comment", "pull_request", "pull_request_review", "check_run"];
const DECISIONS: readonly EventDecision["kind"][] = ["accept", "attach", "ignore"];

const oneOf = <T extends string>(all: readonly T[], value: unknown): T | undefined => all.find((one) => one === value);

const ownRepos = (sources: unknown, managerId: string): readonly RepoSourceData[] =>
  each(sources, (source): RepoSourceData | undefined =>
    source["managerId"] === managerId && typeof source["repo"] === "string"
      ? { repo: source["repo"], events: arrayOf(source["events"]).flatMap((event) => oneOf(EVENTS, event) ?? []) }
      : undefined,
  );

function lostOf(lost: unknown, managerId: string): GitHubSources["lost"] {
  if (!isRecord(lost)) return undefined;
  const account = wordsOf(lost["account"]);
  return account === undefined ? undefined : { account, at: numberOf(lost["at"]), heard: ownRepos(lost["sources"], managerId) };
}

/** `GET …/managers/<id>/github`: `{github: {installation?, lost?, sources}}`, narrowed to this manager's repos. */
export const decodeGitHub =
  (managerId: string) =>
  (body: unknown): GitHubSources | undefined => {
    const github = isRecord(body) ? (body["github"] ?? body["connection"] ?? body) : undefined;
    if (!isRecord(github)) return undefined;
    const installation = isRecord(github["installation"]) ? github["installation"] : undefined;
    const account = wordsOf(installation?.["account"]);
    const lost = lostOf(github["lost"], managerId);
    return {
      ...(account === undefined ? {} : { account }),
      repos: arrayOf(installation?.["repos"]).flatMap((repo) => wordsOf(repo) ?? []),
      listening: ownRepos(github["sources"], managerId),
      ...(account === undefined && lost !== undefined ? { lost } : {}),
    };
  };

/** `PUT …/github` answers `{_tag: "Set", connection}`. */
export const decodeSet =
  (managerId: string) =>
  (body: unknown): GitHubSources | undefined =>
    isRecord(body) && body["_tag"] === "Set" ? decodeGitHub(managerId)({ github: body["connection"] }) : undefined;

/** `GET …/email`: `{domain, addresses}`. */
export const decodeEmail = (body: unknown): EmailData | undefined =>
  isRecord(body)
    ? {
        ending: textOf(body["ending"]),
        addresses: each(body["addresses"], (row) =>
          typeof row["managerId"] === "string"
            ? {
                managerId: row["managerId"],
                name: textOf(row["name"]),
                address: textOf(row["address"]),
                taskAddress: textOf(row["taskAddress"]),
                how: textOf(row["how"]),
                status: textOf(row["status"]),
              }
            : undefined,
        ),
      }
    : undefined;

/** `POST …/email/test` answers `{_tag: "Sent", from}`. */
export const decodeSent = (body: unknown): string | undefined =>
  isRecord(body) && body["_tag"] === "Sent" ? textOf(body["from"]) : undefined;

function decisionOf(value: unknown): { readonly decision: EventDecision } | undefined {
  if (!isRecord(value)) return undefined;
  const kind = oneOf(DECISIONS, value["kind"]);
  if (kind === undefined) return undefined;
  const [task, reason] = [wordsOf(value["task"]), wordsOf(value["reason"])];
  return {
    decision: {
      kind,
      ...(task === undefined ? {} : { task }),
      ...(reason === undefined ? {} : { reason }),
      ...(value["wouldAccept"] === true ? { wouldAccept: true } : {}),
    },
  };
}

/** `GET …/events`: `{events: [{at, line, decision?}]}`. */
export const decodeEvents = (body: unknown): readonly EventLine[] | undefined =>
  isRecord(body)
    ? each(body["events"], (row) =>
        typeof row["line"] === "string" ? { at: numberOf(row["at"]), line: row["line"], ...decisionOf(row["decision"]) } : undefined,
      )
    : undefined;
