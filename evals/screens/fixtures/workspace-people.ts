import type { Person } from "~/modules/views-workspace/types.ts";

/** The story's people. Pat Reyes is outside: a customer of Acme's, at Northwind. */
export const AMA: Person = { id: "ama", name: "Ama Mensah", role: "Owner", initials: "AM" };
export const BO: Person = { id: "bo", name: "Bo Larsen", role: "Builder", initials: "BL" };
export const CHIDI: Person = { id: "chidi", name: "Chidi Okafor", role: "Member", initials: "CO" };
export const PAT: Person = { id: "pat", name: "Pat Reyes", role: "Outside", initials: "PR" };
export const PEOPLE: readonly Person[] = [AMA, BO, CHIDI, PAT];
