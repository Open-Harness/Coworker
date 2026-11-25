import { useState } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createServer } from "~/modules/team-core/service.ts";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { afterEach, describe, expect, it } from "vitest";
import { BoardScreen, ChatScreen, createTeamApi, InboxScreen, MissionScreen, NeedsYou } from "./service.ts";
import type { BoardData, ItemData, Reply, View } from "./types.ts";

const task = (id: string, title: string, lane: string, stage: BoardData["tasks"][number]["stage"], stageLabel: string) => ({
  id,
  title,
  description: "",
  lane,
  stage,
  stageLabel,
  createdBy: "Ama",
  createdAt: 1_700_000_000_000,
  runs: 0,
  values: { priority: "high" },
});

const BOARD: BoardData = {
  managerId: "m1",
  managerName: "Launch",
  address: "launch.acme@co-worker.tech",
  lanes: [
    { id: "todo", name: "To do", needsApproval: false },
    { id: "review", name: "Review", needsApproval: true },
  ],
  fields: [{ key: "priority", label: "Priority" }],
  defaultView: "kanban",
  tasks: [
    task("DT-1", "Write the changelog", "todo", "queued", "Queued"),
    task("DT-2", "Check the export", "review", "person.review", "Needs your review"),
  ],
};

function Switching({ board = BOARD }: { readonly board?: BoardData }) {
  const [view, setView] = useState<View>();
  return <BoardScreen board={board} {...(view === undefined ? {} : { view })} onView={setView} />;
}

afterEach(cleanup);

