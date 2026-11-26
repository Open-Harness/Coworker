# The book

Every eval, in the order to build, with the sentences of [spec.md](spec.md) it shows. Written by `node evals/climb/book.ts`; locked.
The score is `pnpm climb --all`: of 100, weighted. On 25 November 2026 it is **0**: the types are there, nothing behind them is.

| Tier | Evals | Counts | Runs in |
|---|---|---|---|
| rules | 241 | 1 each | seconds |
| flows | 163 | 3 each | minutes |
| screens | 449 | 2 each | minutes |
| jobs | 18 | 5 each | a key, and money |

## How to climb

```bash
pnpm climb --slice 1
```

1. Take the next red eval. Read the sentences it shows in `docs/spec.md`, the module's `types.ts` and `README.md`, the drawing if it is a screen.
2. Build the least that makes it green, the way `AGENTS.md` says. The evals never change; the module's own tests beside it are yours.
3. `pnpm climb --slice N` again. Something that was green and is red comes first. So do types and shape.
4. Commit when a group is green. `pnpm climb --all` at the end of each slice; its line goes in `status/climb.json`.

| Command | Runs |
|---|---|
| `pnpm climb` | Types, shape, rules, flows |
| `pnpm climb --slice 3` | Everything of slice 3 but the jobs |
| `pnpm climb --only flow:check` | The evals with these words in their id |
| `pnpm climb --all` | Everything but the jobs, every gate, the kept tests. The score |
| `pnpm climb --all --jobs` | That, and the jobs |
| `pnpm climb --lock` | Whether something locked was changed |

**A slice is done** when its evals are green, nothing that was green is red, and it was used by hand once (`pnpm dev`) beside its drawings.
**It is all done** when `pnpm climb --all` says 100 and the jobs are green on the models the owner means to use.

**When an eval is wrong**, say why in `docs/findings.md`, leave it red, and go on. Never change it, the drawing, the spec or a contract's
`types.ts`. A type may be *added to* your own files; a contract's may not change.

## What of the spike is kept

