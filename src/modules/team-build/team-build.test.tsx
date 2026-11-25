import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "~/modules/team-core/service.ts";
import { createBuildApi, Events, ManagerSettings } from "./service.ts";
import { basics, type Call, mgr, show, world, ws } from "./testing.tsx";

afterEach(cleanup);

const POLICY = { acceptMode: "off", allowed: [], admission: {}, bots: [] };
const SETTINGS_PAGES = {
  [`GET ${mgr("/policy")}`]: { policy: POLICY },
  [`GET ${ws("/people")}`]: { people: [] },
  [`GET ${mgr("/github")}`]: { github: { sources: [] } },
};

const whoMayAsk = () => <ManagerSettings workspaceId="w1" managerId="m1" section="who-may-ask" />;

describe("who may ask", () => {
  it("saves the whole policy with the accept mode that was picked, and says it is saved", async () => {
    const app = world({
      ...basics(),
      ...SETTINGS_PAGES,
      [`PUT ${mgr("/policy")}`]: ({ body }: Call) => ({ policy: body }),
    });
    render(show(whoMayAsk(), app.send));
    await userEvent.click(await screen.findByRole("radio", { name: /Observe/u }));
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Save who may ask" }));
    expect(await screen.findByText("Saved")).toBeTruthy();
    expect(app.called("PUT", mgr("/policy"))[0]?.body).toEqual({ ...POLICY, acceptMode: "observe" });
  });

  it("shows the server's own words when a save is refused, and keeps the edit", async () => {
    const app = world({
      ...basics(),
      ...SETTINGS_PAGES,
      [`PUT ${mgr("/policy")}`]: { status: 403, json: { error: "Your role cannot change who may ask" } },
    });
    render(show(whoMayAsk(), app.send));
    await userEvent.click(await screen.findByRole("radio", { name: /Auto/u }));
    await userEvent.click(screen.getByRole("button", { name: "Save who may ask" }));
    expect(await screen.findByText("Your role cannot change who may ask")).toBeTruthy();
    expect(screen.getByText("Unsaved changes")).toBeTruthy();
  });

  it("lets a member read it and nothing more", async () => {
    const app = world({ ...basics("member"), ...SETTINGS_PAGES });
    render(show(whoMayAsk(), app.send));
    expect(await screen.findByText("Only Owners and Builders change this. You can read it.")).toBeTruthy();
    expect((screen.getByRole("radio", { name: /Observe/u }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole("button", { name: "Save who may ask" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Add someone" })).toBeNull();
  });

  it("offers to ask again when the policy did not load", async () => {
    let answers = 0;
    const app = world({
      ...basics(),
      ...SETTINGS_PAGES,
      [`GET ${mgr("/policy")}`]: () => (answers++ === 0 ? { status: 500, json: { error: "The database is busy" } } : { policy: POLICY }),
    });
    render(show(whoMayAsk(), app.send));
    expect(await screen.findByText("The database is busy")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("radio", { name: /Observe/u })).toBeTruthy();
  });
});

describe("a manager's board settings", () => {
  const board = (extra: Record<string, unknown> = {}) => world({ ...basics(), ...extra });

  it("renames a lane through the same action the manager's tool is, with a request id", async () => {
    const app = board({ [`POST ${mgr("/actions/lane.update")}`]: { _tag: "Done", value: {} } });
    render(show(<ManagerSettings workspaceId="w1" managerId="m1" section="board" />, app.send));
    await userEvent.click(await screen.findByRole("button", { name: "Edit To do" }));
    const name = screen.getByRole("textbox", { name: /Name/u });
    await userEvent.clear(name);
    await userEvent.type(name, "Backlog");
    await userEvent.click(screen.getByRole("button", { name: "Save lane" }));
    expect(await screen.findByText("Saved")).toBeTruthy();
    expect(app.called("POST", mgr("/actions/lane.update"))[0]?.body).toEqual({
      input: { lane: "todo", name: "Backlog", meaning: "Not started", needsApproval: false, limit: null },
      requestId: "id-1",
    });
  });

  it("says a change waits for an Owner when its action is set to ask", async () => {
    const app = board({
      [`POST ${mgr("/actions/field.delete")}`]: {
        status: 202,
        json: { _tag: "Ask", sentence: "Launch deletes the field Priority", waiting: true },
      },
    });
    render(show(<ManagerSettings workspaceId="w1" managerId="m1" section="board" />, app.send));
    await userEvent.click(await screen.findByRole("button", { name: "Edit Priority" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete this field" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Delete field" }).at(-1) as HTMLElement);
    expect(await screen.findByText("Waiting for an Owner")).toBeTruthy();
    expect(screen.getByText(/Launch deletes the field Priority/u)).toBeTruthy();
  });

  it("shows why the server refused to delete a lane that still has tasks", async () => {
    const app = board({
      [`POST ${mgr("/actions/lane.delete")}`]: { status: 409, json: { _tag: "Failed", message: "To do still holds 2 tasks" } },
    });
    render(show(<ManagerSettings workspaceId="w1" managerId="m1" section="board" />, app.send));
    await userEvent.click(await screen.findByRole("button", { name: "Edit To do" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete this lane" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Delete lane" }).at(-1) as HTMLElement);
    expect((await screen.findAllByText("To do still holds 2 tasks")).length).toBeGreaterThan(0);
  });
});

describe("events", () => {
  it("says what each line became: a follow-up on a task, a candidate, or why it was ignored", async () => {
    const app = world({
      ...basics(),
      [`GET ${mgr("/events")}`]: {
        events: [
          { at: 3_000, line: "email from dana: “Re: export docs” → follow-up on DT-14" },
          {
            at: 2_500,
            line: "email from eve: “Export the usage report” → explicit candidate",
            decision: { kind: "accept", task: "DT-20" },
          },
          { at: 2_000, line: "github from priya-s: “Stream CSV rows” → explicit candidate" },
          {
            at: 1_500,
            line: "github from priya-s: “Rename the repo” → inferred candidate",
            decision: { kind: "ignore", reason: "Nobody asked for it", wouldAccept: true },
          },
          { at: 1_000, line: "github from a contributor: “Typo on pricing page” → ignored: not on the list" },
        ],
      },
    });
    // A window with room for the details beside the list.
    (window as unknown as { readonly happyDOM: { setViewport: (size: { width: number }) => void } }).happyDOM.setViewport({ width: 1440 });
    render(show(<Events workspaceId="w1" managerId="m1" />, app.send));
    const list = async (name: string) => within(await screen.findByRole("list", { name }));
    expect((await list("Not admitted")).getByText(/not on the list/u)).toBeTruthy();
    expect((await list("Accepted")).getByText(/Task DT-20/u)).toBeTruthy();

    // The top row is open beside the list; another one takes its place.
    const beside = within(screen.getByRole("complementary", { name: "Event" }));
    expect(beside.getByRole("heading", { name: "Stream CSV rows" })).toBeTruthy();
    expect(beside.getByText("The manager has not decided yet.")).toBeTruthy();
    const open = async (group: string) => userEvent.click((await list(group)).getAllByRole("button")[0] as HTMLElement);
    await open("Follow-ups");
    expect(beside.getByRole("link", { name: "Open DT-14" })).toBeTruthy();
    await open("Accepted");
    expect(beside.getByRole("link", { name: "Open DT-20" })).toBeTruthy();
    expect(beside.getByText(/The manager made it task DT-20/u)).toBeTruthy();
    await open("Would accept");
    expect(beside.getByText(/The manager ignored it: Nobody asked for it\. It would have taken it in Auto mode/u)).toBeTruthy();
    await open("Not admitted");
    expect(beside.getByText(/Ignored by the Gate: not on the list/u)).toBeTruthy();

    await userEvent.click(screen.getByRole("radio", { name: "Would accept" }));
    expect(screen.queryByText(/Stream CSV rows/u)).toBeNull();
    expect(screen.queryByText(/Export the usage report/u)).toBeNull();
    expect(screen.getByText(/Rename the repo/u)).toBeTruthy();
    await userEvent.click(screen.getByRole("radio", { name: "All" }));
    expect(screen.getByText(/Export the usage report/u)).toBeTruthy();
  });
});

describe("what the server sends", () => {
  it("leaves out whatever it cannot read instead of showing it wrong", async () => {
    const app = world({
      [`GET ${mgr("/policy")}`]: {
        policy: {
          acceptMode: "sometimes",
          allowed: [{ kind: "domain", domain: "acme.com" }, { kind: "mystery" }, 4],
          admission: { mailbox: "explicit", other: "maybe" },
          bots: [{ kind: "github" }],
        },
      },
    });
    const api = createBuildApi(createServer(app.send));
    expect(await api.policy("w1", "m1")).toEqual({
      _tag: "Loaded",
      value: { acceptMode: "off", allowed: [{ kind: "domain", domain: "acme.com" }], admission: { mailbox: "explicit" }, bots: [] },
    });
  });
});
