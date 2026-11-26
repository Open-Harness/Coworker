import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import type { Run } from "../modules/credentials/types.ts";

/** The terminal, the browser and the programs of `pnpm credentials`. Nothing here prints what is typed when hidden. */

const runWith = (argv: readonly string[], stdin: string | undefined, env: Readonly<Record<string, string>>): ReturnType<Run> =>
  new Promise((resolve) => {
    const [program = "", ...args] = argv;
    const child = spawn(program, args, {
      stdio: [stdin === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      env: { ...process.env, ...env },
    });
    const out = { stdout: "", stderr: "" };
    child.stdout?.on("data", (chunk: Buffer) => (out.stdout += chunk.toString()));
    child.stderr?.on("data", (chunk: Buffer) => (out.stderr += chunk.toString()));
    child.on("error", (error) => resolve({ code: 127, stdout: "", stderr: error.message }));
    child.on("close", (code) => resolve({ code: code ?? 1, ...out }));
    child.stdin?.on("error", () => undefined);
    child.stdin?.end(stdin);
  });

export const run: Run = (argv, stdin) => runWith(argv, stdin, {});

const NOT_SIGNED_IN = "Bitwarden's command-line tool is not signed in. Run `bw login` first (once), then this again.";

/**
 * A `run` whose `bw` is unlocked for this process only: `bw` itself asks for your master password, and the key it answers
 * with stays in memory. A BW_SESSION you already have is used instead.
 */
export async function unlocked(): Promise<Run> {
  const { status } = JSON.parse((await run(["bw", "status"])).stdout || "{}") as { readonly status?: string };
  if (status === "unlocked") return run;
  if (status !== "locked") {
    console.error(status === undefined ? "Bitwarden's command-line tool is missing. Run: brew install bitwarden-cli" : NOT_SIGNED_IN);
    process.exit(1);
  }
  if (!process.stdin.isTTY) {
    console.error("Run this in a terminal: Bitwarden asks for your master password there.");
    process.exit(1);
  }
  const asked = spawnSync("bw", ["unlock", "--raw"], { stdio: ["inherit", "pipe", "inherit"], encoding: "utf8" });
  const session = asked.stdout.trim();
  if (asked.status !== 0 || session === "") process.exit(1);
  return (argv, stdin) => runWith(argv, stdin, argv[0] === "bw" ? { BW_SESSION: session } : {});
}

export const open = (url: string): void => void spawnSync("open", [url]);

/** One line from the person. Hidden: the terminal shows nothing of it, and it is in no history. */
export function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const line = createInterface({ input: process.stdin, output: hidden ? undefined : process.stdout, terminal: true });
    if (hidden) process.stdout.write(question);
    const done = (answer: string): void => {
      line.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer);
    };
    line.on("SIGINT", () => process.exit(130));
    line.question(hidden ? "" : question, done);
  });
}

const page = (body: string): string =>
  `<!doctype html><meta charset="utf-8"><title>Co-worker</title><body style="font:16px system-ui;margin:3rem">${body}`;
const escaped = (text: string): string => text.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;").replace(/</gu, "&lt;");

const APP_WAIT_MS = 15 * 60_000;

/**
 * Serves one page on this computer that sends the manifest to GitHub, and waits for GitHub to send the browser back with
 * a code. `state` ties the answer to this page, so another site cannot hand in an App of its own.
 */
export function appCode(form: (returnTo: string) => Promise<{ action: string; manifest: string } | string>): Promise<string | undefined> {
  const state = randomBytes(16).toString("hex");
  return new Promise((resolve) => {
    const server = createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");
      response.setHeader("content-type", "text/html; charset=utf-8");
      if (url.pathname === "/made") {
        const code = url.searchParams.get("code");
        if (code === null || url.searchParams.get("state") !== state) return void response.writeHead(400).end(page("Not from this page."));
        response.end(page("Done. Go back to the terminal."));
        return finish(code);
      }
      if (url.pathname !== "/") return void response.writeHead(404).end();
      void form(`http://127.0.0.1:${port()}/made`).then((made) =>
        response.end(
          typeof made === "string"
            ? page(escaped(made))
            : page(
                `<form method="post" action="${escaped(made.action)}?state=${state}"><input type="hidden" name="manifest" value="${escaped(made.manifest)}"><button style="font:inherit;padding:.6rem 1.2rem">Create the App on GitHub</button></form>`,
              ),
        ),
      );
    });
    const port = (): number => {
      const at = server.address();
      return typeof at === "object" && at !== null ? at.port : 0;
    };
    const finish = (code: string | undefined): void => {
      clearTimeout(timer);
      server.close();
      server.closeIdleConnections();
      resolve(code);
    };
    const timer = setTimeout(() => finish(undefined), APP_WAIT_MS);
    server.listen(0, "127.0.0.1", () => open(`http://127.0.0.1:${port()}/`));
  });
}
