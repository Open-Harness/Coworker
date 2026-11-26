/* What the drawn page shows: Sales’s triggers, as on its Playbook page. */
export interface Row { readonly id: string; readonly name: string; readonly does: string; readonly when: string; readonly by: string; readonly only: string; readonly most: string }
export const ROWS: readonly Row[] = [
  { id: "signs", name: "Look for signs", does: "Researcher reads the 140 target accounts for a new site, or a first head of operations", when: "Weekdays, 08:30", by: "Cron", only: "Something changed there since the last time", most: "10 a day" },
  { id: "like", name: "Find companies like our best", does: "Researcher looks for companies like the 12 best customers of the last year", when: "Mondays, 06:00", by: "Cron", only: "Fewer than 5 are waiting to be judged", most: "5 a week" },
  { id: "mail", name: "Mail about buying", does: "Anyone who writes to juno@ about buying", when: "As it arrives", by: "Event", only: "", most: "No limit" },
  { id: "deals", name: "A deal moves in the CRM", does: "Tells the work that is open on it. Starts nothing", when: "As it happens", by: "Event", only: "", most: "No limit" },
  { id: "quiet", name: "No answer for three days", does: "We wrote last. Writer sends one short reminder", when: "72 hours", by: "Wait", only: "They are not away, and Bo has not taken over", most: "Twice, then never again" },
  { id: "asked", name: "Asked by the team", does: "Ama or Bo says so, here or in Slack #sales", when: "When they ask", by: "Asked", only: "", most: "No limit" },
];
export const PARTS = ["Playbook", "Objective", "Workflow", "Triggers", "Agents", "Skills", "Reach", "Evals", "Versions"] as const;
