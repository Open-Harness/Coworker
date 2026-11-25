import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BarChart, DonutChart, LineChart, NameDialog, PeopleHere, Transcript, typingNote, UsageReport, WorkspaceNav } from "./service.ts";
import type { Links, TranscriptProps, WorkspaceNavProps } from "./types.ts";
import type { ChatRow, WorkspaceRow } from "~/modules/protocol/types.ts";
import type { ChatView, TranscriptBlock } from "~/modules/transcript/types.ts";

afterEach(cleanup);
const me = { id: "guest:1", name: "Amina" };
const bo = { id: "guest:2", name: "Bo" };

const links: Links = {
  home: "/",
  library: "/library",
  admin: "/admin",
  workspace: (id) => `/w/${id}`,
  settings: (id) => `/w/${id}/settings`,
  chat: (id, chat) => `/w/${id}/c/${chat}`,
  document: (id, { id: doc }) => `/w/${id}?doc=${doc}`,
};
const chat = (id: number, more: Partial<ChatRow> = {}): ChatRow => ({
  id,
  title: `Chat ${id}`,
  pinned: false,
  createdAt: 1,
  updatedAt: 1,
  createdBy: "Amina",
  status: "idle",
  ...more,
});
const workspace: WorkspaceRow = {
  id: "w1",
  name: "General",
  pinned: false,
  createdAt: 1,
  updatedAt: 1,
  createdBy: "Amina",
  chats: [chat(1), chat(2, { archivedAt: 5 }), chat(3, { status: "working" })],
  documents: [],
};
const nav = (more: Partial<WorkspaceNavProps> = {}): WorkspaceNavProps => ({
  workspaces: [workspace],
  me,
  people: [me, bo],
  selected: { page: "chat", workspaceId: "w1", chatId: 1 },
  links,
  onSearch: vi.fn(),
  onNewWorkspace: vi.fn(),
  onNewChat: vi.fn(),
  workspaceHandlers: () => ({ onPin: vi.fn(), onRename: vi.fn(), onArchive: vi.fn(), onDelete: vi.fn() }),
  chatHandlers: () => ({ onPin: vi.fn(), onRename: vi.fn(), onArchive: vi.fn(), onDelete: vi.fn() }),
  ...more,
});

describe("the navigation", () => {
  it("links to every chat that is not archived and marks the open one", () => {
    render(<WorkspaceNav {...nav()} />);
    expect(screen.getByRole("link", { name: /Chat 1/u }).getAttribute("href")).toBe("/w/w1/c/1");
    expect(screen.getByRole("link", { name: /Chat 1/u }).getAttribute("aria-current")).toBe("page");
    expect(screen.queryByText("Chat 2")).toBeNull();
  });

  it("says which chat is being answered", () => {
    render(<WorkspaceNav {...nav()} />);
    expect(screen.getAllByLabelText("Answering")).toHaveLength(1);
  });
});

const view = (blocks: readonly TranscriptBlock[], more: Partial<ChatView> = {}): ChatView => ({
  blocks,
  running: false,
  compacting: false,
  queued: [],
  ...more,
});
const show = (drawn: ChatView, more: Partial<TranscriptProps> = {}) =>
  render(
    <Transcript
      view={drawn}
      me={me}
      documents={[]}
      onLoadEarlier={async () => {}}
      onFillGap={vi.fn()}
      onFork={vi.fn()}
      onOpenDocument={vi.fn()}
      onContinue={vi.fn()}
      {...more}
    />,
  );
const answer = (id: number, text: string): TranscriptBlock => ({
  kind: "answer",
  id,
  text,
  thinking: "",
  calls: [],
  end: "finished",
  at: 1,
});

describe("the transcript", () => {
  it("names other people, not me", () => {
    show(
      view([
        { kind: "prompt", id: 1, author: me, text: "mine", at: 1 },
        { kind: "prompt", id: 2, author: bo, text: "theirs", at: 1 },
      ]),
    );
    expect(screen.getAllByText("Bo").length).toBeGreaterThan(0);
    expect(screen.queryByText("Amina")).toBeNull();
  });

  it("forks from the end of an answer, however many rounds it took", async () => {
    const onFork = vi.fn();
    show(view([answer(4, "first"), answer(6, "second")]), { onFork });
    await userEvent.click(screen.getByRole("button", { name: "Continue in a new chat" }));
    expect(onFork.mock.calls).toEqual([[6]]);
  });

  it("draws an answer as text, never as HTML", () => {
    const { container } = show(view([answer(1, 'Hi <img src=x onerror="alert(1)"> [x](javascript:alert(1))')]));
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector('a[href^="javascript"]')).toBeNull();
  });

  it("offers to continue only what can be continued", async () => {
    const onContinue = vi.fn();
    const { unmount } = show(view([], { failure: { message: "Broken", canContinue: true, stopped: false } }), { onContinue });
    await userEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledOnce();
    unmount();
    show(view([], { failure: { message: "Broken", canContinue: false, stopped: false } }));
    expect(screen.queryByRole("button", { name: "Continue" })).toBeNull();
  });
});

