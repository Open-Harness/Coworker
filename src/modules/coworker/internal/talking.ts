import type { Talking } from "../types.ts";

type Person = { readonly inside: boolean; readonly customer: boolean; readonly lead: boolean; readonly domain: string };

/** What it says to someone no group of the list fits: careful, and nothing more. */
const careful: Talking = {
  id: "anyone",
  who: "anyone",
  is: { people: "anyone" },
  how: "Be polite and brief.",
  may: "Answer only what is public. Share nothing about anyone else.",
  sign: "",
};

function fits(is: Talking["is"], person: Person): boolean {
  if ("domain" in is) return person.domain !== "" && person.domain === is.domain;
  switch (is.people) {
    case "team":
      return person.inside;
    case "customers":
      return person.customer;
    case "leads":
      return person.lead;
    case "anyone":
      return true;
  }
}

/** The first group of the list that fits the person. */
export function talkingTo(talking: readonly Talking[], person: Person): Talking {
  return talking.find((t) => fits(t.is, person)) ?? careful;
}
