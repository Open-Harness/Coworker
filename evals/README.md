# Evals

What says whether the product is there. **Locked**: whoever builds never changes anything in this folder, in `design/`, in `docs/spec.md`,
`docs/book.md`, `docs/design.md`, `docs/first-principles.md`, `docs/templates/{repo,customers}`, or in a contract module's types. `pnpm climb`
checks `LOCK` and scores nothing when it differs. If an eval is wrong, say so in `docs/findings.md` and leave it red.

| Folder | What | Runs in | Alone |
|---|---|---|---|
| `rules/` | The pure modules, through their `types.ts` | node, seconds | `npx vitest --run --config evals/rules/vitest.config.ts` |
| `flows/` | The whole Worker, with everything outside it faked at the network | workerd, minutes | `npx vitest --run --config evals/flows/vitest.config.ts` |
| `screens/` | Each drawn screen: what it says, its look, the phone, the dark, the keyboard, a second to be usable, the co-worker showing how | a browser, on fixtures of the API. `pnpm build` first | `npx playwright test --config evals/screens/playwright.config.ts` |
| `jobs/` | A real model on practice repos with a known right answer | your key, and money | `npx vitest --run --config evals/jobs/vitest.config.ts` |
| `world/` | The fakes that flows and jobs stand on, and their own tests | node | `npx vitest --run --config evals/world/vitest.config.ts` |
| `climb/` | `pnpm climb`, the slices, what is kept, the lock | | |

An eval's test has the eval's id as its name, and is one line in [docs/book.md](../docs/book.md). Narrow with `-t` (vitest) or `-g` (playwright).

`rules/` was shown to be passable with throwaway implementations, and to fail when they are broken. `screens/` is green against the drawings
themselves: `SCREENS_AGAINST=design`. `jobs/` was shown with right and wrong answers: `evals/world/jobs.test.ts`.

## What flows expect the product to offer

The Worker is the real one, on its real adapters. Its settings are in `flows/vitest.config.ts`. With `DT_WORLD=fake` **and** `DT_OUTSIDE=http`:

| | Is |
|---|---|
| Containers, and the push | `httpBoxes` and `httpGit` of `src/modules/boxes/testing.ts`, chosen in `src/world.ts`. Real git and node run in `evals/world/boxes.ts` |
| GitHub | The real adapter. The network is `evals/world/github.ts`, which answers as GitHub does and signs what it sends |
| Models | The workspace's own. A flow connects `https://models.flows.test/v1` as an endpoint by `POST /api/workspaces/:id/models {source: "endpoint", label, baseUrl, key}` |
| Time | `worldClock`. `POST /api/test/time {workspace, pass}` moves it by `pass` ms, runs **everything that is due** in that workspace, and answers 200 after it |
| Mail out | `/api/test/mail`, as it is today |
| Mail in | `/api/test/inbound-mail`, as it is today, and it also takes `inReplyTo` (the header In-Reply-To), `dkim: false`, and `raw`: a whole message, taken as it is, with `from` and `to` the envelope |
| An invite that lapsed | `/api/test/lapse-invite`, as it is today |

Always: `POST /in/github` takes GitHub's deliveries and answers 401 when the signature is wrong. `POST /api/workspaces/:id/github` claims an
installation, as it does today. The console API is `src/modules/api/types.ts`: reads under `/api/ws/<id or address>/…`, and every change is
`POST /do {doing, values, key}`. A flow never looks inside: only at answers, at what the outside was sent, and at what models were told.

`crash()` evicts every Durable Object. What was not stored never happened; the flow then expects the same end.

## What screens expect

The finished build, served by `scripts/serve.ts`; each request of the page to `/api/ws/acme/…` is answered from `screens/fixtures`. The page for each
drawing is in `screens/screens.ts`: `/ws/acme` and the path, and the door at `/sign-in`, `/sign-up`, `/join`, `/start`.

- **What is drawn, it says**: of the words on the drawing, in order, at least 90%. Amounts and dates come from the fixture's numbers, so they
  must be written as drawn. The clock is 25 November 2026, 09:54 in Copenhagen.
- **It looks as drawn**: where there is ink, compared in blocks, at least 80%. A different screen gets less than 50%.
- **By the keyboard and with names**: everything that can be pressed is reached with Tab, or with the arrows inside what is one stop, and has a name.
- `live.eval.ts`: the pointer has `data-testid="juno-pointer"`; what it says is in a `status` region; the bar has *Stop* and *Skip to the end*; the
  palette has *Show me how*; a chat line with `showMe` has *Show me*.

A fixture is what a view is given, not a world: numbers agree with the drawings, and the files in one are for showing.

## Jobs

| | |
|---|---|
| `JOBS_BASE_URL`, `JOBS_KEY`, `JOBS_MODEL` | An endpoint that speaks OpenAI's chat completions, its key, the model of the agents that do |
| `JOBS_REVIEWER`, `JOBS_JUDGE`, `JOBS_THINKING` | Other models for the reviewer and the judge, and a thinking level. Optional |

`jobs/fix` gives an issue to a manager and runs tests it never saw on what it pushed. `jobs/check` hands the reviewer work that is wrong in one way, or
right. `jobs/triage` asks the judge. The key is added outside workerd and is never in the product.
