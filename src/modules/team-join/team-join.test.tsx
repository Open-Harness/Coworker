import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { BrowserProvider, createServer } from "~/modules/team-core/service.ts";
import { afterEach, describe, expect, it } from "vitest";
import { createJoinApi, InvitePage, LinkPage, Session, useMe } from "./service.ts";
import type { Invite, JoinApi, Who } from "./types.ts";

afterEach(cleanup);

const INVITE: Invite = {
  status: "open",
  email: "bo@acme.test",
  role: "builder",
  workspaceId: "w1",
  workspaceName: "Acme",
  address: "acme",
  invitedBy: "Ama Mensah",
};
const BO: Who = { name: "Bo", email: "bo@acme.test" };

/** Everything the pages asked the server for, in order. */
function world(who: Who | null, changes: Partial<JoinApi> = {}) {
  const asked: string[] = [];
  const went: string[] = [];
  const said = <T,>(line: string, value: T) => {
    asked.push(line);
    return Promise.resolve({ _tag: "Loaded" as const, value });
  };
  const api: JoinApi = {
    who: async () => ({ _tag: "Loaded", value: who }),
    ways: async () => ({ _tag: "Loaded", value: [] }),
    sendLink: (email, back) => said(`link ${email} ${back}`, true as const),
    signInWith: (way, back) => said(`${way} ${back}`, "https://provider.test/authorize"),
    linkAccount: (way) => said(`add ${way}`, "https://provider.test/authorize"),
    signOut: () => said("out", true as const),
    invite: async () => ({ _tag: "Loaded", value: INVITE }),
    acceptInvite: (id) => said(`accept ${id}`, "w1"),
    joinByLink: (id, secret) => said(`join ${id} ${secret}`, id),
    isMember: async () => ({ _tag: "Loaded", value: false }),
    askToJoin: (address) => said(`ask ${address}`, "asked" as const),
    addEmail: (email) => said(`add ${email}`, true as const),
    proveEmail: async () => ({ _tag: "Loaded", value: "bo@home.test" }),
    ...changes,
  };
  const open = (page: ReactNode, here = "/join/invite/i1", isOpen = true) =>
    render(
      <LayerProvider>
        <BrowserProvider browser={{ here: () => here, goTo: (url) => went.push(url), newId: () => "1" }}>
          <Session api={api} isOpen={isOpen}>
            {page}
          </Session>
        </BrowserProvider>
      </LayerProvider>,
    );
  return { asked, went, open };
}

const heading = (name: string) => screen.findByRole("heading", { level: 1, name });

describe("signing in", () => {
  const Inside = () => <>{useMe().name}</>;

  it("mails a link that comes back to the page, and takes a provider's page when there is one", async () => {
    const { asked, went, open } = world(null, { ways: async () => ({ _tag: "Loaded", value: ["google"] }) });
    open(<Inside />, "/ws/w1/inbox?a=1", false);
    await heading("Sign in or create an account");
    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "bo@acme.test");
    await userEvent.click(screen.getByRole("button", { name: "Email me a link" }));
    expect(await screen.findByText("We sent a link to bo@acme.test")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(screen.queryByRole("button", { name: "Continue with GitHub" })).toBeNull();
    expect(asked).toEqual(["link bo@acme.test /ws/w1/inbox?a=1", "google /ws/w1/inbox?a=1"]);
    expect(went).toEqual(["https://provider.test/authorize"]);
  });

  it("says a used link is used, and does not send the error back with the next one", async () => {
    const { asked, open } = world(null);
    open(<Inside />, "/ws?error=INVALID_TOKEN", false);
    expect(await screen.findByText("That sign-in link is used or out of date")).toBeTruthy();
    await userEvent.type(screen.getByRole("textbox", { name: "Email" }), "bo@acme.test");
    await userEvent.click(screen.getByRole("button", { name: "Email me a link" }));
    expect(asked).toEqual(["link bo@acme.test /ws"]);
  });

  it("shows the app to someone signed in", async () => {
    const { open } = world(BO);
    open(<Inside />, "/ws", false);
    expect(await screen.findByText("Bo")).toBeTruthy();
  });
});

