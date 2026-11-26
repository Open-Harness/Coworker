/* The walkthrough Juno wrote for this one objective: its steps, its questions, what it asks to look at, what it found. */

export const SAID = "I want more good calls. Bo loses leads because nobody follows up, and we hear too late when a company changes. Twelve a week by new year, and not at the cost of Bo’s day.";

export interface Step { readonly hash: string; readonly label: string; readonly about: string; readonly title: string; readonly lead: string }
export const STEPS: readonly Step[] = [
  { hash: "setup", label: "What you want", about: "In your own words.", title: "What do you want to get to?", lead: "Say it as you would to a colleague. Juno writes the rest of these steps from it." },
  { hash: "setup-ask", label: "Three questions", about: "What only you know.", title: "Three things only you know", lead: "Juno has an answer for each. Change what is wrong." },
  { hash: "setup-connect", label: "Connect, to look", about: "How it has gone so far.", title: "May I look at how it has gone?", lead: "To read only, and only until the draft is made or thrown away. Skip what you like: I say what I then cannot know." },
  { hash: "setup-found", label: "What I found", about: "And where I may be wrong.", title: "How it has gone so far", lead: "From 2 years of the CRM and 30 days of mail. Say where it is wrong." },
  { hash: "setup-ask-2", label: "Two more", about: "From what I found.", title: "Two questions from what I found", lead: "The last ones. What is left, I guess, and mark as my idea in the draft." },
  { hash: "setup-draft", label: "The draft", about: "All of it, to change.", title: "The draft is ready", lead: "Everything Sales would be. Nothing is made yet." },
];

export interface Pick { readonly id: string; readonly label: string; readonly about?: string }
export interface Question { readonly id: string; readonly ask: string; readonly why: string; readonly changes: string; readonly many?: true; readonly picks: readonly Pick[]; readonly best: readonly string[] }
export const FIRST: readonly Question[] = [
  { id: "good", ask: "When is a call a good one?", why: "You said good calls, not calls. This is what I will be measured by.", changes: "Objective, and how it is measured", best: ["held"], picks: [
    { id: "held", label: "It took place, with a company that fits", about: "Bo says so in the CRM after each one" },
    { id: "booked", label: "It was booked", about: "Easy to count. I could fill the calendar with the wrong people" },
    { id: "offer", label: "It led to an offer", about: "Truer, but known only after about 40 days" },
  ] },
  { id: "worse", ask: "What must not get worse?", why: "You named Bo’s day. The other two are what usually goes wrong.", changes: "Objective, reach", many: true, best: ["bo", "stop", "cost"], picks: [
    { id: "bo", label: "Bo’s time per good call", about: "Under 10 minutes. Bo guesses 17 now" },
    { id: "stop", label: "People who say stop", about: "Fewer than 3 in 100" },
    { id: "cost", label: "Cost per good call", about: "Under $15" },
  ] },
  { id: "far", ask: "When I find a company that did not ask, what may I do?", why: "Writing first is the one thing here that cannot be taken back.", changes: "Workflow, reach", best: ["ask"], picks: [
    { id: "ask", label: "Draft it, and ask Bo each time", about: "We look again after two weeks" },
    { id: "tell", label: "Only tell Bo" },
    { id: "do", label: "Write by myself" },
  ] },
];
export const SECOND: readonly Question[] = [
  { id: "list", ask: "Which companies do I watch?", why: "28 of your 46 wins began with a change at the company. Bo keeps “Target accounts” up to date; the open leads are older.", changes: "Triggers", best: ["target"], picks: [
    { id: "target", label: "Target accounts, 140" }, { id: "leads", label: "Every open lead, 212", about: "About $9 a week more" }, { id: "both", label: "Both, 318" },
  ] },
  { id: "answer", ask: "38 of 96 mails waited more than a day. May I answer those?", why: "Most came while Bo was on calls. 29 of the 38 asked something that is on the site.", changes: "Workflow, reach", best: ["site"], picks: [
    { id: "site", label: "Yes, when the answer is on the site", about: "The rest I draft for Bo" },
    { id: "all", label: "Yes, all of them" }, { id: "draft", label: "Draft all of them for Bo" },
  ] },
];

export interface Want { readonly id: string; readonly name: string; readonly reads: string; readonly tells: string; readonly without: string; readonly has?: string; readonly who?: string }
export const WANTS: readonly Want[] = [
  { id: "mail", name: "Mail", reads: "Mail to juno@, 30 days", tells: "Who asks, and how long they wait", without: "", has: "Support uses it" },
  { id: "crm", name: "CRM", reads: "Deals, calls and notes, 2 years", tells: "Where wins began, where leads are lost", without: "I would guess which companies to watch" },
  { id: "calendar", name: "Bo’s calendar", reads: "Free and busy, and calls with people outside", tells: "When calls fit, and how many took place", without: "Bo books the calls", who: "Bo signs in" },
  { id: "calls", name: "Call recordings", reads: "Words of the last 40 calls", tells: "What Bo asks, and what makes a call good", without: "I learn it from what Bo marks, more slowly" },
];

export const BEGAN = [["A change at the company", 28], ["They wrote to us", 14], ["An event", 4]] as const;
export const LOST = [["Wrote to us", 96, ""], ["Answered within a day", 58, "38 waited longer"], ["Answered us back", 41, ""], ["Call booked", 22, "Bo reminded 6 of the 19 that went quiet"], ["Good call", 20, "2 did not take place"]] as const;
export const CADENCE = [["Every hour", "22", "Same day", "$78"], ["Weekdays, 07:00", "22", "Same day", "$13"], ["Mondays", "13", "4 days late", "$3"]] as const;
export const TODAY = "Bo reads a new mail, looks the company up for about 6 minutes, answers from an old mail, and sets a reminder in the calendar. 13 of the last 40 reminders were moved and then forgotten.";

/** What the draft holds after each step: how many lines of each part, and which are new. */
export const PARTS = ["Objective", "Workflow", "Triggers", "Agents", "Skills", "Reach", "Evals"] as const;
export const SO_FAR: readonly (readonly string[])[] = [
  ["", "", "", "", "", "", ""],
  ["12 a week, by 31 Dec", "", "", "", "", "", ""],
  ["12 a week, 3 that must not", "Ask Bo before writing first", "", "", "", "$15 a good call", "Good call, set by Bo"],
  ["12 a week, 3 that must not", "4 kinds of work", "1 cron, tried 3 ways", "3 agents", "9 skills, 1 to write", "$15 a good call", "Good call, 3 guards"],
  ["12 a week, 3 that must not", "4 kinds of work, 6 steps", "1 cron, tried 3 ways", "3 agents", "9 skills, 2 to write", "$15 a good call", "Good call, 3 guards"],
  ["12 a week, 3 that must not", "4 kinds of work, 6 steps", "2 crons, 2 events, 1 wait, asked", "3 agents", "12 skills, 3 new", "Mail, CRM, calendar, $20 a day", "10 measures, 148 cases"],
];
/** The same, when looking was skipped. */
export const BLIND = [["Objective", "12 a week, 3 that must not"], ["Workflow", "2 kinds of work, 4 steps"], ["Triggers", "1 event, 1 wait. No cron: I cannot know what to watch"], ["Agents", "3 agents"], ["Skills", "11 skills, 1 to write as Bo corrects it"], ["Reach", "Mail, $20 a day"], ["Evals", "4 measures, no cases yet"]] as const;