describe("the board", () => {
  it("shows the same tasks in every view", async () => {
    render(
      <LayerProvider>
        <Switching />
      </LayerProvider>,
    );
    expect(screen.getByText("2 tasks · 0 agents working · 1 needs you")).toBeTruthy();
    for (const view of ["Kanban", "List", "Console", "Inbox"]) {
      await userEvent.click(screen.getByRole("radio", { name: view }));
      expect(screen.getAllByText("Write the changelog").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Check the export").length).toBeGreaterThan(0);
    }
    expect(screen.getByText("Needs you · 1")).toBeTruthy();
  });

  it("says where a task waits only while it is open, in every view", async () => {
    const lanes = [...BOARD.lanes, { id: "done", name: "Done", needsApproval: false }];
    const tasks = [
      task("DT-3", "Shipped", "done", "queued", "Queued"),
      task("DT-4", "Asked about after", "done", "person.answer", "Needs your answer"),
    ];
    render(
      <LayerProvider>
        <Switching board={{ ...BOARD, lanes, tasks }} />
      </LayerProvider>,
    );
    for (const view of ["Kanban", "List", "Console", "Inbox"]) {
      await userEvent.click(screen.getByRole("radio", { name: view }));
      expect(screen.getAllByText("Shipped").length).toBeGreaterThan(0);
      expect(screen.queryByText(/Queued/u)).toBeNull();
      expect(screen.getAllByText(/Needs your answer/u).length).toBeGreaterThan(0);
    }
  });

  it("narrows what the server sends and leaves malformed tasks out", async () => {
    const body = {
      manager: { managerId: "m1", name: "Launch", address: "a@b" },
      board: {
        lanes: [{ id: "todo", name: "To do" }],
        fields: [],
        defaultView: "list",
        tasks: [{ id: "DT-1", stage: "idle", title: "Ok" }, { id: 4 }],
      },
    };
    const api = createTeamApi(createServer(async () => Response.json(body)));
    const loaded = await api.board("w1", "m1");
    expect(loaded._tag === "Loaded" && loaded.value.tasks.map(({ id }) => id)).toEqual(["DT-1"]);
    expect(loaded._tag === "Loaded" && loaded.value.defaultView).toBe("list");
    const refused = await createTeamApi(createServer(async () => Response.json({ error: "Not a member" }, { status: 404 }))).board(
      "w1",
      "m1",
    );
    expect(refused).toEqual({ _tag: "Failed", message: "Not a member" });
  });
});

const ITEM = {
  id: "question:m1:limit",
  kind: "question",
  managerId: "m1",
  managerName: "Launch",
  title: "Which limit?",
  options: ["150k", "None"],
  task: "DT-1",
  createdAt: 1_700_000_000_000,
  detail: {
    context: "A promise to customers.",
    facts: [{ text: "Exports time out.", source: { kind: "task", ref: "DT-1", title: "Export", sub: "To do" } }, { text: 7 }],
    choices: [
      { label: "150k", next: ["Docs say 150k"] },
      { label: "None", next: [] },
    ],
    recommend: { option: "150k", why: "It keeps the date." },
    links: [{ kind: "page", ref: "mission", title: "Launch", sub: "Mission" }, { kind: "nope" }],
  },
};

describe("the Needs you page", () => {
  it("shows the decision, what the manager knows, the options and the links, and sends a choice", async () => {
    const replies: Reply[] = [];
    const loaded = await createTeamApi(createServer(async () => Response.json({ item: ITEM }))).item("w1", ITEM.id);
    if (loaded._tag !== "Loaded") throw new Error(loaded.message);
    const item: ItemData = loaded.value;
    expect(item.facts).toHaveLength(1);
    expect(item.links).toHaveLength(1);
    render(
      <LayerProvider>
        <NeedsYou workspaceId="w1" item={item} onReply={async (reply) => void replies.push(reply)} />
      </LayerProvider>,
    );
    expect(screen.getByText("A promise to customers.")).toBeTruthy();
    expect(screen.getByText("Exports time out.")).toBeTruthy();
    expect(screen.getByText("Why the manager recommends A: It keeps the date.")).toBeTruthy();
    expect(screen.getByText("Docs say 150k")).toBeTruthy();
    expect(screen.getByText("Mission page · Mission")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Choose B" }));
    expect(replies).toEqual([{ choice: "None" }]);
  });

  it("asks an Owner about a request to join in two buttons, with no manager in it", async () => {
    const replies: Reply[] = [];
    const asked = {
      ...ITEM,
      kind: "approval",
      managerId: "",
      managerName: "Co-worker",
      options: ["Let them in", "Say no"],
      detail: {},
    };
    const loaded = await createTeamApi(createServer(async () => Response.json({ item: asked }))).item("w1", ITEM.id);
    if (loaded._tag !== "Loaded") throw new Error(loaded.message);
    render(
      <LayerProvider>
        <NeedsYou workspaceId="w1" item={loaded.value} onReply={async (reply) => void replies.push(reply)} />
      </LayerProvider>,
    );
    expect(screen.queryByText(/manager waits/u)).toBeNull();
    expect(screen.queryByRole("textbox")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Let them in" }));
    expect(replies).toEqual([{ choice: "Let them in" }]);
  });
});

describe("the Inbox", () => {
  const open = async (replies: Reply[]) => {
    const answered = { ...ITEM, id: "question:m1:day", title: "Which day?", answer: { text: "Monday", by: { name: "Ama" } } };
    const loaded = await createTeamApi(createServer(async () => Response.json({ items: [ITEM, answered] }))).inbox("w1");
    if (loaded._tag !== "Loaded") throw new Error(loaded.message);
    render(
      <LayerProvider>
        <InboxScreen workspaceId="w1" items={loaded.value} onReply={async (_id, reply) => void replies.push(reply)} />
      </LayerProvider>,
    );
  };

  it("lists what waits, opens the first in a reading pane, and leaves the answered under Done", async () => {
    await open([]);
    expect(screen.getByRole("button", { name: /Waiting on you/u })).toBeTruthy();
    expect(screen.getAllByText(/Which limit/u).length).toBeGreaterThan(1);
    expect(screen.queryByText("Which day?")).toBeNull();
    expect(screen.getByRole("link", { name: "Open as a page" }).getAttribute("href")).toBe("/ws/w1/inbox/question%3Am1%3Alimit");
    await userEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(screen.getAllByText("Which day?").length).toBeGreaterThan(0);
  });

  it("answers from the pane the way the Needs-you page does", async () => {
    const replies: Reply[] = [];
    await open(replies);
    await userEvent.click(screen.getByRole("button", { name: "Choose B" }));
    expect(replies).toEqual([{ choice: "None" }]);
  });
});

describe("a manager's chat", () => {
  it("shows what was said and done as turns, and sends what is written", async () => {
    const lines = [
      { id: "1", role: "person", text: "add a task: Ship it", author: { id: "p1", name: "Ama" } },
      { id: "2", role: "manager", text: "On it." },
      { id: "3", role: "action", text: 'task_create: {"task":"DT-1","title":"Ship it","lane":"todo"}' },
      { id: "4", role: "manager", text: "It is on the board." },
      { id: "5", role: "nobody", text: "left out" },
    ];
    const loaded = await createTeamApi(createServer(async () => Response.json(lines))).chat("w1", "m1");
    if (loaded._tag !== "Loaded") throw new Error(loaded.message);
    expect(loaded.value.map(({ id }) => id)).toEqual(["1", "2", "3", "4"]);
    const said: string[] = [];
    render(
      <LayerProvider>
        <ChatScreen managerName="Launch" address="launch@acme.test" lines={loaded.value} onSay={(text) => said.push(text)} />
      </LayerProvider>,
    );
    expect(screen.getAllByText("Launch").length).toBeGreaterThan(0);
    expect(screen.getByText("Task create")).toBeTruthy();
    expect(screen.getByText("DT-1 Ship it")).toBeTruthy();
    expect(screen.queryByText("left out")).toBeNull();
    await userEvent.type(screen.getByRole("textbox"), "  and tell Bo  {Enter}");
    expect(said).toEqual(["and tell Bo"]);
  });
});

describe("the mission", () => {
  it("opens on the mission, and says a page's title once", () => {
    const pages = [
      { id: "p1", parent: "mission", title: "Promises", body: "None yet.", updatedAt: 1_700_000_000_000, updatedBy: "Launch" },
      { id: "mission", title: "Launch", body: "# Launch\n\nShip it.", updatedAt: 1_700_000_000_000, updatedBy: "Ama" },
    ];
    render(
      <LayerProvider>
        <MissionScreen workspaceId="w1" managerId="m1" managerName="Launch" pages={pages} />
      </LayerProvider>,
    );
    expect(screen.getByText("Ship it.")).toBeTruthy();
    expect(screen.getAllByRole("heading", { name: "Launch" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Promises/u }).getAttribute("href")).toBe("/ws/w1/m/m1/mission?page=p1");
  });
});
