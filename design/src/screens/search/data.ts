export const FOUND = [
  { what: "Harbor Foods", sign: "Opened a site in Ghent, 19 Nov", source: "Read on harborfoods.example/news", became: "Waits for Bo", at: "Today, 08:34", waits: true, to: "#m-sales-intake-i1" },
  { what: "Orbit Labs", sign: "Raised money, 20 Nov", source: "Read in a trade paper", became: "Left alone", at: "24 Nov", waits: false, to: "#m-sales-intake-i11" },
  { what: "Lindqvist Paper", sign: "First head of operations, 17 Nov", source: "Read on its own page", became: "SALES-33", at: "23 Nov", waits: false, to: "#soon-Work" },
  { what: "Tern Hotels", sign: "Opened two sites, 12 Nov", source: "Read on its own page", became: "SALES-27", at: "20 Nov", waits: false, to: "#soon-Work" },
  { what: "Abbot Glass", sign: "First head of operations, 9 Nov", source: "Read on its own page", became: "SALES-26", at: "20 Nov", waits: false, to: "#soon-Work" },
  { what: "Moss & Reed", sign: "Opened a site in Porto, 11 Nov", source: "Read in a local paper", became: "SALES-25", at: "19 Nov", waits: false, to: "#soon-Work" },
] as const;
export const STEPS = [
  ["Read the list", "Sales", "Target accounts, as it is in the CRM now"],
  ["Read what is new about each", "Researcher, 10 at a time", "Its own site, trade papers, job pages. Only what changed since last time"],
  ["Keep only signs with a date and a source", "Researcher", "What has no date is left out"],
  ["Check each against the CRM", "Sales", "Not a customer, not an open deal, not the same sign again"],
  ["Put each in Intake", "Sales", "At most 10. The rest wait for tomorrow"],
] as const;
export const RUNS = [
  ["Today, 08:30", "140 read, 1 found, 4 minutes", "$0.60"], ["24 Nov, 08:30", "140 read, 1 found, 5 minutes", "$0.62"], ["23 Nov, 08:30", "140 read, 1 found, 6 minutes", "$0.65"],
  ["20 Nov, 08:30", "140 read, 2 found, 5 minutes", "$0.60"], ["19 Nov, 08:30", "138 read, 1 found, 2 sites did not answer", "$0.52"],
] as const;
export const TRIED = [["Every hour", "22 found, the same day, $78"], ["Weekdays", "22 found, the same day, $13"], ["Mondays", "13 found, 4 days late, $3"]] as const;