describe("an emailed invite", () => {
  it("asks someone signed out for the invited address, and no other", async () => {
    const { asked, open } = world(null);
    open(<InvitePage inviteId="i1" />);
    await heading("Join Acme on Co-worker");
    expect(screen.getByRole("textbox", { name: "Email" }).hasAttribute("readonly")).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "Email me a link" }));
    expect(asked).toEqual(["link bo@acme.test /join/invite/i1"]);
  });

  it("joins with the invited address, then asks for other accounts", async () => {
    const { asked, open } = world(BO);
    open(<InvitePage inviteId="i1" />);
    expect(await screen.findByText("Ama Mensah invited you as a Builder.")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Join Acme" }));
    await heading("So managers know it's you");
    await userEvent.type(screen.getByRole("textbox", { name: "Another email address" }), "bo@home.test");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("We sent a link to bo@home.test")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Continue" }).getAttribute("href")).toBe("/ws/w1/inbox");
    expect(asked).toEqual(["accept i1", "add bo@home.test"]);
  });

  it("tells another account which address it is for, and lets it switch", async () => {
    const { asked, open } = world({ name: "Cy", email: "cy@else.test" });
    open(<InvitePage inviteId="i1" />);
    await heading("This invite is for bo@acme.test");
    expect(screen.queryByRole("button", { name: "Join Acme" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Switch account" }));
    await heading("Join Acme on Co-worker");
    expect(asked).toEqual(["out"]);
  });

  it.each([
    ["expired", "This invite has expired"],
    ["used", "This invite has been used"],
    ["withdrawn", "This invite was taken back"],
  ] as const)("says when it is %s, and offers to ask the Owners", async (status, title) => {
    const { asked, open } = world(BO, { invite: async () => ({ _tag: "Loaded", value: { ...INVITE, status } }) });
    open(<InvitePage inviteId="i1" />);
    await heading(title);
    await userEvent.click(await screen.findByRole("button", { name: "Ask to join Acme" }));
    expect(await screen.findByText("Request sent")).toBeTruthy();
    expect(asked).toEqual(["ask acme"]);
  });

  it("opens the workspace for whoever used it", async () => {
    const { open } = world(BO, {
      invite: async () => ({ _tag: "Loaded", value: { ...INVITE, status: "used" } }),
      isMember: async () => ({ _tag: "Loaded", value: true }),
    });
    open(<InvitePage inviteId="i1" />);
    expect((await screen.findByRole("link", { name: "Open Acme" })).getAttribute("href")).toBe("/ws/w1/inbox");
  });
});

describe("an invite link", () => {
  it("joins, or says the link is not good", async () => {
    const { asked, open } = world(BO);
    open(<LinkPage workspaceId="w1" secret="s1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Join" }));
    await heading("So managers know it's you");
    expect(asked).toEqual(["join w1 s1"]);
    cleanup();
    const closed = world(BO, { joinByLink: async () => ({ _tag: "Failed", message: "Link invalid" }) });
    closed.open(<LinkPage workspaceId="w1" secret="s1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Join" }));
    expect(await screen.findByText("You could not join")).toBeTruthy();
  });
});

describe("the API", () => {
  it("narrows who is signed in and what an invite is", async () => {
    const answers: Readonly<Record<string, unknown>> = {
      "/api/me": { person: { id: "email:bo@acme.test", name: "Bo" } },
      "/api/sign-in": { ways: ["google", "myspace"] },
      "/api/join/invite/i1": { invite: { ...INVITE, role: "king" } },
      "/api/join/invite/i2": { invite: { ...INVITE, status: "odd" } },
    };
    const api = createJoinApi(createServer(async (path) => Response.json(answers[path])));
    expect(await api.who()).toEqual({ _tag: "Loaded", value: BO });
    expect(await api.ways()).toEqual({ _tag: "Loaded", value: ["google"] });
    expect(await api.invite("i1")).toEqual({ _tag: "Loaded", value: { ...INVITE, role: "member" } });
    expect((await api.invite("i2"))._tag).toBe("Failed");
  });
});
