import type { Connector } from "../types.ts";
import { act, arg } from "./make.ts";

type Part = Pick<Connector, "id" | "name" | "setUp" | "events" | "actions" | "skills" | "view">;

export const slack: Part = {
  id: "slack",
  name: "Slack",
  view: "channels",
  skills: ["slack"],
  setUp: [
    { id: "install_app", by: "person", says: "Install the Slack app in your workspace." },
    { id: "invite_to_channels", by: "person", says: "Invite the app to the channels it should be in." },
    { id: "check_events", by: "itself", says: "Check that messages and mentions arrive." },
  ],
  events: [
    { id: "message", says: "A message was posted in a channel it is in." },
    { id: "mention", says: "Someone mentioned it in a channel." },
    { id: "direct_message", says: "Someone wrote to it directly." },
    { id: "reaction", says: "Someone reacted to a message." },
  ],
  actions: [
    act(
      "slack.read",
      "Read a channel, or one thread of it.",
      ["workspace", "channel"],
      "on",
      false,
      arg("thread", "text", false, "The thread to read; the channel if left out."),
    ),
    act(
      "slack.reply",
      "Reply in the thread.",
      ["workspace", "channel", "thread"],
      "on",
      true,
      arg("text", "text", true, "What the reply says."),
    ),
    act(
      "slack.start_thread",
      "Start a new thread in the channel.",
      ["workspace", "channel"],
      "ask",
      true,
      arg("text", "text", true, "What the first message says."),
    ),
    act(
      "slack.react",
      "React to the message.",
      ["workspace", "channel", "message"],
      "on",
      true,
      arg("emoji", "text", true, "The emoji to react with."),
    ),
  ],
};
