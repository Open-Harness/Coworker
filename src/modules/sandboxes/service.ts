import { dropRunImage, inTurn, keepRunImage, runImage } from "./internal/run-files.ts";
import { splitSetup, withSecrets } from "./internal/secrets.ts";
import {
  assignAgent,
  buildOf,
  environmentById,
  environmentOf,
  listEnvironments,
  recordUse,
  usedSince,
  writeBuild,
  writeEnvironment,
} from "./internal/store.ts";
import { deleteEnvironment, usedByDay, usedByManager } from "./internal/usage.ts";
import {
  PLAIN,
  SIZES,
  type CommandRequest,
  type Env,
  type Environment,
  type ExecOutcome,
  type Prepared,
  type SandboxesDependencies,
  type Sandboxes,
  type SaveEnvironment,
  type SaveResult,
  type TestOutcome,
} from "./types.ts";

export { SANDBOX_MIGRATIONS } from "./internal/store.ts";
export { RUN_FILES_MIGRATIONS } from "./internal/run-files.ts";
export { noContainers } from "./internal/host.ts";
export { cloudflareContainers } from "./internal/cloudflare.ts";
export { BoxHost } from "./internal/boxhost.ts";
export { runInBox } from "./internal/box.ts";

const MAX_SETUP = 20_000;
const FILES_LOST = "\n(This run's earlier files have expired. This command started from the environment's setup.)";

function save(dependencies: SandboxesDependencies, input: SaveEnvironment): SaveResult {
  const name = input.name.trim();
  if (name === "" || name.length > 80) return { _tag: "Invalid", reason: "An environment needs a name of at most 80 characters" };
  if (input.setup.length > MAX_SETUP) return { _tag: "Invalid", reason: `A setup script is at most ${MAX_SETUP} characters` };
  if (!SIZES.includes(input.size)) return { _tag: "Invalid", reason: `The size is one of ${SIZES.join(", ")}` };
  const { sql, ids, clock } = dependencies;
  const before = input.id === undefined ? undefined : environmentById(sql, input.id);
  if (input.id !== undefined && before === undefined) return { _tag: "NoSuchEnvironment" };
  const changed = before === undefined || before.setup !== input.setup || before.size !== input.size;
  const environment: Environment = {
    id: before?.id ?? ids.next("env"),
    name,
    setup: input.setup,
    size: input.size,
    version: (before?.version ?? 0) + (changed ? 1 : 0),
    updatedAt: clock.now(),
  };
  writeEnvironment(sql, environment);
  return { _tag: "Saved", environment };
}

/** The environment's image for its current version: made once, by the first command that needs it. */
async function imageFor(
  dependencies: SandboxesDependencies,
  environment: Environment,
  request: CommandRequest,
  script: string,
  env: Env,
  redact: (text: string) => string,
  onUsed: (seconds: number) => void,
  again = false,
): Promise<Prepared> {
  const { sql, host, building, clock } = dependencies;
  // `again`: the kept setup expired, so it runs once more whatever was kept.
  const built = again ? undefined : buildOf(sql, environment);
  if (built?.status === "Ready") return { _tag: "Prepared", image: built.image, seconds: 0 };
  // The plain container has no setup to correct, so a failure of it is not kept: the next command tries again.
  if (built?.status === "Failed" && environment.id !== PLAIN.id) return { _tag: "SetupFailed", output: built.output, seconds: 0 };
  const key = `${environment.id}:${environment.version}`;
  const inFlight = building.get(key);
  if (inFlight !== undefined) return inFlight;
  const preparing = host.prepare({ key, script, size: environment.size, env }).then((prepared) => {
    building.delete(key);
    if (prepared._tag === "Unavailable") return prepared;
    const at = clock.now();
    recordUse(sql, { at, seconds: prepared.seconds, environment: environment.id, managerId: request.managerId, run: request.run });
    onUsed(prepared.seconds);
    const safe: Prepared = prepared._tag === "SetupFailed" ? { ...prepared, output: redact(prepared.output) } : prepared;
    writeBuild(
      sql,
      environment,
      safe._tag === "Prepared" ? { status: "Ready", image: safe.image } : { status: "Failed", output: safe.output },
    );
    return safe;
  });
  building.set(key, preparing);
  return preparing;
}

/** What `extra` (a token made for one command) is hidden as in output, as a vault secret is. */
const hideExtra = (redact: (text: string) => string, extra: Env) => (text: string) =>
  Object.entries(extra).reduce(
    (hidden, [name, value]) => (value === "" ? hidden : hidden.split(value).join(`[secret ${name}]`)),
    redact(text),
  );

