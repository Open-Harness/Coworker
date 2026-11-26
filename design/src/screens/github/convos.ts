/* The other issues and pull requests. Short, as they are on GitHub: who said what, and what Juno did. */
import type { Entry } from "./data";

const p = (id: string, by: string, at: string, ...body: string[]): Entry => ({ kind: "comment", id, by, at, body });
const j = (id: string, at: string, ...body: string[]): Entry => ({ kind: "comment", id, by: "Juno", at, body, mine: true });
const ev = (id: string, at: string, text: string): Entry => ({ kind: "event", id, at, text });

export const CONVOS: Readonly<Record<string, readonly Entry[]>> = {
  "423": [p("a", "Ama Mensah", "09:42", "People ask what plan they are on and cannot find it. Show it on the billing page, as in the drawing.", "Drawing: billing-plan.png"), ev("b", "09:42", "Juno was asked by Ama Mensah and took it on as ACME-423.")],
  "421": [p("a", "mira-k", "07:48", "Sign in with GitHub loops on Safari. I press the button, I come back to the sign in page, and nothing says why."), j("b", "07:52", "Which Safari version are you on? Is “Prevent cross-site tracking” on? Bo can repeat it on Safari 17, and I want to know if it is the same for you."), ev("c", "07:52", "Waits for the reporter.")],
  "413": [j("a", "23 Nov, 11:30", "Adds a limit per key to the public API: 600 requests a minute, 429 with a Retry-After header after that.", "Closes #404."), { kind: "comment", id: "b", by: "Chidi Okafor", at: "24 Nov, 15:02", body: ["Why 600? Is it per key or per workspace?"] }, j("c", "24 Nov, 15:20", "Per key. 600 is twice the busiest key in the last 30 days."), { kind: "comment", id: "d", by: "Chidi Okafor", at: "25 Nov, 09:35", body: ["Okay. What is left on this?"] }, j("e", "25 Nov, 09:37", "Your review. You asked twice about the limit per key, and I have answered both.")],
  "404": [p("a", "Bo Larsen", "22 Nov, 14:02", "Someone could take the API down with a loop. Add a limit per key."), ev("b", "22 Nov, 14:10", "Juno took it on as ACME-404."), ev("c", "23 Nov, 11:30", "Juno opened pull request #413, which closes this issue."), ev("d", "24 Nov, 09:00", "Juno asked Chidi Okafor to review #413.")],
  "416": [j("a", "24 Nov, 16:40", "Moves focus through the sidebar in the order it is drawn.", "Closes #409."), ev("b", "25 Nov, 09:18", "Bo Larsen asked Juno to run CI again."), j("c", "25 Nov, 09:18", "Done. It is running now.")],
  "409": [p("a", "Bo Larsen", "23 Nov, 15:12", "Tab goes from the logo to the footer and skips the middle of the sidebar."), ev("b", "24 Nov, 16:40", "Juno opened pull request #416, which closes this issue."), ev("c", "25 Nov, 09:30", "Bo Larsen asked: is it fixed? Juno: not yet, it waits for CI.")],
  "419": [j("a", "25 Nov, 04:55", "Handles the two breaking changes in payment-lib 5: the amount is a string now, and refunds take a reason.", "Into #415."), ev("b", "25 Nov, 04:58", "A check is running.")],
  "415": [p("a", "dependabot", "24 Nov, 22:00", "Bumps payment-lib from 4.1 to 5.0. Release notes: breaking changes in `Amount` and `refund`."), ev("b", "25 Nov, 04:55", "Juno opened pull request #419 into this branch.")],
  "398": [j("a", "22 Nov, 09:20", "Node 18 is end of life. Dropping it breaks one customer’s build. Merge now, or wait for v3?"), p("b", "Bo Larsen", "24 Nov, 14:24", "No. One customer still builds on it."), p("c", "Chidi Okafor", "24 Nov, 14:26", "They can move. It is end of life."), j("d", "24 Nov, 14:27", "You two disagree and I should not pick. Who decides?")],
  "414": [j("a", "25 Nov, 05:50", "Reads the time of a report in the workspace’s time zone, not the server’s.", "Closes #411."), ev("b", "25 Nov, 05:58", "Merged into main.")],
  "411": [j("a", "25 Nov, 05:12", "Support told two customers that reports show one day early after midnight. The time is read in the server’s zone."), ev("b", "25 Nov, 05:58", "Closed by #414. Juno told the two customers.")],
  "420": [j("a", "25 Nov, 00:48", "Fixes “recieve” in the invite mail.", "Closes #410."), ev("b", "25 Nov, 00:55", "Merged into main.")],
  "410": [p("a", "Chidi Okafor", "24 Nov, 23:30", "The invite mail says “recieve”."), ev("b", "25 Nov, 00:55", "Closed by #420.")],
  "406": [p("a", "Bo Larsen", "23 Nov, 09:00", "A customer asks for Internet Explorer 11."), j("b", "24 Nov, 08:30", "No. It is not supported by the libraries we build on, and fewer than 0.1% of sign-ins come from it. Closing."), ev("c", "24 Nov, 08:30", "Closed as not planned.")],
};
