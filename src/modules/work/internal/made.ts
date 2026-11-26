import type { Moved, ToDo, Work } from "../types.ts";

/** What a step of moving makes: the work, and what is to be done about it. */
export interface Made {
  readonly work: Work;
  readonly todo: readonly ToDo[];
}

/** An event's key and time. Everything a to-do's key is made from. */
export interface Stamp {
  readonly key: string;
  readonly at: number;
}

export function moved(work: Work, todo: readonly ToDo[] = []): Moved {
  return { _tag: "Moved", work, todo };
}

export function madeMoved(made: Made): Moved {
  return moved(made.work, made.todo);
}

export function same(work: Work): Moved {
  return { _tag: "Same", work };
}

export function refuse(why: string): Moved {
  return { _tag: "Refused", why };
}

export function keyOf(e: Stamp, part: string): string {
  return `${e.key}:${part}`;
}
