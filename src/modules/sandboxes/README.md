# sandboxes

Where a run's agent does its work: a container made from an Environment (the Environments screen). Its tables live
in the Workspace object, beside the vault.

**Owns**

- Environments: a name, a setup script and a size. Saving a changed setup or size makes a new version.
- A run's `run_command` tool runs in the environment its agent had when the run started, by id. A saved agent's environment
  is a setting of the agent (`agents`), asked for through `agents()` to say who uses what. Only the plain Worker, which nobody
  saves, is assigned here by name (`agent_environment`).
- **The plain container** (`PLAIN`): where an agent with no environment runs. No setup, so nothing is built. An environment
  deleted while a run is in it is `NoEnvironment`: a run does not move halfway.
- Setups: the first command a version needs runs the setup once, through the `SandboxHost`, and keeps the image.
  Two runs that start at once share that one setup.
- Secrets: a setup line `export NAME=vault:<secret>` names one. The line is taken out of the script, and `NAME`
  is set from the vault's `use` for the length of one command. The value is never written into a script or a
  file, and any output that prints it shows `[secret <name>]` instead.
- The meter: every setup and command records its container seconds in `sandbox_use`.

**Invariants**

- A value from the vault exists only inside one `vault.use` call.
- One setup per environment version.
- A run's commands share its files and go one at a time (`internal/run-files.ts`). No other run sees them. A run keeps
  its files when its environment's setup changes, and starts over if it moves to another environment.

**On Cloudflare Containers** (`cloudflareContainers`, a deployment with the `BOXES` binding, which is staging; without it
`noContainers` answers "not set up"):

- One image (Docker Hub's `node:24.11.1-bookworm`, copied by its digest to Cloudflare's registry by `scripts/sandbox-image.ts` and
  named in `wrangler.jsonc`), one Durable Object class (`CommandBox`, `BoxHost`) with one container per object, under the
  `durable_object` scheduling policy: snapshots and `ctx.container.images` need it, and it starts no other registry's images. Sizes are chosen when a container starts, on the platform's named instance types: 1 vCPU · 2 GB is `standard-2`
  (1 vCPU, 6 GiB), 2 vCPU · 4 GB is `standard-3` (2 vCPU, 8 GiB), 4 vCPU · 8 GB is `standard-4` (4 vCPU, 12 GiB). The platform has
  no 2, 4 or 8 GB type, so each size gets at least the memory it names.
- A setup runs in its own container and the whole root filesystem is kept as a **container snapshot** (`image` is
  `<instance>/<snapshot id>`). A run's first command starts a container from that snapshot. Whatever it left, anywhere on the
  filesystem, is snapshotted too, and the run's next command starts from there; then the container is destroyed, so a
  run that waits days costs no container time. Running processes and memory are not kept.
- Secrets are only the process environment of one `exec` (`env` of `container.exec`, which passes only those variables
  and `PATH`). They are not in the start options, the snapshot's name, the image string or any file this module writes.
  A setup script that itself writes `$NAME` to a file would put it in the snapshot: scripts must not.
- **Limits.** Snapshots are in public beta, are not billed yet, and expire (the page gives no lifetime). When the one a
  command starts from is gone, the host says `expired`, and `openSandboxes` runs the environment's setup once more
  (with its vault secrets, as the first time), keeps the new snapshot, and runs the command again: nothing is saved by hand.
  A command ends after 10 minutes and a setup after 15. A platform failure (no capacity) is `Unavailable` and is never
  recorded as a failed setup. A run's kept files expire the same way: its next
  command then starts from the setup and says so. A command that writes a secret to a file keeps it in that run's snapshot. Nothing
  needs Docker: no image is built. That policy has no `max_instances`: what runs counts towards the account's own limits.

**A command's GitHub token.** The Workspace object (`workspace/internal/token.ts`) gives a run's command `GH_TOKEN` as
process environment, made for that command and kept nowhere: for the repo of the Task's GitHub thread (read-only if it is a
fork, as `github.repoToken` says), else for the repo a manager hears when it hears exactly one (contents and metadata,
read), else none. It only ever uses the workspace's own installation, so another workspace's repo or installation gets
nothing. A `GH_TOKEN` the environment sets itself is kept instead. An installation that is gone, or a token GitHub refuses, means the command runs without one. The value is hidden
in the command's output like a vault secret (`[secret GH_TOKEN]`), and is in no transcript, event, audit line or file.

**Testing**: `sandboxes.test.ts` drives `openSandboxes` in a Workspace object's storage against the scripted host
in `testing.ts`. `containers.test.ts` drives the Cloudflare adapter over a fake container handle (no Docker, no network). `src/flows/sandbox.test.ts` runs commands from a manager's runs over HTTP.

**Settings.** `remove` takes an environment away (the agents that ran in it run in the plain container); `testStart` runs its setup now and
keeps the result for its version (it is sandbox time, so it is metered); `usedByManager` and `usedByDay` feed Usage.
