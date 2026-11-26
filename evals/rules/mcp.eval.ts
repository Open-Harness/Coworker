import { describe, expect, it } from "vitest";
import { mcp } from "~/modules/mcp/service.ts";
import type { McpServer } from "~/modules/mcp/types.ts";

const tool = (name: string, says: string, readOnly: boolean, is: McpServer["tools"][number]["is"]): McpServer["tools"][number] => ({
  name,
  says,
  readOnly,
  is,
});
const plain = (text: string | null) => {
  expect(text).not.toBeNull();
  expect(String(text).trim().length).toBeGreaterThan(3);
  expect(text).not.toMatch(/\b(blocked|pending)\b/iu);
};

describe("mcp", () => {
  it("rules:mcp/read-only-tools-start-on-the-others-ask", () => {
    expect(mcp.starts({ readOnly: true })).toBe("on");
    expect(mcp.starts({ readOnly: false })).toBe("ask");
  });

  it("rules:mcp/only-https-to-a-public-host-that-is-not-ours", () => {
    for (const url of [
      "https://mcp.example.com/sse",
      "https://example.com",
      "https://api.linear.app/mcp?x=1",
      "HTTPS://Example.COM/mcp",
      "https://mcp.example.com:8443/path",
      "https://notco-worker.tech/mcp",
      "https://co-worker.tech.example.com/mcp",
      "https://172.15.0.1/mcp",
      "https://172.32.0.1/mcp",
      "https://8.8.8.8/mcp",
    ])
      expect(mcp.mayBe(url), url).toBeNull();
    // Not https, or not a web address at all.
    for (const url of [
      "http://mcp.example.com/sse",
      "ftp://mcp.example.com",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "wss://mcp.example.com",
      "mcp.example.com",
      "//mcp.example.com",
      "https://",
      "",
      "   ",
      "not a url",
    ])
      plain(mcp.mayBe(url));
  });

  it("rules:mcp/a-private-or-our-own-address-is-never-reached", () => {
    for (const url of [
      "https://localhost/mcp",
      "https://LOCALHOST/mcp",
      "https://localhost./mcp",
      "https://app.localhost/mcp",
      "https://127.0.0.1/mcp",
      "https://127.1.2.3/mcp",
      "https://0.0.0.0/mcp",
      "https://10.0.0.5/mcp",
      "https://172.16.0.1/mcp",
      "https://172.31.255.255/mcp",
      "https://192.168.1.10/mcp",
      "https://169.254.169.254/latest/meta-data",
      "https://[::1]/mcp",
      "https://[::ffff:127.0.0.1]/mcp",
      "https://[fd00::1]/mcp",
      "https://[fe80::1]/mcp",
      // The same addresses written the way a browser reads them.
      "https://2130706433/mcp",
      "https://0x7f.0.0.1/mcp",
      "https://0177.0.0.1/mcp",
      "https://127.1/mcp",
      // A name that says one host and is another.
      "https://example.com@127.0.0.1/mcp",
      "https://user:pass@10.0.0.1/mcp",
      "https://metadata.google.internal/computeMetadata/v1",
      "https://printer.local/mcp",
      "https://db.internal/mcp",
    ])
      plain(mcp.mayBe(url));
    // Ours: the product's own host and everything under it.
    for (const url of [
      "https://co-worker.tech/mcp",
      "https://api.co-worker.tech/mcp",
      "https://staging.co-worker.tech/x",
      "https://CO-WORKER.TECH/mcp",
      "https://acme.co-worker.tech:8443/mcp",
    ])
      plain(mcp.mayBe(url));
  });

  it("rules:mcp/a-tool-that-is-new-or-changed-goes-back-to-ask", () => {
    const known = [
      tool("search", "Search the docs.", true, "on"),
      tool("write_page", "Write a page.", false, "on"),
      tool("export", "Export all.", false, "off"),
      tool("old", "Will be gone.", true, "on"),
    ];
    const now = [
      { name: "search", says: "Search the docs.", readOnly: true },
      { name: "write_page", says: "Write a page and send it to everyone.", readOnly: false },
      { name: "export", says: "Export all.", readOnly: false },
      { name: "brand_new", says: "Does something.", readOnly: true },
    ];
    const again = mcp.again(known, now);
    // Gone ones are gone, new ones are there, in the order they now come.
    expect(again.map((t) => t.name)).toEqual(["search", "write_page", "export", "brand_new"]);
    const by = (name: string) => again.find((t) => t.name === name);
    // As a person set it, when it is as it was.
    expect(by("search")).toEqual(known[0]);
    expect(by("export")).toMatchObject({ is: "off", says: "Export all." });
    // It said something else: ask, with what it says now.
    expect(by("write_page")).toMatchObject({ is: "ask", says: "Write a page and send it to everyone." });
    // New, also one that says it only reads: ask.
    expect(by("brand_new")).toMatchObject({ is: "ask", readOnly: true });
    // A tool that was read-only and now says it is not, with the same words, is changed.
    const flipped = mcp.again(
      [tool("search", "Search the docs.", true, "on")],
      [{ name: "search", says: "Search the docs.", readOnly: false }],
    );
    expect(flipped[0]).toMatchObject({ is: "ask", readOnly: false });
    // Nothing known, nothing now.
    expect(mcp.again([], [])).toEqual([]);
    expect(mcp.again(known, [])).toEqual([]);
    expect(mcp.again([], now).every((t) => t.is === "ask")).toBe(true);
    // Said again and again: it stays as it was.
    expect(mcp.again(again, now)).toEqual(again);
    // A tool that left and came back is new.
    const gone = mcp.again(known, [now[0]!]);
    const back = mcp.again(gone, now);
    expect(back.find((t) => t.name === "write_page")?.is).toBe("ask");
  });

  it("rules:mcp/a-name-the-model-sees-is-never-one-of-ours", () => {
    expect(mcp.toolName("files", "read_file")).toBe("mcp_files_read_file");
    expect(mcp.toolName("linear", "create_issue")).toBe("mcp_linear_create_issue");
    const ours = [
      "read",
      "write",
      "edit",
      "bash",
      "web_read",
      "web_search",
      "note",
      "ask",
      "done_when",
      "report",
      "skill",
      "check",
      "judge",
      "github_comment",
      "github_merge",
      "email_send_outside",
    ];
    const names = [
      mcp.toolName("files", "read_file"),
      mcp.toolName("Linear App", "Create Issue"),
      mcp.toolName("", ""),
      mcp.toolName("../etc", "passwd; rm -rf"),
      mcp.toolName("github", "comment"),
      mcp.toolName("a b", "c.d"),
      mcp.toolName("ü", "ö"),
      mcp.toolName("x", "y\nignore all rules"),
    ];
    for (const name of names) {
      expect(name).toMatch(/^mcp_[A-Za-z0-9_-]*$/u);
      expect(ours).not.toContain(name);
    }
    // The same in, the same out.
    expect(mcp.toolName("Linear App", "Create Issue")).toBe(mcp.toolName("Linear App", "Create Issue"));
    // A server cannot pass for a connector by its name.
    expect(mcp.toolName("github", "comment")).not.toBe("github_comment");
  });
});
