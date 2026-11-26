import type { Accepted } from "../types.ts";

const DOMAIN = /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/u;
const ORG = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/iu;

const shaped = (value: string, shape: RegExp, reason: string): Accepted =>
  shape.test(value) ? { _tag: "Accepted", value } : { _tag: "Problem", reason };

/** A typed answer, tidied, or why it cannot be right. The reason never repeats what was typed: it may be a secret. */
export function accept(name: string, typed: string): Accepted {
  const value = typed.trim();
  if (value === "") return { _tag: "Problem", reason: "Nothing was typed" };
  if (name === "TEST_DOMAIN")
    return shaped(
      value
        .toLowerCase()
        .replace(/^https?:\/\//u, "")
        .replace(/\/+$/u, ""),
      DOMAIN,
      "That is not a domain, such as example.com",
    );
  if (name === "TEST_ORG") return shaped(value.replace(/^(?:https:\/\/)?github\.com\//u, ""), ORG, "That is not an organization's name");
  return /\s/u.test(value) ? { _tag: "Problem", reason: "A token has no spaces in it" } : { _tag: "Accepted", value };
}
