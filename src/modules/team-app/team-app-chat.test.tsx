import { cleanup, render, screen } from "@testing-library/react";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { afterEach, describe, expect, it } from "vitest";
import { ChatScreen } from "./service.ts";
import type { ChatLineData, ChatScreenProps } from "./types.ts";

afterEach(cleanup);

const screenWith = (props: Partial<ChatScreenProps>) =>
  render(
    <LayerProvider>
      <ChatScreen managerName="Launch" address="launch@acme.test" lines={[]} onSay={() => undefined} {...props} />
    </LayerProvider>,
  );

describe("a manager's chat", () => {
  it("says hello to an empty chat, and shows an answer being written as it grows", () => {
    const { unmount } = screenWith({});
    expect(screen.getByText("Say hello to Launch")).toBeTruthy();
    unmount();
    const lines: ChatLineData[] = [
      { id: "1", role: "person", authorName: "Ama", text: "write at length" },
      { id: "streaming", role: "manager", text: "Here is the long ver", streaming: true },
    ];
    screenWith({ lines });
    expect(screen.queryByText("Say hello to Launch")).toBeNull();
    expect(screen.getByText("Here is the long ver")).toBeTruthy();
    expect(screen.getByText("Writing…")).toBeTruthy();
  });

  it("tells a person who can connect a model where, and anyone else who to ask", () => {
    const { unmount } = screenWith({ noModel: { reason: "No model is connected. Add a key.", fixHref: "/ws/w1/settings/keys" } });
    expect(screen.getByText("No model is connected")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Add a model" }).getAttribute("href")).toBe("/ws/w1/settings/keys");
    unmount();
    screenWith({ noModel: { reason: "No model is connected. Add a key." } });
    expect(screen.getByText("No model is connected yet")).toBeTruthy();
    expect(screen.getByText(/Ask an Owner of this workspace/u)).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Add a model" })).toBeNull();
  });
});
