import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { createServer } from "~/modules/team-core/service.ts";
import { afterEach, describe, expect, it } from "vitest";
import { createSettingsApi, LinkedAccounts, SignIns } from "./service.ts";
import type { SignInData } from "./types.ts";

afterEach(cleanup);

const OK = { _tag: "Loaded", value: true } as const;
const HERE: SignInData = { id: "s1", token: "t1", device: "Chrome on macOS", at: 0, isThis: true };
const PHONE: SignInData = { id: "s2", token: "t2", device: "Safari on iOS", at: 0, isThis: false };

describe("where a person is signed in", () => {
  it("ends one sign-in or all the others, and never offers to end this one", async () => {
    const ended: string[] = [];
    render(
      <LayerProvider>
        <SignIns
          signIns={[HERE, PHONE]}
          onSignOut={async (token) => ended.push(token)}
          onSignOutElsewhere={async () => (ended.push("others"), OK)}
        />
      </LayerProvider>,
    );
    expect(screen.queryByRole("button", { name: "Sign out of Chrome on macOS" })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Sign out of Safari on iOS" }));
    await userEvent.click(screen.getByRole("button", { name: "Sign out everywhere else" }));
    expect(ended).toEqual(["t2"]);
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Sign out" }));
    expect(ended).toEqual(["t2", "others"]);
  });

  it("says which one this is, and names each by its browser", async () => {
    const agent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1";
    const answers: Readonly<Record<string, unknown>> = {
      "/api/auth/list-sessions": [
        { id: "s2", token: "t2", userAgent: agent, updatedAt: "2026-01-02T00:00:00Z" },
        { id: "s1", token: "t1", userAgent: null, updatedAt: "2026-01-01T00:00:00Z" },
      ],
      "/api/auth/get-session": { session: { id: "s1" } },
    };
    const api = createSettingsApi(createServer(async (input) => Response.json(answers[String(input)])));
    expect(await api.account.signIns()).toEqual({
      _tag: "Loaded",
      value: [
        { id: "s1", token: "t1", device: "A browser", at: Date.UTC(2026, 0, 1), isThis: true },
        { id: "s2", token: "t2", device: "Safari on iOS", at: Date.UTC(2026, 0, 2), isThis: false },
      ],
    });
  });
});

describe("linked accounts", () => {
  it("offers what is not connected yet, mails a proof to another address, and says why a connection failed", async () => {
    const mailed: string[] = [];
    render(
      <LayerProvider>
        <LinkedAccounts
          handles={[{ kind: "email", id: "ama@acme.test", proof: "signed_in" }]}
          offered={["github"]}
          onConnect={async () => ({ _tag: "Failed", message: "GitHub is not set up" })}
          onEmail={async (email) => (mailed.push(email), OK)}
        />
      </LayerProvider>,
    );
    expect(screen.getByText("ama@acme.test")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Connect Google" })).toBeNull();
    await userEvent.type(screen.getByLabelText("Another email address"), "ama@home.test");
    await userEvent.click(screen.getByRole("button", { name: "Add email" }));
    expect(mailed).toEqual(["ama@home.test"]);
    expect(await screen.findByText("We sent a link to ama@home.test")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Connect GitHub" }));
    expect(await screen.findByText("GitHub is not set up")).toBeTruthy();
  });
});