async function exec(
  dependencies: SandboxesDependencies,
  request: CommandRequest,
  extra: Env,
  onUsed: (seconds: number) => void,
): Promise<ExecOutcome> {
  const { sql, host, secrets, clock } = dependencies;
  const environment =
    request.environment === undefined
      ? (environmentOf(sql, request.agent) ?? PLAIN)
      : request.environment === null
        ? PLAIN
        : environmentById(sql, request.environment);
  if (environment === undefined) return { _tag: "NoEnvironment", agent: request.agent };
  const { script, refs } = splitSetup(environment.setup);
  const done = await withSecrets(secrets, refs, async (env, vaultRedact): Promise<ExecOutcome> => {
    const redact = hideExtra(vaultRedact, extra);
    const command = { command: request.command, env: { ...extra, ...env } };
    // The run's own files first, then the environment's setup, then the setup run once more if what was kept has expired.
    const left = runImage(sql, request, environment.id);
    let ran = left === undefined ? undefined : await host.exec({ ...command, image: left });
    const isLost = ran?._tag === "Unavailable" && ran.expired === true;
    if (isLost) dropRunImage(sql, request);
    for (const again of [false, true]) {
      if (ran !== undefined && !(ran._tag === "Unavailable" && ran.expired === true)) break;
      const image = await imageFor(dependencies, environment, request, script, env, redact, onUsed, again);
      if (image._tag === "Unavailable") return image;
      if (image._tag === "SetupFailed") return { _tag: "SetupFailed", output: image.output };
      ran = await host.exec({ ...command, image: image.image });
    }
    if (ran === undefined || ran._tag === "Unavailable") return ran ?? { _tag: "Unavailable", reason: "Nothing ran" };
    const { seconds } = ran.output;
    const at = clock.now();
    recordUse(sql, { at, seconds, environment: environment.id, managerId: request.managerId, run: request.run });
    onUsed(seconds);
    if (ran.kept !== undefined) keepRunImage(sql, request, environment.id, ran.kept, at);
    const stderr = `${redact(ran.output.stderr)}${isLost ? FILES_LOST : ""}`;
    return { _tag: "Ran", environment: environment.name, output: { ...ran.output, stdout: redact(ran.output.stdout), stderr } };
  });
  return done._tag === "Used" ? done.value : done;
}

/** The setup, run again now, and kept as the image of the environment's current version, ready or failed. */
async function testStart(dependencies: SandboxesDependencies, id: string): Promise<TestOutcome> {
  const { sql, host, secrets, clock } = dependencies;
  const environment = environmentById(sql, id);
  if (environment === undefined) return { _tag: "NoSuchEnvironment" };
  const { script, refs } = splitSetup(environment.setup);
  const done = await withSecrets(secrets, refs, async (env, redact): Promise<TestOutcome> => {
    const at = clock.now();
    const prepared = await host.prepare({
      key: `${environment.id}:${environment.version}:test-${at}`,
      script,
      size: environment.size,
      env,
    });
    if (prepared._tag === "Unavailable") return prepared;
    recordUse(sql, { at, seconds: prepared.seconds, environment: environment.id, managerId: "", run: "test" });
    if (prepared._tag === "SetupFailed") {
      const output = redact(prepared.output);
      writeBuild(sql, environment, { status: "Failed", output });
      return { _tag: "Tested", ready: false, output, seconds: prepared.seconds };
    }
    writeBuild(sql, environment, { status: "Ready", image: prepared.image });
    return { _tag: "Tested", ready: true, output: "", seconds: prepared.seconds };
  });
  return done._tag === "Used" ? done.value : done;
}

/** Opened per call, like the vault: it keeps nothing between calls but the setups in flight it was given. */
export function openSandboxes(dependencies: SandboxesDependencies): Sandboxes {
  const { sql } = dependencies;
  const environments = () => listEnvironments(sql, dependencies.agents());
  return {
    environments,
    save: (input) => save(dependencies, input),
    assign: (agent, environmentId) => {
      if (environmentId !== undefined && environmentById(sql, environmentId) === undefined) return { _tag: "NoSuchEnvironment" };
      assignAgent(sql, agent, environmentId);
      return { _tag: "Assigned" };
    },
    exec: (request, extra = {}, onUsed = () => undefined) =>
      inTurn(dependencies.turns, request, () => exec(dependencies, request, extra, onUsed)),
    used: (since) => usedSince(sql, since),
    usedByManager: (since) => usedByManager(sql, since),
    usedByDay: (since) => usedByDay(sql, since),
    remove: (id) => {
      const found = environments().find((one) => one.id === id);
      if (found !== undefined) deleteEnvironment(sql, id);
      return found?.usedBy;
    },
    testStart: (id) => testStart(dependencies, id),
  };
}

/** Narrows a size sent from outside. */
export const sizeOf = (value: unknown): (typeof SIZES)[number] | undefined => SIZES.find((size) => size === value);