| | |
|---|---|
| **Kept, and its tests with it** | auth, billing, brain, clock, credentials, github (the App, tokens, checks on a hook), http, live, mail, mailbox, models, outsiders, vault, web, workspace, workspaces, chat-sdk. `evals/climb/kept.json` has each test's title. What a kept test expects never changes; what it imports, and how it is set up (`test/team.ts` makes an old manager), may |
| **Kept as machinery, rebuilt around** | agent-engine (pi-durable, how a turn runs), the container host in sandboxes (behind boxes), the live pages' build |
| **Lifted** | email's reading of a mail → mail-events (one address for the co-worker, not one per manager). github's of a delivery → github-events. actions → doings (what may be pressed) and connectors (what a tool may do). access → reach. search → `GET /search`. triggers' gate → intake. schedule → playbook triggers |
| **Replaced** | manager, board, agents, settings, dashboards, team-app, team-build, team-core, team-home, team-settings, team-shell, team-start (team-join stays until its screen is replaced). Their tests go with them, each in the slice that replaces it. The e2e specs go with their screens |
| **Deleted once nothing imports it** | score (`pnpm score` was the spike's), admin, agent, agent-config, app, chat-host, chats, connection, directory, directory-client, documents, history, manager-client, protocol, schedule, transcript, ui |

A workspace is no longer deleted at once (L4: thirty days). No manager has an address outside (C2). There are no presets: there are templates.

## In the spec and in no eval

| Sentence | Why |
|---|---|
| P1 | Kept from the spike; its tests are kept |
| P3 | Kept from the spike; its tests are kept |
| P4 | GitHub and mail are shown; Slack and WhatsApp need an account |
| X9 | Its rules and its view are shown; the real Slack needs an app in a workspace |
| X10 | Its rules and its view are shown; the real WhatsApp needs a number |
| X11 | Its rules and its view are shown; a real CRM needs an account |
| X12 | Its rules are shown; a real calendar needs an account |
| X14 | Lending is in the types; only who leaves is shown (L5) |
| C8 | The morning list is shown; Mondays is the same machine |


## The evals, in the order to build

### 1. The pure middle

Every rule of a manager is true in code that touches nothing: a playbook is read, what comes in is decided, work moves.

| Eval | Shows |
|---|---|
| `rules:asks/an-ask-is-to-one-person-says-what-and-by-when` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:asks/silence-never-approves-else-only-for-decide-and-nothing-outside` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:asks/an-answer-answers-it` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:asks/only-who-may-answer` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:asks/the-second-answer-is-told-it-was-late` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:asks/past-its-date-a-reminder-then-each-stand-in-then-else` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:asks/whom-it-asks` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:asks/always-covers-this-thread-person-or-kind` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:asks/two-wrong-in-a-row-send-an-always-back-to-ask` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:boxes/an-ordinary-branch-of-its-own-leaves` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:boxes/only-its-own-branch` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:boxes/never-the-default-branch` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:boxes/no-workflow-files-unless-the-mandate-says-so` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:boxes/a-bundle-over-its-limit-is-refused` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:choosing/most-specific-level-wins` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:choosing/fallback-says-so-or-waits` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:choosing/unknown-price-is-never-zero` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:choosing/narrowest-reached-limit` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:choosing/near-a-limit-tells` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:choosing/parts-never-add-to-more-than-whole` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:connectors/each-has-the-same-five-parts` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:connectors/set-up-says-which-steps-need-a-person` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:connectors/github-hears-and-can-do-what-was-agreed` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:connectors/email-and-slack-hear-and-can-do-what-was-agreed` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:connectors/whatsapp-crm-and-calendar-hear-and-can-do-what-was-agreed` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:connectors/what-is-ours-to-fill-in-is-never-a-model's-to-give` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:connectors/a-call-is-checked-none-of-ours-every-needed-one-nothing-else` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:connectors/an-action-starts-as-its-risk-says-and-has-a-tool-name-of-its-own` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:coworker/the-first-way-of-speaking-that-fits-counts` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:coworker/its-words-have-the-soul-the-way-of-speaking-and-what-it-may-look-at` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:doings/the-palette-asks-first-then-places-doings-and-things-best-first` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:doings/a-sentence-says-who-and-what-without-running-into-itself` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:doings/a-walk-goes-to-the-page-fills-in-order-and-stops-before-what-a-person-decides` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:doings/the-registry-has-every-doing-as-agreed` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:doings/each-has-a-page-a-control-a-sentence-and-the-co-worker-stops-where-it-must` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:doings/it-may-never-do-what-the-person-asking-may-not` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:doings/what-you-may-not-do-is-not-offered` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:github-events/reads-every-delivery-github-publishes` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/a-record-has-the-time-github-gave-it` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/never-throws-whatever-comes` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/uninstalled-and-suspended-say-what-is-lost` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/ends-as-github-says-it-did` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/late-twice-and-in-any-order-is-the-same-end` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/what-was-lost-is-put-right-by-asking` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/each-person's-last-word-and-not-one-taken-back` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/everything-is-told-once-in-the-end` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/says-what-was-heard-as-the-connector-calls-it` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/a-mention-or-our-label-is-addressed-and-a-quote-is-not` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/ours-coming-back-is-noise-and-its-records-are-kept` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/the-same-thing-heard-twice-has-the-same-key-and-another-another` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/what-it-says-it-closes-in-this-repo-only` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/draft-open-closed-merged-and-open-again` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/checks-are-of-the-head-and-the-newest-of-each-name` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/a-check-finds-its-pull-request-by-its-commit` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/a-comment-does-not-take-a-review-away-and-a-dismissal-does` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/says-who-it-waits-for` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/a-talk-on-a-line-waits-for-us-until-it-is-answered-or-settled` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/two-of-one-second-that-disagree-are-not-sure-until-asked` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/first-seen-is-not-news` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/a-word-a-review-a-check-a-push-a-conflict-an-end` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/checks-are-told-when-all-are-in-or-one-failed` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/what-was-past-when-it-was-heard-is-not-told-as-now` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:github-events/as-an-event-of-the-work-that-follows-it` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:intake/decide-asked-or-maybe-by-off-watch-ask-do` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/decide-a-mandate-is-a-part` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/decide-several-managers-at-most-one-takes-it` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/decide-two-that-fit-equally-ask` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/decide-joins-open-work` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/question-kinds-from-playbooks` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/question-not-paused-managers` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/question-outside-words-marked-and-cannot-close` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/verdicts-narrowed` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/verdicts-unknown-dropped` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/verdicts-not-all-kinds-judged-could-not` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/decide-at-once-reached-waits` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/decide-spent-asks` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/decide-judge-could-not` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/decide-keeps-the-version-and-every-why` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/decide-words-from-outside-grant-nothing` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/after-a-correction-two-wrong-go-back-a-step` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/may-widen-after-ten-right-in-a-row` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/gate-who-may-ask` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/gate-per-place` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/gate-bots` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/gate-what-it-finds-itself` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/gate-words-grant-nothing` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/settled-follows-open-work` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/settled-stop-only-from-who-may` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/settled-nobody-lets-it-in` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:intake/settled-the-same-twice` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:knowledge/told-what-is-kept-for-its-manager-or-above` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:knowledge/private-is-told-only-to-the-one-it-is-private-to` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:knowledge/newest-wins-where-two-say-the-same` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:knowledge/from-outside-it-is-information-never-a-rule` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:knowledge/two-notes-that-say-the-opposite-are-both-shown` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:knowledge/unused-for-90-days-is-proposed-to-be-forgotten` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:mail-events/a-bounce-an-away-and-a-complaint-are-told-apart` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/says-what-the-report-says-for-machines` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/says-which-of-ours-it-was` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/why-it-did-not-arrive` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/mail-belongs-together-by-what-it-answers-in-any-order` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/a-conversation-is-in-the-order-it-was-written` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/each-is-told-once-whatever-the-order` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/what-is-new-in-it-without-what-it-answers` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/html-alone-is-read-as-words` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/only-what-our-own-server-said-first-proves-who-it-is` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/what-nobody-typed-is-noise-and-an-invite-is-not` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/ours-coming-back-is-noise-whichever-address-of-ours` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/without-an-id-the-same-mail-twice-is-still-one` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/never-throws-whatever-comes` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/late-may-still-arrive-and-failed-stays` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/only-a-wrong-address-and-a-complaint-close-it` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/a-report-belongs-to-the-conversation-of-what-it-is-about` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/a-report-about-what-we-never-sent-is-told-to-nobody` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/an-away-notice-is-not-an-answer` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/an-answer-before-what-it-answers-is-the-same-conversation-in-the-end` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/goes-to-reply-to-in-the-thread-and-never-to-us` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/never-a-machine-a-list-an-away-notice-or-who-it-is-closed-to` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/following-up-on-ours-goes-to-whom-it-went` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mail-events/as-an-event-of-the-work-that-follows-it` | X2, X5, X7, X8, X15, X16, I2 |
| `rules:mcp/read-only-tools-start-on-the-others-ask` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:mcp/only-https-to-a-public-host-that-is-not-ours` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:mcp/a-private-or-our-own-address-is-never-reached` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:mcp/a-tool-that-is-new-or-changed-goes-back-to-ask` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:mcp/a-name-the-model-sees-is-never-one-of-ours` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:measures/where-it-is-lost` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:measures/two-weeks-below-its-line-is-a-look` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:measures/a-measure-the-manager-writes-is-no-measure` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:measures/line-is-straight` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:measures/not-yet-until-it-can-be-read` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:measures/on-its-line-or-below-or-reached` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:measures/must-not-get-worse` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:playbook/check-passes-what-is-fine` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/check-says-what-is-not-there` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/hostile-yaml-is-refused-or-harmless` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/text-from-outside-adds-nothing` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/check-says-a-page-that-is-too-long` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/check-says-a-cron-or-wait-with-no-limit` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/check-says-a-part-without-an-eval` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/check-says-a-line-without-a-why` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/check-says-what-is-wider-than-above` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/check-says-every-problem-at-once` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/lines-in-reading-order` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/lines-one-change-one-line` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/diff-names-what-is-different` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/apply-makes-the-playbook-it-says` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/apply-refuses-what-is-no-longer-so` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/merge-keeps-both-changes` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/merge-shows-both-when-the-same-line-differs` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/reads-both-templates` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/says-every-problem-at-once` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/says-a-file-that-is-missing` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/check-says-a-step-that-cannot-end` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/check-says-who-checks-is-who-did` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/write-reads-back-the-same` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:playbook/write-keeps-awkward-text` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:reach/handed-on` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:reach/wider-is-refused` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:reach/mandate-is-a-part` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:reach/never-grows` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:reach/allowed` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:reach/ended-allows-nothing` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:reach/a-limit-asks` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:reach/mandate-says-what-it-left-out` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:reach/narrow-follows-the-limits-down` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:reach/every-limit-asks-where-it-is-reached` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:templates/says-which-blanks-are-left` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:templates/an-answer-adds-no-line-or-key` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:templates/reads-both-folders` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:templates/read-says-what-is-wrong-with-a-template` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:templates/fills-with-bests-and-answers` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:templates/number-blanks-lose-their-quotes` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:templates/model-blanks-become-the-model-or-inherit` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:templates/save-as-leaves-out-places-people-models-secrets-cases` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:templates/a-saved-template-fills-again-to-a-checked-playbook` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:templates/newer-says-nothing-when-nothing-is-newer` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:templates/newer-is-a-suggestion-and-keeps-what-the-manager-changed` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:templates/newer-shows-both-when-both-changed-a-line` | T1 to T5, B1 to B7, X3, W3, M5, R1 |
| `rules:threads/offer-by-role-a-checker-cannot-write-a-judge-only-judges` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:threads/a-call-is-narrowed-to-what-it-may-say` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:threads/a-wrong-call-comes-back-in-words` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:threads/evidence-is-by-this-agent-in-this-thread` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:threads/the-prompt-is-what-it-is-told-in-this-order-and-nothing-else` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:threads/a-part-that-is-not-there-is-not-said` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:threads/outside-words-say-so-and-cannot-close-their-block` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:threads/offer-is-its-tools-and-what-the-mandate-has-on-or-ask` | H2, H3, H5, H9, M2 to M5, X1 to X4, X7 to X12, U3, C6, C7, C10, P5 to P7 |
| `rules:tree/retiring-leaves-nothing-without-one-who-answers` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:tree/under-and-above` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:tree/rolled-up-adds-what-is-below-and-shows-the-loudest` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:tree/made-under-the-co-worker-or-a-manager-with-a-part-of-its-reach` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:tree/moving-never-makes-a-loop-or-gives-more` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:tree/what-is-taken-back-above-is-gone-below` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:tree/pausing-stops-taking-on-and-keeps-what-is-open` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:trials/alone-for-words-skills-and-models-only` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:trials/a-craft-skill-stays-only-if-better-with-it` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:trials/cases-have-an-id-and-the-same-one-is-not-twice` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:trials/half-the-cases-of-each-part-are-held-always-the-same` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:trials/a-model-judge-only-where-it-agrees-with-the-person` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:trials/score-counts-what-passed` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:trials/spread-is-how-far-it-moves-by-itself` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:trials/weakest-part-is-furthest-below-its-line` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:trials/kept-only-if-better-by-more-than-it-varies` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:trials/a-regression-or-a-worse-measure-is-never-kept` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:walkthrough/what-it-found-says-where-and-can-be-wrong` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:walkthrough/nothing-is-made-before-ten-cases-are-judged-and-a-yes` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:walkthrough/an-ended-one-stays-ended` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:walkthrough/an-answer-nobody-gave-is-the-best-one` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:walkthrough/every-line-says-why-and-a-persons-edit-is-you-said` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:walkthrough/starts-from-what-was-said` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:walkthrough/a-round-has-at-most-three-questions-that-change-a-line` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:walkthrough/two-rounds-and-no-third` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:walkthrough/stages-go-in-order` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:walkthrough/connecting-says-what-it-reads-and-what-it-lacks` | O1 to O9, S1 to S8, C1, C3, C9, C11, C13, R1 to R3, X13, L2, L3 |
| `rules:work/finished-outside-is-merged-or-closed-unmerged` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/spent-over-a-limit-asks-and-keeps-what-was-made` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/stopped-is-final-only-a-person-opens-it-again` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/moved-by-a-person` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/narrowed-tells-the-threads-and-never-grows` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/handed-over` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/ended-ends-the-threads-the-box-and-says-where-it-was-asked` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/every-event-has-its-effect` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/the-same-key-twice-changes-nothing` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/what-is-heard-on-its-threads-goes-to-the-work` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/done-when-is-written-before-building` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/evidence-is-never-from-who-did-it` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/sent-back-twice-asks-a-person` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/a-person-step-asks-and-carries-on` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/a-step-that-only-agents-show-is-a-check-by-someone-fresh` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/sent-back-nothing-that-was-true-before-counts` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/tests-that-fail-send-it-back-before-anyone-looks` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/with-a-person-it-ends-when-it-is-merged-and-closed-in-either-order` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/unanswered-is-retried-then-asks` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/stuck-asks-who-answers-for-it` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/due-looks-and-says-once-what-it-waits-for` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/ci-passed-and-failed` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/next-always-set-with-a-date-while-open` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/take-makes-open-work` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/columns-are-the-steps` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/step-of-the-work` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/is-done-only-with-evidence-from-someone-else` | I1 to I12, W1 to W13, A1 to A6 |
| `rules:work/says-what-it-waits-for-with-names` | I1 to I12, W1 to W13, A1 to A6 |

### 2. One issue becomes a pull request

Label an issue: within a minute it says what done means, works in a clone, runs the tests, opens a pull request. A crash at any moment changes nothing.

| Eval | Shows |
|---|---|
| `flow:repo/a-label-becomes-a-pull-request` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/a-mention-asks-too` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/says-what-done-means-on-the-issue-first` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/a-pull-request-says-what-and-how-it-was-tested` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/no-token-that-can-write-is-in-a-box-or-a-prompt` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/a-thread-starts-from-the-page-the-agent-the-work-and-the-issue` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/the-same-delivery-twice-is-one-piece-of-work` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/what-is-not-signed-is-refused-and-kept-nowhere` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/crash-after-it-came-in` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/crash-after-done-was-said` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/crash-after-it-built` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/crash-after-the-pull-request-opened` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/two-managers-two-repos-two-models-neither-sees-the-other` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/what-it-cost-is-on-the-work` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/a-price-not-known-is-said-and-not-zero` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/a-lost-box-and-its-snapshots-cost-time-only` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:repo/no-container-free-it-waits-and-says-so` | X2, X7, I1 to I5, W1, W2, W10, H1 to H10, L1, A1 |
| `flow:start/the-shell-says-who-and-where` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/someone-else-sees-nothing` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/home` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/inbox` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/chats` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/overview?period` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/tree` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/coworker` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/templates` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/settings/general` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/settings/members` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/settings/keys` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/settings/usage` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/settings/audit-log?by&outcome&before` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/settings/billing` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/settings/connectors` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/settings/mcp-servers` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/settings/shared` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-new-workspace-answers/settings/me` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/what-is-not-there-is-404-in-words` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-connected-endpoint-lists-its-models-and-prices-and-never-its-key` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/the-workspace's-model-is-chosen-by-a-doing` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/the-same-key-twice-does-it-once` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/each-is-a-line-in-the-audit-log` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-doing-nobody-knows-or-with-a-field-missing-is-refused-in-words` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/our-templates-are-there-and-say-what-they-need` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/connecting-github-shows-its-repos` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/one-is-made-and-keeps-its-own-copy` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/a-blank-place-is-said-and-nothing-is-made` | P2, P5, P6, T1, T2, M1, M2, U4 |
| `flow:start/what-comes-in-is-in-intake` | P2, P5, P6, T1, T2, M1, M2, U4 |

### 3. It stays with it

Comments, reviews, checks, a moved main, a merge: each goes to the thread that has it, once, and the issue is closed and told.

| Eval | Shows |
|---|---|
| `flow:repo/crash-after-it-was-checked` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/a-line-comment-is-done-pushed-and-answered-on-its-line` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/what-comes-later-goes-to-the-same-work-with-no-second-judgement` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/a-thread-that-follows-knows-what-it-did-before` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/a-failed-check-is-read-fixed-and-pushed` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/a-passed-check-is-known-and-shown` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/a-conflict-is-told-and-put-right` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/a-push-that-does-not-touch-it-wakes-nobody` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/merged-means-closed-told-done-and-the-box-gone` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/closed-without-merging-means-dropped-with-the-reason-and-told` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/twice-and-backwards-is-the-same-end` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/stop-from-someone-who-may-ask-stops-for-good` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/stop-from-a-stranger-is-only-read` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/quiet-past-its-date-it-says-once-what-it-waits-for` | X5, X7, I2, W8, W9, H1, H4, H6 |
| `flow:repo/uninstalled-it-says-so-asks-once-and-loses-nothing` | X5, X7, I2, W8, W9, H1, H4, H6 |

### 4. Someone else checks

Nothing reaches a person that a fresh agent has not checked against done when.

| Eval | Shows |
|---|---|
| `flow:check/is-a-fresh-conversation-that-cannot-write` | W5, W6, H5 |
| `flow:check/leaves-evidence-for-each-done-when-on-the-work-by-who-looked` | W5, W6, H5 |
| `flow:check/sends-it-back-with-its-words-and-the-doer-does-it-again` | W5, W6, H5 |
| `flow:check/a-command-that-fails-never-reaches-the-reviewer-or-a-person` | W5, W6, H5 |
| `flow:check/sent-back-twice-asks-the-person-who-answers-for-it` | W5, W6, H5 |
| `flow:check/a-doer-that-says-nothing-is-unanswered-and-does-not-pass` | W5, W6, H5 |
| `flow:check/an-honest-no-ends-with-the-reason-told-where-it-was-asked` | W5, W6, H5 |
| `flow:check/only-its-own-branch-leaves-the-box` | W5, W6, H5 |
| `jobs:check/rounds-down` | W5, the agents are good |
| `jobs:check/half-of-it` | W5, the agents are good |
| `jobs:check/one-door-left-open` | W5, the agents are good |
| `jobs:check/the-test-was-changed-to-fit` | W5, the agents are good |
| `jobs:check/shared-by-all` | W5, the agents are good |
| `jobs:check/and-something-else` | W5, the agents are good |
| `jobs:check/right-one` | W5, the agents are good |
| `jobs:check/right-two` | W5, the agents are good |
| `jobs:fix/a-sum-that-drifts` | W5, the agents are good |
| `jobs:fix/the-last-page` | W5, the agents are good |
| `jobs:fix/a-name-in-a-link` | W5, the agents are good |
| `jobs:fix/answers-in-the-wrong-order` | W5, the agents are good |
| `jobs:fix/a-limit-that-forgets` | W5, the agents are good |
| `jobs:fix/a-comma-in-a-cell` | W5, the agents are good |
| `jobs:fix/a-thing-to-add` | W5, the agents are good |
| `jobs:fix/not-more-than-asked` | W5, the agents are good |

### 5. The playbook decides

Whose words count, which kind, one manager, what may be done: all of it is the playbook's, and a person can change it.

| Eval | Shows |
|---|---|
| `flow:decide/someone-who-cannot-write-is-maybe-and-on-watch-it-is-left-with-what-it-would-have-done` | I3 to I12, T5, B4 to B6, W3 |
| `flow:decide/who-can-write-is-asked-of-github-when-it-matters` | I3 to I12, T5, B4 to B6, W3 |
| `flow:decide/a-writer-may-ask` | I3 to I12, T5, B4 to B6, W3 |
| `flow:decide/what-it-says-itself-is-not-something-that-came-in` | I3 to I12, T5, B4 to B6, W3 |
| `flow:decide/not-a-kind-is-left-with-why-and-kept` | I3 to I12, T5, B4 to B6, W3 |
| `flow:decide/the-judge-can-only-read` | I3 to I12, T5, B4 to B6, W3 |
| `flow:decide/five-managers-on-one-repo-make-one-piece-of-work` | I3 to I12, T5, B4 to B6, W3 |
| `flow:decide/two-that-fit-equally-are-asked-about` | I3 to I12, T5, B4 to B6, W3 |
| `flow:decide/a-judge-that-fails-is-could-not-tell-tried-again-and-told` | I3 to I12, T5, B4 to B6, W3 |
| `flow:decide/a-correction-is-a-case-and-two-send-the-kind-back` | I3 to I12, T5, B4 to B6, W3 |
| `flow:decide/words-from-outside-grant-nothing` | I3 to I12, T5, B4 to B6, W3 |
| `flow:decide/an-action-set-to-ask-parks-shows-exactly-what-and-is-done-after-a-yes` | I3 to I12, T5, B4 to B6, W3 |
| `flow:decide/what-is-off-is-not-offered-and-refused-if-called` | I3 to I12, T5, B4 to B6, W3 |
| `flow:decide/a-new-version-does-not-change-what-open-work-may-do-and-it-is-told` | I3 to I12, T5, B4 to B6, W3 |
| `flow:playbook/a-mistake-is-said-with-its-file-and-line-and-nothing-is-saved` | I3 to I12, T5, B4 to B6, W3 |
| `flow:playbook/two-people-change-the-same-line-and-the-second-sees-both` | I3 to I12, T5, B4 to B6, W3 |
| `flow:playbook/going-back-is-a-new-version` | I3 to I12, T5, B4 to B6, W3 |
| `flow:playbook/a-comment-comes-back-as-a-change-that-a-person-accepts` | I3 to I12, T5, B4 to B6, W3 |
| `jobs:triage/says-which-kind-it-is` | I4, L2 |
| `jobs:triage/obeys-nothing-it-reads` | I4, L2 |

### 6. Asking, models, money

It asks one person, in one place, once; runs on the models that were chosen; and stops at its limits.

| Eval | Shows |
|---|---|
| `flow:asks/says-what-it-is-about-its-options-its-best-and-by-when` | A1 to A6 |
| `flow:asks/is-asked-where-the-work-was-asked-too` | A1 to A6 |
| `flow:asks/an-answer-in-the-inbox-goes-on-and-leaves-the-inbox` | A1 to A6 |
| `flow:asks/an-answer-on-github-answers-it-here` | A1 to A6 |
| `flow:asks/the-second-answer-is-told-it-was-late` | A1 to A6 |
| `flow:asks/someone-it-is-not-for-may-not-answer` | A1 to A6 |
| `flow:asks/silence-reminds-once-and-never-approves` | A1 to A6 |
| `flow:asks/other-work-goes-on-while-one-waits` | A1 to A6 |
| `flow:asks/a-crash-while-it-waits-loses-nothing` | A1 to A6 |
| `flow:asks/always-for-this-kind-is-a-rule-and-is-not-asked-again` | A1 to A6 |
| `flow:models/each-agent-has-its-own-with-its-thinking` | M1 to M5, C11, P6 |
| `flow:models/inherit-means-the-manager's-else-the-workspace's` | M1 to M5, C11, P6 |
| `flow:models/one-that-stopped-working-waits-and-asks-and-goes-on-when-it-is-back` | M1 to M5, C11, P6 |
| `flow:models/over-its-limit-work-stops-asks-and-keeps-what-it-made` | M1 to M5, C11, P6 |
| `flow:models/over-its-day-a-manager-takes-nothing-on-and-keeps-what-came-in` | M1 to M5, C11, P6 |
| `flow:models/the-day's-money-in-parts-never-adds-up-to-more` | M1 to M5, C11, P6 |
| `flow:models/a-key-is-never-in-an-answer-a-log-or-a-prompt` | M1 to M5, C11, P6 |

### 7. You can see it

The shell, the managers, their boards, the work and the inbox look and work as drawn, and change while you look.

| Eval | Shows |
|---|---|
| `flow:search/finds-work-managers-and-chats-by-their-words` | U3, U4, U6, P2, P5, P7, L5 |
| `flow:search/never-what-you-may-not-see` | U3, U4, U6, P2, P5, P7, L5 |
| `flow:live/says-which-reads-changed` | U3, U4, U6, P2, P5, P7, L5 |
| `flow:live/is-not-for-someone-else` | U3, U4, U6, P2, P5, P7, L5 |
| `flow:safe/nothing-of-a-workspace-is-read-from-another` | U3, U4, U6, P2, P5, P7, L5 |
| `flow:safe/a-member-sees-and-uses-a-builder-changes-managers-an-owner-the-rest` | U3, U4, U6, P2, P5, P7, L5 |
| `flow:safe/the-same-press-twice-is-once` | U3, U4, U6, P2, P5, P7, L5 |
| `flow:safe/everything-done-is-one-line-in-the-log` | U3, U4, U6, P2, P5, P7, L5 |
| `flow:safe/who-leaves-loses-everything-at-once` | U3, U4, U6, P2, P5, P7, L5 |
| `screen:inbox/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:inbox/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:inbox/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:inbox/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:inbox/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:system/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:system/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:system/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:system/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:system/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:root/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:root/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:root/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:root/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:root/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:m-sales-overview/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-sales-overview/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-sales-overview/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:m-sales-overview/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:m-sales-overview/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:m-coding-overview/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-coding-overview/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-coding-overview/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:m-coding-overview/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:m-coding-overview/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:m-sales-intake/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-sales-intake/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-sales-intake/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:m-sales-intake/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:m-sales-intake/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:m-sales-search/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-sales-search/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-sales-search/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:m-sales-search/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:m-sales-search/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:m-coding-board/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-coding-board/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-coding-board/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:m-coding-board/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:m-coding-board/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:m-sales-board/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-sales-board/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-sales-board/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:m-sales-board/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:m-sales-board/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:task/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:task/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:task/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:task/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:task/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:m-coding-threads/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-coding-threads/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-coding-threads/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:m-coding-threads/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:m-coding-threads/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:thread/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:thread/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:thread/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:thread/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:thread/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:m-coding-settings/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-coding-settings/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:m-coding-settings/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:m-coding-settings/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:m-coding-settings/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:state-loading/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:state-loading/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:state-loading/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:state-loading/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:state-loading/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:state-error/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:state-error/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:state-error/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:state-error/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:state-error/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:state-empty/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:state-empty/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:state-empty/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:state-empty/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:state-empty/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:state-notyet/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:state-notyet/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:state-notyet/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:state-notyet/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:state-notyet/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:state-offline/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:state-offline/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:state-offline/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:state-offline/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:state-offline/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:state-gone/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:state-gone/looks-as-drawn` | U1, U2, U4, U5, U7 |
| `screen:state-gone/looks-as-drawn-on-a-phone` | U1, U2, U4, U5, U7 |
| `screen:state-gone/looks-as-drawn-in-the-dark` | U1, U2, U4, U5, U7 |
| `screen:state-gone/by-the-keyboard-and-with-names` | U1, U2, U4, U5, U7 |
| `screen:shell/says-what-is-drawn` | U1, U2, U4, U5, U7 |
| `screen:every/usable-within-a-second` | U1, U2, U4, U5, U7 |

### 8. Templates and the tree

Pick a template, pick a repo: made. Five of them. One under another. One retired, with nothing lost.

| Eval | Shows |
|---|---|
| `flow:tree/only-the-repo-is-needed-and-the-rest-is-found` | T1 to T5, R1 to R3, W12, W13 |
| `flow:tree/a-fifth-manager-is-one-press-and-neither-has-the-other's` | T1 to T5, R1 to R3, W12, W13 |
| `flow:tree/saved-as-a-template-it-names-no-place-person-model-or-secret` | T1 to T5, R1 to R3, W12, W13 |
| `flow:tree/a-manager-below-has-a-part-and-never-more` | T1 to T5, R1 to R3, W12, W13 |
| `flow:tree/what-is-taken-back-above-is-gone-below` | T1 to T5, R1 to R3, W12, W13 |
| `flow:tree/paused-it-takes-nothing-on-and-keeps-what-came-in` | T1 to T5, R1 to R3, W12, W13 |
| `flow:tree/retired-nothing-is-left-without-one-who-answers` | T1 to T5, R1 to R3, W12, W13 |
| `flow:tree/a-person-moves-adds-stops-and-opens-again` | T1 to T5, R1 to R3, W12, W13 |
| `screen:m-coding-connectors-github/says-what-is-drawn` | U2, S9, X6 |
| `screen:m-coding-connectors-github/looks-as-drawn` | U2, S9, X6 |
| `screen:m-coding-connectors-github/looks-as-drawn-on-a-phone` | U2, S9, X6 |
| `screen:m-coding-connectors-github/looks-as-drawn-in-the-dark` | U2, S9, X6 |
| `screen:m-coding-connectors-github/by-the-keyboard-and-with-names` | U2, S9, X6 |
| `screen:new/says-what-is-drawn` | U2, S9, X6 |
| `screen:new/looks-as-drawn` | U2, S9, X6 |
| `screen:new/looks-as-drawn-on-a-phone` | U2, S9, X6 |
| `screen:new/looks-as-drawn-in-the-dark` | U2, S9, X6 |
| `screen:new/by-the-keyboard-and-with-names` | U2, S9, X6 |
| `screen:new-fill/says-what-is-drawn` | U2, S9, X6 |
| `screen:new-fill/looks-as-drawn` | U2, S9, X6 |
| `screen:new-fill/looks-as-drawn-on-a-phone` | U2, S9, X6 |
| `screen:new-fill/looks-as-drawn-in-the-dark` | U2, S9, X6 |
| `screen:new-fill/by-the-keyboard-and-with-names` | U2, S9, X6 |
| `screen:new-check/says-what-is-drawn` | U2, S9, X6 |
| `screen:new-check/looks-as-drawn` | U2, S9, X6 |
| `screen:new-check/looks-as-drawn-on-a-phone` | U2, S9, X6 |
| `screen:new-check/looks-as-drawn-in-the-dark` | U2, S9, X6 |
| `screen:new-check/by-the-keyboard-and-with-names` | U2, S9, X6 |
| `screen:set-general/says-what-is-drawn` | U2, S9, X6 |
| `screen:set-general/looks-as-drawn` | U2, S9, X6 |
| `screen:set-general/looks-as-drawn-on-a-phone` | U2, S9, X6 |
| `screen:set-general/looks-as-drawn-in-the-dark` | U2, S9, X6 |
| `screen:set-general/by-the-keyboard-and-with-names` | U2, S9, X6 |
| `screen:set-keys/says-what-is-drawn` | U2, S9, X6 |
| `screen:set-keys/looks-as-drawn` | U2, S9, X6 |
| `screen:set-keys/looks-as-drawn-on-a-phone` | U2, S9, X6 |
| `screen:set-keys/looks-as-drawn-in-the-dark` | U2, S9, X6 |
| `screen:set-keys/by-the-keyboard-and-with-names` | U2, S9, X6 |
| `screen:set-usage/says-what-is-drawn` | U2, S9, X6 |
| `screen:set-usage/looks-as-drawn` | U2, S9, X6 |
| `screen:set-usage/looks-as-drawn-on-a-phone` | U2, S9, X6 |
| `screen:set-usage/looks-as-drawn-in-the-dark` | U2, S9, X6 |
| `screen:set-usage/by-the-keyboard-and-with-names` | U2, S9, X6 |
| `screen:set-connectors/says-what-is-drawn` | U2, S9, X6 |
| `screen:set-connectors/looks-as-drawn` | U2, S9, X6 |
| `screen:set-connectors/looks-as-drawn-on-a-phone` | U2, S9, X6 |
| `screen:set-connectors/looks-as-drawn-in-the-dark` | U2, S9, X6 |
| `screen:set-connectors/by-the-keyboard-and-with-names` | U2, S9, X6 |
| `screen:set-templates/says-what-is-drawn` | U2, S9, X6 |
| `screen:set-templates/looks-as-drawn` | U2, S9, X6 |
| `screen:set-templates/looks-as-drawn-on-a-phone` | U2, S9, X6 |
| `screen:set-templates/looks-as-drawn-in-the-dark` | U2, S9, X6 |
| `screen:set-templates/by-the-keyboard-and-with-names` | U2, S9, X6 |
| `screen:set-connect-github/says-what-is-drawn` | U2, S9, X6 |
| `screen:set-connect-github/looks-as-drawn` | U2, S9, X6 |
| `screen:set-connect-github/looks-as-drawn-on-a-phone` | U2, S9, X6 |
| `screen:set-connect-github/looks-as-drawn-in-the-dark` | U2, S9, X6 |
| `screen:set-connect-github/by-the-keyboard-and-with-names` | U2, S9, X6 |

### 9. The co-worker

You talk to Juno: it answers from the records, does what you may do, shows you how, and stops before what is yours.

| Eval | Shows |
|---|---|
| `flow:juno/answers-and-the-chat-is-in-the-list` | C1 to C13, L2 |
| `flow:juno/answers-about-work-from-the-records-with-links` | C1 to C13, L2 |
| `flow:juno/knows-the-page-you-are-on` | C1 to C13, L2 |
| `flow:juno/a-fork-knows-everything-up-to-the-line-and-nothing-after` | C1 to C13, L2 |
| `flow:juno/a-crash-in-the-middle-answers-once` | C1 to C13, L2 |
| `flow:juno/a-chat-of-one-person-is-not-another's` | C1 to C13, L2 |
| `flow:juno/does-what-the-button-does-by-the-same-doing` | C1 to C13, L2 |
| `flow:juno/cannot-do-what-the-person-asking-may-not` | C1 to C13, L2 |
| `flow:juno/stops-before-what-a-person-decides-and-goes-on-after-a-yes` | C1 to C13, L2 |
| `flow:juno/a-connector's-action-is-never-offered-to-it` | C1 to C13, L2 |
| `flow:juno/shows-you-step-by-step-and-the-last-one-is-yours` | C1 to C13, L2 |
| `flow:juno/work-asked-in-chat-is-work-like-any-other` | C1 to C13, L2 |
| `flow:juno/a-note-says-who-and-where-is-used-and-can-be-forgotten` | C1 to C13, L2 |
| `flow:juno/its-soul-is-what-it-is-told-first` | C1 to C13, L2 |
| `flow:juno/what-it-did-is-history-with-undo-where-there-is-one` | C1 to C13, L2 |
| `flow:juno/each-morning-it-lists-what-waits-for-a-person` | C1 to C13, L2 |
| `screen:live/shows-what-it-is-about-to-do-before-doing-it` | U2, C4, C7 to C12 |
| `screen:live/moves-the-pointer-to-the-control-it-names` | U2, C4, C7 to C12 |
| `screen:live/stop-stops-with-nothing-pressed-after` | U2, C4, C7 to C12 |
| `screen:live/skip-to-the-end-goes-straight-to-the-step-that-is-yours` | U2, C4, C7 to C12 |
| `screen:live/stops-before-saving-and-nothing-is-saved-until-a-person-presses-it` | U2, C4, C7 to C12 |
| `screen:live/announces-every-step-to-a-screen-reader` | U2, C4, C7 to C12 |
| `screen:live/a-reply-of-the-co-worker-can-show-how` | U2, C4, C7 to C12 |
| `screen:home/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:home/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:home/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:home/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:home/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |
| `screen:palette/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:palette/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:palette/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:palette/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:palette/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |
| `screen:chats/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:chats/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:chats/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:chats/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:chats/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |
| `screen:chat-support/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:chat-support/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:chat-support/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:chat-support/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:chat-support/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |
| `screen:chat-support-october/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:chat-support-october/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:chat-support-october/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:chat-support-october/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:chat-support-october/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |
| `screen:juno-about/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:juno-about/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:juno-about/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:juno-about/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:juno-about/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |
| `screen:juno-soul/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:juno-soul/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:juno-soul/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:juno-soul/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:juno-soul/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |
| `screen:juno-talking/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:juno-talking/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:juno-talking/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:juno-talking/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:juno-talking/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |
| `screen:juno-triggers/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:juno-triggers/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:juno-triggers/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:juno-triggers/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:juno-triggers/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |
| `screen:juno-skills/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:juno-skills/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:juno-skills/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:juno-skills/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:juno-skills/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |
| `screen:juno-memory/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:juno-memory/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:juno-memory/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:juno-memory/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:juno-memory/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |
| `screen:juno-may-do/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:juno-may-do/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:juno-may-do/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:juno-may-do/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:juno-may-do/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |
| `screen:juno-spending/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:juno-spending/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:juno-spending/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:juno-spending/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:juno-spending/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |
| `screen:juno-history/says-what-is-drawn` | U2, C4, C7 to C12 |
| `screen:juno-history/looks-as-drawn` | U2, C4, C7 to C12 |
| `screen:juno-history/looks-as-drawn-on-a-phone` | U2, C4, C7 to C12 |
| `screen:juno-history/looks-as-drawn-in-the-dark` | U2, C4, C7 to C12 |
| `screen:juno-history/by-the-keyboard-and-with-names` | U2, C4, C7 to C12 |

### 10. It gets better

A correction becomes a line. Each week the weakest part gets one change, tried beside the old one.

| Eval | Shows |
|---|---|
| `flow:good/a-measure-that-cannot-be-read-yet-says-when` | O1 to O9 |
| `flow:good/each-week-the-weakest-part-gets-one-change-tried-beside-what-is-there` | O1 to O9 |
| `flow:good/a-correction-becomes-a-line-to-accept` | O1 to O9 |
| `screen:m-sales-playbook/says-what-is-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook/looks-as-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook/looks-as-drawn-on-a-phone` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook/looks-as-drawn-in-the-dark` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook/by-the-keyboard-and-with-names` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-objective/says-what-is-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-objective/looks-as-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-objective/looks-as-drawn-on-a-phone` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-objective/looks-as-drawn-in-the-dark` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-objective/by-the-keyboard-and-with-names` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-workflow/says-what-is-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-workflow/looks-as-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-workflow/looks-as-drawn-on-a-phone` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-workflow/looks-as-drawn-in-the-dark` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-workflow/by-the-keyboard-and-with-names` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-triggers/says-what-is-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-triggers/looks-as-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-triggers/looks-as-drawn-on-a-phone` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-triggers/looks-as-drawn-in-the-dark` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-triggers/by-the-keyboard-and-with-names` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-agents/says-what-is-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-agents/looks-as-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-agents/looks-as-drawn-on-a-phone` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-agents/looks-as-drawn-in-the-dark` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-agents/by-the-keyboard-and-with-names` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-skills/says-what-is-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-skills/looks-as-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-skills/looks-as-drawn-on-a-phone` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-skills/looks-as-drawn-in-the-dark` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-skills/by-the-keyboard-and-with-names` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-reach/says-what-is-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-reach/looks-as-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-reach/looks-as-drawn-on-a-phone` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-reach/looks-as-drawn-in-the-dark` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-reach/by-the-keyboard-and-with-names` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-evals/says-what-is-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-evals/looks-as-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-evals/looks-as-drawn-on-a-phone` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-evals/looks-as-drawn-in-the-dark` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-evals/by-the-keyboard-and-with-names` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-versions/says-what-is-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-versions/looks-as-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-versions/looks-as-drawn-on-a-phone` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-versions/looks-as-drawn-in-the-dark` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-versions/by-the-keyboard-and-with-names` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-compare/says-what-is-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-compare/looks-as-drawn` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-compare/looks-as-drawn-on-a-phone` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-compare/looks-as-drawn-in-the-dark` | U2, B4, B5, O3, O4 |
| `screen:m-sales-playbook-compare/by-the-keyboard-and-with-names` | U2, B4, B5, O3, O4 |

### 11. From a sentence

Say what you want to get to; it asks three things, looks, drafts; you judge ten cases and say yes.

| Eval | Shows |
|---|---|
| `flow:set-up/says-it-back-measurably-then-asks-with-answers-of-its-own` | S1 to S9 |
| `flow:set-up/a-fourth-question-and-one-that-changes-nothing-are-refused-to-the-model` | S1 to S9 |
| `flow:set-up/someone-there-who-could-carry-it-is-proposed-and-nothing-is-made` | S1 to S9 |
| `flow:set-up/nothing-is-made-before-ten-are-judged-and-a-yes` | S1 to S9 |
| `flow:set-up/an-edit-is-you-said-and-the-rest-keeps-its-why` | S1 to S9 |
| `flow:set-up/a-draft-with-a-problem-goes-back-to-the-model-with-the-line` | S1 to S9 |
| `flow:set-up/read-access-ends-when-it-is-thrown-away` | S1 to S9 |
| `flow:set-up/a-crash-keeps-where-it-was` | S1 to S9 |
| `flow:set-up/a-member-may-not-make-one` | S1 to S9 |
| `screen:draft/says-what-is-drawn` | U2, S1 to S8 |
| `screen:draft/looks-as-drawn` | U2, S1 to S8 |
| `screen:draft/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:draft/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:draft/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:draft-objective/says-what-is-drawn` | U2, S1 to S8 |
| `screen:draft-objective/looks-as-drawn` | U2, S1 to S8 |
| `screen:draft-objective/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:draft-objective/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:draft-objective/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:draft-workflow/says-what-is-drawn` | U2, S1 to S8 |
| `screen:draft-workflow/looks-as-drawn` | U2, S1 to S8 |
| `screen:draft-workflow/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:draft-workflow/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:draft-workflow/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:draft-triggers/says-what-is-drawn` | U2, S1 to S8 |
| `screen:draft-triggers/looks-as-drawn` | U2, S1 to S8 |
| `screen:draft-triggers/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:draft-triggers/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:draft-triggers/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:draft-agents/says-what-is-drawn` | U2, S1 to S8 |
| `screen:draft-agents/looks-as-drawn` | U2, S1 to S8 |
| `screen:draft-agents/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:draft-agents/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:draft-agents/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:draft-skills/says-what-is-drawn` | U2, S1 to S8 |
| `screen:draft-skills/looks-as-drawn` | U2, S1 to S8 |
| `screen:draft-skills/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:draft-skills/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:draft-skills/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:draft-reach/says-what-is-drawn` | U2, S1 to S8 |
| `screen:draft-reach/looks-as-drawn` | U2, S1 to S8 |
| `screen:draft-reach/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:draft-reach/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:draft-reach/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:draft-evals/says-what-is-drawn` | U2, S1 to S8 |
| `screen:draft-evals/looks-as-drawn` | U2, S1 to S8 |
| `screen:draft-evals/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:draft-evals/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:draft-evals/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:draft-skill-bos-voice/says-what-is-drawn` | U2, S1 to S8 |
| `screen:draft-skill-bos-voice/looks-as-drawn` | U2, S1 to S8 |
| `screen:draft-skill-bos-voice/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:draft-skill-bos-voice/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:draft-skill-bos-voice/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:setup/says-what-is-drawn` | U2, S1 to S8 |
| `screen:setup/looks-as-drawn` | U2, S1 to S8 |
| `screen:setup/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:setup/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:setup/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:setup-ask/says-what-is-drawn` | U2, S1 to S8 |
| `screen:setup-ask/looks-as-drawn` | U2, S1 to S8 |
| `screen:setup-ask/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:setup-ask/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:setup-ask/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:setup-connect/says-what-is-drawn` | U2, S1 to S8 |
| `screen:setup-connect/looks-as-drawn` | U2, S1 to S8 |
| `screen:setup-connect/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:setup-connect/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:setup-connect/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:setup-found/says-what-is-drawn` | U2, S1 to S8 |
| `screen:setup-found/looks-as-drawn` | U2, S1 to S8 |
| `screen:setup-found/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:setup-found/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:setup-found/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:setup-ask-2/says-what-is-drawn` | U2, S1 to S8 |
| `screen:setup-ask-2/looks-as-drawn` | U2, S1 to S8 |
| `screen:setup-ask-2/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:setup-ask-2/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:setup-ask-2/by-the-keyboard-and-with-names` | U2, S1 to S8 |
| `screen:setup-draft/says-what-is-drawn` | U2, S1 to S8 |
| `screen:setup-draft/looks-as-drawn` | U2, S1 to S8 |
| `screen:setup-draft/looks-as-drawn-on-a-phone` | U2, S1 to S8 |
| `screen:setup-draft/looks-as-drawn-in-the-dark` | U2, S1 to S8 |
| `screen:setup-draft/by-the-keyboard-and-with-names` | U2, S1 to S8 |

### 12. Mail, MCP and the rest

Customers' mail is answered; tools are added without code; every other screen is there; a workspace can leave whole.

| Eval | Shows |
|---|---|
| `flow:mail/a-customer's-mail-is-judged-and-a-person-says-whether-to-take-it` | X2, X6, X8, X13, X16, L3, L4 |
| `flow:mail/the-answer-is-shown-whole-and-sent-only-after-a-yes-on-the-same-thread` | X2, X6, X8, X13, X16, L3, L4 |
| `flow:mail/what-they-write-back-goes-to-the-same-work` | X2, X6, X8, X13, X16, L3, L4 |
| `flow:mail/one-that-is-not-really-from-there-is-dropped-with-why` | X2, X6, X8, X13, X16, L3, L4 |
| `flow:mail/the-mailbox-looks-like-mail` | X2, X6, X8, X13, X16, L3, L4 |
| `flow:mail/a-person-writes-as-the-co-worker-and-it-is-theirs-until-handed-back` | X2, X6, X8, X13, X16, L3, L4 |
| `flow:mail/quiet-for-three-days-after-our-question-is-one-reminder` | X2, X6, X8, X13, X16, L3, L4 |
| `flow:mail/one-of-ours-that-came-back-is-told-to-its-work-and-not-written-to-again` | X2, X6, X8, X13, X16, L3, L4 |
| `flow:mcp/read-only-tools-start-on-and-the-others-ask` | X2, X6, X8, X13, X16, L3, L4 |
| `flow:mcp/a-wrong-secret-a-private-address-and-ours-are-refused-in-words` | X2, X6, X8, X13, X16, L3, L4 |
| `flow:mcp/a-tool-on-ask-parks-and-runs-after-a-yes` | X2, X6, X8, X13, X16, L3, L4 |
| `flow:workspace/is-exported-whole-and-without-a-secret` | X2, X6, X8, X13, X16, L3, L4 |
| `flow:workspace/is-deleted-for-good-thirty-days-after-its-name-was-typed` | X2, X6, X8, X13, X16, L3, L4 |
| `screen:signin/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:signin/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:signin/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:signin/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:signin/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:signup/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:signup/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:signup/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:signup/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:signup/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:join/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:join/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:join/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:join/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:join/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:start/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:start/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:start/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:start/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:start/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:m-sales-connectors/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:m-sales-connectors/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:m-sales-connectors/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:m-sales-connectors/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:m-sales-connectors/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:m-support-connectors/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:m-support-connectors/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:m-support-connectors/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:m-support-connectors/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:m-support-connectors/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:m-sales-connectors-crm/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:m-sales-connectors-crm/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:m-sales-connectors-crm/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:m-sales-connectors-crm/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:m-sales-connectors-crm/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:m-support-connectors-email/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:m-support-connectors-email/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:m-support-connectors-email/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:m-support-connectors-email/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:m-support-connectors-email/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:m-whatsapp-connectors-whatsapp/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:m-whatsapp-connectors-whatsapp/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:m-whatsapp-connectors-whatsapp/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:m-whatsapp-connectors-whatsapp/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:m-whatsapp-connectors-whatsapp/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:m-coding-connectors-slack/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:m-coding-connectors-slack/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:m-coding-connectors-slack/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:m-coding-connectors-slack/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:m-coding-connectors-slack/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:set-members/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:set-members/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:set-members/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:set-members/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:set-members/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:set-audit-log/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:set-audit-log/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:set-audit-log/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:set-audit-log/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:set-audit-log/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:set-billing/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:set-billing/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:set-billing/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:set-billing/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:set-billing/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:set-mcp-servers/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:set-mcp-servers/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:set-mcp-servers/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:set-mcp-servers/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:set-mcp-servers/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:set-agents/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:set-agents/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:set-agents/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:set-agents/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:set-agents/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:set-skills/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:set-skills/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:set-skills/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:set-skills/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:set-skills/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:set-environments/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:set-environments/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:set-environments/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:set-environments/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:set-environments/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:set-profile/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:set-profile/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:set-profile/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:set-profile/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:set-profile/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:set-notifications/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:set-notifications/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:set-notifications/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:set-notifications/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:set-notifications/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
| `screen:set-security/says-what-is-drawn` | U2, P1, P3, X6 |
| `screen:set-security/looks-as-drawn` | U2, P1, P3, X6 |
| `screen:set-security/looks-as-drawn-on-a-phone` | U2, P1, P3, X6 |
| `screen:set-security/looks-as-drawn-in-the-dark` | U2, P1, P3, X6 |
| `screen:set-security/by-the-keyboard-and-with-names` | U2, P1, P3, X6 |
