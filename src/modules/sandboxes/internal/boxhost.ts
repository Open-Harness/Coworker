import { DurableObject } from "cloudflare:workers";
import type { BoxContainer, BoxResult, BoxRun } from "../types.ts";
import { runInBox } from "./box.ts";

/**
 * One container's Durable Object. Its name is the box's name; `run` starts its container and destroys it, so a name
 * used once is one container's whole life. Subclass it in the composition root and bind the subclass.
 */
export class BoxHost<Env = unknown> extends DurableObject<Env> {
  run(input: BoxRun): Promise<BoxResult> {
    const container = this.ctx.container;
    if (container === undefined)
      return Promise.resolve({ exitCode: 1, stdout: "", stderr: "", seconds: 1, platformError: "This object has no container" });
    return runInBox(container as BoxContainer, input, Date.now);
  }
}
