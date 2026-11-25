import { compile, type Validator } from "@earendil-works/pi-schema";
import { directoryCommand, workspaceCommand } from "./internal/commands.ts";
import { directoryEvent, workspaceEvent } from "./internal/events.ts";
import type { DirectoryCommand, DirectoryEvent, Parsed, WorkspaceCommand, WorkspaceEvent } from "./types.ts";

export { FrameJoiner, splitFrame } from "./internal/frames.ts";
export { LIMITS } from "./internal/limits.ts";
export { decodePerson, encodePerson, MAX_NAME_CHARACTERS, normalizeName, PERSON_HEADER, personOf } from "./internal/person.ts";

/** Raised when a client and a server of different versions can no longer talk. Clients ask for a reload. */
export const PROTOCOL_VERSION = 2;

const directoryCommands = compile(directoryCommand);
const workspaceCommands = compile(workspaceCommand);
const directoryEvents = compile(directoryEvent);
const workspaceEvents = compile(workspaceEvent);

function parse<T>(validator: Validator<T>, text: string): Parsed<T> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, message: "The message is not JSON" };
  }
  if (validator.check(value)) return { ok: true, value };
  const error = validator.errors(value)[0];
  return { ok: false, message: `The message is invalid${error === undefined ? "" : `: ${error.path} ${error.message}`}` };
}

export const parseDirectoryCommand = (text: string): Parsed<DirectoryCommand> => parse(directoryCommands, text);
export const parseWorkspaceCommand = (text: string): Parsed<WorkspaceCommand> => parse(workspaceCommands, text);
export const parseDirectoryEvent = (text: string): Parsed<DirectoryEvent> => parse(directoryEvents, text);
export const parseWorkspaceEvent = (text: string): Parsed<WorkspaceEvent> => parse(workspaceEvents, text);

/** A UUID. `crypto.randomUUID` needs HTTPS in browsers; this also works on a plain tailnet address. */
export function newId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}
