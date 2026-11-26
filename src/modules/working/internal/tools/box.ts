import { type Call, object, said, text, type Tool, wrong, type Result } from "../tool.ts";

/* What an agent does in its box: files and commands in the clone of its work. */

const MOST = 12_000;
const field = (args: unknown, name: string): string | undefined =>
  typeof args === "object" && args !== null && typeof (args as Record<string, unknown>)[name] === "string"
    ? ((args as Record<string, string>)[name] ?? undefined)
    : undefined;

const cut = (words: string): string => (words.length <= MOST ? words : `${words.slice(0, MOST / 2)}\n[…cut…]\n${words.slice(-MOST / 2)}`);

const out = (why: string): Result => ({ _tag: "Waits", why });

async function bash({ c, work, id }: Call, args: unknown): Promise<Result> {
  const command = field(args, "command");
  if (command === undefined || command.trim() === "") return wrong("bash needs a command.");
  const ran = await c.boxes.run(work.id, id, command, 300);
  if ("_tag" in ran) return out(ran.why);
  const printed = [ran.stdout, ran.stderr === "" ? "" : `[stderr]\n${ran.stderr}`].filter((part) => part !== "").join("\n");
  return said(`${cut(printed)}${printed === "" ? "" : "\n"}[exit ${ran.exitCode}]`);
}

async function read({ c, work }: Call, args: unknown): Promise<Result> {
  const path = field(args, "path");
  if (path === undefined) return wrong("read needs a path.");
  const found = await c.boxes.read(work.id, path);
  return found === undefined ? wrong(`There is no file ${path} in the clone.`) : said(cut(found));
}

async function write({ c, work, id }: Call, args: unknown): Promise<Result> {
  const [path, content] = [field(args, "path"), field(args, "content")];
  if (path === undefined || content === undefined) return wrong("write needs a path and the content.");
  const refused = await c.boxes.put(work.id, id, path, content);
  if (refused !== undefined) return out(refused.why);
  return said(`Wrote ${path}.`);
}

async function edit({ c, work, id }: Call, args: unknown): Promise<Result> {
  const [path, was, becomes] = [field(args, "path"), field(args, "oldText"), field(args, "newText")];
  if (path === undefined || was === undefined || becomes === undefined)
    return wrong("edit needs a path, the text to replace and the text to put there.");
  const found = await c.boxes.read(work.id, path);
  if (found === undefined) return wrong(`There is no file ${path} in the clone.`);
  if (!found.includes(was)) return wrong(`${path} does not hold that text, so nothing was changed.`);
  const refused = await c.boxes.put(
    work.id,
    id,
    path,
    found.replace(was, () => becomes),
  );
  if (refused !== undefined) return out(refused.why);
  return said(`Changed ${path}.`);
}

export const BOX_TOOLS: readonly Tool[] = [
  {
    name: "bash",
    description: "Run a command in the clone of this work. Files stay from one command to the next.",
    parameters: object({ command: text("The command, for sh.") }, ["command"]),
    run: bash,
  },
  {
    name: "read",
    description: "Read a file of the clone.",
    parameters: object({ path: text("Where, from the root of the clone.") }, ["path"]),
    run: read,
  },
  {
    name: "write",
    description: "Write a file of the clone whole.",
    parameters: object({ path: text("Where."), content: text("All of the file.") }, ["path", "content"]),
    run: write,
  },
  {
    name: "edit",
    description: "Change part of a file of the clone.",
    parameters: object({ path: text("Where."), oldText: text("What is there now."), newText: text("What is to be there.") }, [
      "path",
      "oldText",
      "newText",
    ]),
    run: edit,
  },
];
