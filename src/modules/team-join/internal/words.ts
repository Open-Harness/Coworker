import type { Role } from "../types.ts";

export const ROLE: Readonly<Record<Role, { readonly label: string; readonly can: string }>> = {
  owner: { label: "an Owner", can: "Do everything here, with settings and billing." },
  builder: { label: "a Builder", can: "Make managers and environments, answer managers, and add work." },
  member: { label: "a Member", can: "Answer managers, add work, and chat with them." },
};

export const isEmail = (text: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/u.test(text);

/** The page to come back to, without the `error` a bad sign-in link left in it. */
export function withoutError(here: string): { readonly path: string; readonly failed: boolean } {
  const [path = "/", search = ""] = here.split("?");
  const query = new URLSearchParams(search);
  const failed = query.has("error");
  query.delete("error");
  const rest = query.toString();
  return { path: rest === "" ? path : `${path}?${rest}`, failed };
}
