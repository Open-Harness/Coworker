/* Who is in the workspace. Names, roles and mails agree with PEOPLE in world.ts. */

export type Role = "Owner" | "Builder" | "Member";
export const ROLES: readonly Role[] = ["Owner", "Builder", "Member"];
export interface Member { readonly id: string; readonly name: string; readonly mail: string; readonly role: Role; /** Where they are known on other connectors. */ readonly known: readonly string[]; readonly seen: string; readonly invited?: string }
export const MEMBERS: readonly Member[] = [
  { id: "ama", name: "Ama Mensah", mail: "ama@acme.co", role: "Owner", known: ["GitHub: ama-m", "Slack: @ama", "WhatsApp"], seen: "Now" },
  { id: "bo", name: "Bo Larsen", mail: "bo@acme.co", role: "Builder", known: ["Slack: @bo", "CRM: Bo Larsen"], seen: "Today, 08:40" },
  { id: "chidi", name: "Chidi Okafor", mail: "chidi@acme.co", role: "Member", known: ["GitHub: chidi-o", "Slack: @chidi"], seen: "24 Nov" },
  { id: "ngozi", name: "Ngozi Eze", mail: "ngozi@acme.co", role: "Member", known: [], seen: "Not yet", invited: "Invited 22 Nov" },
];
/** People with your mail domain who asked to join. You say yes in your inbox; it is also here. */
export const ASKED = [{ id: "dana", name: "Dana Whitfield", mail: "dana@acme.co", when: "Yesterday, 16:12" }] as const;
export const MAY: Readonly<Record<Role, string>> = {
  Owner: "Everything, also people, keys and billing",
  Builder: "Change managers and what they may do",
  Member: "Ask Juno, see everything, answer what waits for them",
};
