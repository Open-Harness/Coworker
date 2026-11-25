import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayerProvider } from "@astryxdesign/core/Layer";
import { afterEach, describe, expect, it } from "vitest";
import { ChatGptDialog } from "./service.ts";

afterEach(cleanup);

const ADDRESS = "https://auth.openai.com/api/accounts/authorize?client_id=dynamic_agent_client&state=s";

describe("signing in to ChatGPT", () => {
  it("opens the whole address, or copies it for another browser, and sends back what the person pastes", async () => {
    const person = userEvent.setup();
    const pasted: string[] = [];
    render(
      <LayerProvider>
        <ChatGptDialog
          isOpen
          onClose={() => undefined}
          onStart={async () => ({ _tag: "Loaded", value: ADDRESS })}
          onFinish={async (address) => {
            pasted.push(address);
            return { _tag: "Loaded", value: true };
          }}
        />
      </LayerProvider>,
    );
    await person.click(await screen.findByRole("button", { name: "Get the sign-in page" }));
    expect((await screen.findByRole("link", { name: "Open the sign-in page" })).getAttribute("href")).toBe(ADDRESS);
    await person.click(screen.getByRole("button", { name: "Copy its address" }));
    expect(await navigator.clipboard.readText()).toBe(ADDRESS);
    await screen.findByRole("button", { name: "Copied" });
    await person.click(screen.getByRole("textbox"));
    await person.paste(" http://127.0.0.1:1455/auth/callback?code=c&state=s&client_id=oaiapp_1 ");
    await person.click(screen.getByRole("button", { name: "Finish" }));
    expect(pasted).toEqual(["http://127.0.0.1:1455/auth/callback?code=c&state=s&client_id=oaiapp_1"]);
  });
});
