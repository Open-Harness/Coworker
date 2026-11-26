import type { Connector } from "../types.ts";
import { act, arg } from "./make.ts";

type Part = Pick<Connector, "id" | "name" | "setUp" | "events" | "actions" | "skills" | "view">;

export const calendar: Part = {
  id: "calendar",
  name: "Calendar",
  view: "calendar",
  skills: ["calendar"],
  setUp: [
    { id: "connect_account", by: "person", says: "Sign in to the calendar and allow access." },
    { id: "check_access", by: "itself", says: "Check that it can see times and make events." },
  ],
  events: [
    { id: "invited", says: "Someone invited us to an event." },
    { id: "changed", says: "An event was moved or changed." },
    { id: "cancelled", says: "An event was cancelled." },
  ],
  actions: [
    act(
      "calendar.free_busy",
      "See when someone is free.",
      ["calendar"],
      "on",
      false,
      arg("who", "text", true, "Whose time to look at."),
      arg("from", "text", true, "The start of the span to look at."),
      arg("to", "text", true, "The end of the span to look at."),
    ),
    act(
      "calendar.book",
      "Book an event; a person says yes first.",
      ["calendar"],
      "ask",
      true,
      arg("title", "text", true, "The title of the event."),
      arg("start", "text", true, "When it starts."),
      arg("end", "text", true, "When it ends."),
      arg("with", "list", false, "Who to invite."),
    ),
    act(
      "calendar.move",
      "Move an event; a person says yes first.",
      ["calendar"],
      "ask",
      true,
      arg("event", "text", true, "The event to move."),
      arg("start", "text", true, "When it now starts."),
      arg("end", "text", true, "When it now ends."),
    ),
    act(
      "calendar.cancel",
      "Cancel an event; a person says yes first.",
      ["calendar"],
      "ask",
      true,
      arg("event", "text", true, "The event to cancel."),
    ),
  ],
};
