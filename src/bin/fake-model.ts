/**
 * The entry of the `coworker-fake-model` Worker (`wrangler.fake-model.jsonc`): a scripted OpenAI-compatible endpoint for the
 * staging test workspace. The composition root of this executable: it reads its one setting and hands requests on.
 */
import { fakeModel } from "../modules/fake-model/service.ts";

interface Env {
  /** Optional: the bearer key the endpoint accepts. Set with `wrangler secret put FAKE_MODEL_KEY`. */
  readonly FAKE_MODEL_KEY?: string;
}

export default {
  fetch: (request: Request, env: Env): Promise<Response> => fakeModel.handle(request, { key: env.FAKE_MODEL_KEY }),
};
