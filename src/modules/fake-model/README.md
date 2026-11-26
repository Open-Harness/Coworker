# fake-model

`coworker-fake-model`: a scripted OpenAI-compatible server for the live tier. It is deployed as its own Worker
(`wrangler.fake-model.jsonc`, entry `src/bin/fake-model.ts`) and added to the staging test workspace as its **own
endpoint**, so a manager on staging thinks with a model that costs nothing and always answers the same way, and the
"own endpoint" path of book section 2 is exercised too.

**Owns**

- `GET /v1/models` and `POST /v1/chat/completions` (streamed or whole), the two calls a workspace makes to test and use
  an endpoint (`models/README.md`).
- The script (`internal/script.ts`, pure): the same conversation always gives the same step. It mirrors the fast
  tier's scripted manager (`manager/testing.ts`): an explicit candidate is accepted with `triage_accept`, an inferred
  one is ignored, a Task just made is announced with `reply_thread` (so the sender gets a threaded reply), a follow-up
  is answered on its Task, "add a task: X" is `task_create`, "start a <role> on DT-n run: <command>" is `run_start`, a worker's run does `run: <command>` with `run_command` and reports `ready` (exit 0) or `failed` with the end of its output, or reports `ready` when it has no command, anything else is
  acknowledged. A step that needs a tool the caller did not offer is said in words instead.
- An optional key: with `FAKE_MODEL_KEY` set (a Worker secret), requests need `Authorization: Bearer <key>`.

**Invariants**

- No state, no clock, no outside calls: the answer is a function of the request.
- Never asks for a tool that was not offered.

**Testing**: `fake-model.test.ts` drives `fakeModel.handle` with chat requests, whole and streamed.