describe("people", () => {
  const presence = [
    { person: me, chatId: 1, typing: true },
    { person: bo, chatId: 1, typing: true },
  ];
  it("are noted while they type, except me", () => {
    const { container } = render(<>{typingNote({ presence, chatId: 1 }, me)}</>);
    expect(container.textContent).toContain("Bo");
    expect(container.textContent).not.toContain("Amina");
    expect(typingNote({ presence, chatId: 2 }, me)).toBeUndefined();
  });
  it("are shown in the chat they are in", () => {
    render(<PeopleHere presence={presence} chatId={1} />);
    expect(screen.getByLabelText(/Bo/u)).toBeTruthy();
  });
});

describe("forms", () => {
  it("do not accept an empty name", async () => {
    const onSubmit = vi.fn();
    render(<NameDialog isOpen title="Who?" label="Name" submitLabel="Continue" maxLength={20} onSubmit={onSubmit} />);
    const input = screen.getByLabelText(/Name/u);
    await userEvent.type(input, "   {Enter}");
    expect(onSubmit).not.toHaveBeenCalled();
    await userEvent.clear(input);
    await userEvent.type(input, " Amina {Enter}");
    expect(onSubmit.mock.calls).toEqual([["Amina"]]);
  });

  it("show what was spent", () => {
    render(<UsageReport usage={{ costUsd: 1.5, models: [{ model: "vibeproxy/gpt-6-luna", costUsd: 1.5, tokens: 1200 }] }} budgetUsd={2} />);
    expect(screen.getByText(/gpt-6-luna/u)).toBeTruthy();
  });
});

describe("charts", () => {
  const days = ["20 Nov", "21 Nov", "22 Nov"];

  it("name the picture and give its numbers as a table, with units and a legend", async () => {
    render(
      <LineChart
        label="Tasks per day"
        unit="tasks"
        labels={days}
        series={[
          { name: "Created", values: [1, 0, 3], color: "blue" },
          { name: "Finished", values: [0, 2, 1], color: "green" },
        ]}
      />,
    );
    expect(await screen.findByRole("img", { name: "Tasks per day" })).toBeTruthy();
    const table = screen.getByRole("table", { name: "Tasks per day, as numbers" });
    expect(
      within(table)
        .getAllByRole("row")
        .map((row) => row.textContent),
    ).toEqual(["WhenCreatedFinished", "20 Nov1 tasks0 tasks", "21 Nov0 tasks2 tasks", "22 Nov3 tasks1 tasks"]);
    // The legend names each line beside the picture, apart from the table's own headers.
    expect(screen.getAllByText("Created")).toHaveLength(2);
    expect(screen.getAllByText("Finished")).toHaveLength(2);
  });

  it("say so instead of drawing a flat line, or a line of one point", () => {
    const { rerender } = render(
      <LineChart label="Open" emptyText="Nothing open" labels={days} series={[{ name: "Open", values: [0, 0, 0], color: "orange" }]} />,
    );
    expect(screen.getByText("Nothing open")).toBeTruthy();
    expect(screen.queryByRole("img")).toBeNull();
    rerender(
      <LineChart label="Open" emptyText="Nothing open" labels={["20 Nov"]} series={[{ name: "Open", values: [4], color: "orange" }]} />,
    );
    expect(screen.getByText("Nothing open")).toBeTruthy();
  });

  it("draw one bar as a bar, and a donut with its parts as numbers", async () => {
    render(
      <>
        <BarChart label="Hours" labels={["20 Nov"]} series={[{ name: "Hours", values: [2.5], color: "blue" }]} />
        <DonutChart
          label="By lane"
          centre="50%"
          slices={[
            { name: "To do", value: 2, color: "blue" },
            { name: "Done", value: 2, color: "green" },
          ]}
        />
      </>,
    );
    expect(await screen.findByRole("img", { name: "Hours" })).toBeTruthy();
    expect(
      within(screen.getByRole("table", { name: "By lane, as numbers" }))
        .getAllByRole("row")
        .map((row) => row.textContent),
    ).toEqual(["PartCount", "To do2", "Done2"]);
  });
});
