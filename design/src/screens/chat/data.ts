export interface Msg { readonly me?: boolean; readonly at: string; readonly text: string; readonly calls?: readonly { name: string; target: string; status: "complete" | "running"; duration?: string }[]; readonly fork?: { readonly label: string; readonly to: string } }
export const MAIN: readonly Msg[] = [
  { me: true, at: "09:18", text: "Why is Support slower this week?" },
  { at: "09:18", text: "Two things. WhatsApp messages grew by a third, and the number has been offline since 08:10. Median is 3.1 hours; the aim is 2.", calls: [{ name: "objective.read", target: "Support", status: "complete", duration: "0.2 s" }, { name: "connector.read", target: "WhatsApp", status: "complete", duration: "0.4 s" }], fork: { label: "Draft the note to the team, 4 replies", to: "soon-Chat" } },
  { me: true, at: "09:22", text: "And if the number had stayed up?" },
  { at: "09:22", text: "Then about 2.4 hours. Still over. Version 5 of Support answers the short ones first; I’m trying it on 40 past mails now." },
  { me: true, at: "09:30", text: "Good. Tell me when it is done." },
  { at: "09:31", text: "I will, here. 12 of 40 so far: 2 better, 10 the same.", calls: [{ name: "manager.try", target: "Support, version 5", status: "running" }], fork: { label: "Compare with October, 2 replies", to: "chat-support-october" } },
];
export const FORK: readonly Msg[] = [
  { me: true, at: "09:45", text: "In here: was October the same, or is this new?" },
  { at: "09:46", text: "Reading October’s 840 mails. I’ll leave the other chat alone and only bring back the answer.", calls: [{ name: "event.read", target: "Support, October", status: "running" }] },
];
