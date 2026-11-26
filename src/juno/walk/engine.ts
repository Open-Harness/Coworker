import type { WalkStep } from "~/modules/doings/types.ts";
import { bring, dialogOpen, fill, findControl, press, usable } from "./controls.ts";

/* What the co-worker does in front of a person: each step said first, then done; it stops before what is the person's, and stops at once when told. */

export type Mode = "playing" | "yours" | "stopped" | "done";

/** What is shown of it now: what it says, where it is, and how far on. */
export interface Shown {
  readonly mode: Mode;
  readonly n: number;
  readonly of: number;
  readonly say: string;
  readonly target: HTMLElement | null;
}

/** What it is given: the page to look at and go to, and where to tell what it shows. */
export interface Hands {
  readonly root: () => ParentNode | null;
  readonly here: () => string;
  readonly go: (path: string) => void;
  readonly shows: (shown: Shown | null) => void;
}

export interface Walk {
  readonly start: (steps: readonly WalkStep[]) => void;
  readonly stop: () => void;
  readonly skip: () => void;
  readonly close: () => void;
}

const POLL = 40;
const LOOK = 3000;
const STOPPED = "Stopped. I press nothing more, and nothing was saved.";

/** How long a step stays: time to see it and to read what is said. */
const dwellOf = (step: WalkStep): number => Math.max(1800, step.say.length * 42 + (step.does === "fill" ? 700 : 0));

export function createWalk(hands: Hands): Walk {
  let token = 0;
  let steps: readonly WalkStep[] = [];
  let at = 0;
  let acted = -1;
  let target: HTMLElement | null = null;

  const sleep = (ms: number, mine: number): Promise<boolean> => new Promise((resolve) => setTimeout(() => resolve(mine === token), ms));
  const show = (mode: Mode, say: string): void => hands.shows({ mode, n: at, of: steps.length, say, target });

  /** The control of this name, looked for until it is there: a form takes a moment to open. */
  async function control(name: string, mine: number): Promise<HTMLElement | null> {
    for (let spent = 0; spent <= LOOK; spent += POLL) {
      const root = hands.root();
      const found = root === null ? null : findControl(root, name);
      if (found !== null) return found;
      if (!(await sleep(POLL, mine))) return null;
    }
    return null;
  }

  /** Before it says it stops: what it did is over, so that the person is left with the page as it is. */
  async function calm(held: HTMLElement | null, mine: number): Promise<void> {
    for (let spent = 0; spent <= 2000; spent += POLL) {
      const root = hands.root();
      const dialog = root === null ? null : dialogOpen(root);
      if ((dialog === null || (held !== null && dialog.contains(held))) && (held === null || usable(held))) return;
      if (!(await sleep(POLL, mine))) return;
    }
  }

  async function type(into: HTMLElement, value: string, ms: number, mine: number): Promise<boolean> {
    const parts = Math.max(1, Math.min(value.length, Math.floor(ms / 60)));
    for (let part = 1; part <= parts; part += 1) {
      fill(into, value.slice(0, Math.max(1, Math.ceil((value.length * part) / parts))));
      if (!(await sleep(ms / parts, mine))) return false;
    }
    return true;
  }

  /** One step: said first, then the pointer goes to its control, then it is done. `quick` is for what is skipped. */
  async function stepOn(n: number, quick: boolean, mine: number): Promise<boolean> {
    const step = steps[n];
    if (step === undefined) return false;
    const dwell = quick ? 0 : dwellOf(step);
    at = n;
    show(step.yours ? "yours" : "playing", step.say);
    if (step.does === "go" && hands.here() !== step.at.page) {
      hands.go(step.at.page);
      if (!(await sleep(POLL, mine))) return false;
    }
    const found = step.at.press === null ? null : await control(step.at.press, mine);
    if (mine !== token) return false;
    target = found ?? target;
    if (found !== null) bring(found);
    if (step.yours) {
      await calm(found, mine);
      if (mine !== token) return false;
      show("yours", step.say);
      return false;
    }
    show("playing", step.say);
    if (step.does === "fill" && found !== null && step.value !== undefined) {
      if (!(await sleep(dwell * 0.15, mine))) return false;
      if (!(await type(found, step.value, quick ? 0 : dwell * 0.55, mine))) return false;
      acted = n;
      return quick || (await sleep(dwell * 0.3, mine));
    }
    if (!(await sleep(dwell * 0.55, mine))) return false;
    if (step.does === "press" && found !== null && acted < n) press(found);
    acted = n;
    return quick || (await sleep(dwell * 0.45, mine));
  }

  async function play(from: number, quick: boolean): Promise<void> {
    const mine = ++token;
    for (let n = from; n < steps.length; n += 1) if (!(await stepOn(n, quick, mine))) return;
  }

  return {
    start: (given) => {
      steps = given;
      acted = -1;
      target = null;
      at = 0;
      void play(0, false);
    },
    stop: () => {
      token += 1;
      target = null;
      show("stopped", STOPPED);
    },
    skip: () => void play(acted + 1, true),
    close: () => {
      token += 1;
      target = null;
      hands.shows(null);
    },
  };
}
