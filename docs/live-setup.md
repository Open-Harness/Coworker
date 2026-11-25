# Setting up the live tier

The live tier tests Co-worker on the real thing: a deployed copy called **staging** (the Worker `coworker-staging`), real
email, a real GitHub App and real containers. Four tests use it (`live:email/round-trip`, `live:email/stranger`,
`live:github/round-trip`, `live:sandbox/clone-test`). Until you finish these steps they are skipped, which is neither a pass
nor a fail, and `pnpm score --live` says which settings are missing.

Everything here is done by you, once. Nothing here creates an account or buys anything.

**Where the credentials are kept:** in Bitwarden (its free plan is enough), in the note **Co-worker staging**. Nothing is
kept in a file or in the repo. `pnpm credentials` shows what is there, asks for what is missing, checks each answer with its own service, and
keeps it. `pnpm credentials run <command>` runs a command with them; `bw` asks for your master password first. The staging Worker has its own
copies, in Cloudflare. (Without Bitwarden: copy `.dev.vars.example` to `.dev.vars`, a file Git ignores, and fill it in.)

| What                                                | Who supplies it                                        |
| --------------------------------------------------- | ------------------------------------------------------ |
| Test domain, test organization                      | You type them                                          |
| `GH_PERSON_TOKEN`                                   | You paste it (nothing shows on the screen)             |
| Seven GitHub App values                             | One button on GitHub; the command keeps what it answers |
| `BETTER_AUTH_SECRET`, `VAULT_MASTER_KEY`, `LIVE_MAILBOX_TOKEN` | Made by the command                         |
| The addresses of staging, the test model and the two mailboxes, the test repo | Worked out from the domain and the organization |
| `CLOUDFLARE_API_TOKEN`, `FAKE_MODEL_KEY`, `ANTHROPIC_API_KEY` | Not needed                                   |

## 1. Once, before anything

1. `bw login`, once (`brew install bitwarden-cli` if it is missing).
2. `pnpm exec wrangler whoami` must name your Cloudflare account (`pnpm exec wrangler login` signs in), and the account must be
   on **Workers Paid** ($5 a month): Containers and sending email need it. A `CLOUDFLARE_API_TOKEN` is needed only to deploy from
   a computer where wrangler is not signed in, such as a nightly job: Workers Scripts, D1, R2, Secrets Store, Cloudchamber and
   Email Routing Addresses (account, Edit); Workers Routes, DNS and Email Routing Rules (the test domain, Edit); Zone (Read).
3. `gh auth status` must name your GitHub account.

## 2. The test domain on Cloudflare

Use a domain **that carries no mail of yours**: turning on Email Routing replaces its mail records. A cheap new one is best.

1. Dashboard, **Domains**, **Onboard a domain**, type the domain, choose the **Free** plan.
2. Point the domain's nameservers at Cloudflare as it says, and wait until the dashboard says **Active**.

Staging will be `https://staging.<test domain>`, the test model `https://fake-model.<test domain>/v1`, the manager's mail
address `launch.live@<test domain>`, and the two people who write to it `person@<test domain>` and `stranger@<test domain>`. You never type these anywhere.

## 3. Run `pnpm credentials`

It asks for what is missing, in order, and can be stopped and run again at any time. Steps 4 to 8 say where each thing comes
from. `pnpm credentials --list` shows what is there and asks nothing.

## 4. Cloudflare Email: in and out

In the dashboard, on the test domain, once:

1. **Email Routing**: turn it on and accept its DNS records.
2. **Email Sending**: turn it on for the domain. (`hello@<test domain>` sends sign-in links.)
3. After step 9: **Email Routing**, **Routing rules**, **Catch-all address**: **Send to a Worker**, `coworker-staging`, on. Wrangler cannot do
   this one. The live tests do not need it; it carries the mail of every manager other than the test one.

Step 9 does the rest: it gives the two people's addresses a routing rule of their own to `coworker-mailbox`, and the test manager's
(`launch.live@<test domain>`) one to `coworker-staging`. Every workspace's managers are on the domain itself, so nothing is set up per workspace.

## 5. The two people who write to the manager

Nothing to do. `person@<test domain>` may ask the manager and `stranger@<test domain>` may not. Their mailboxes are a
small Worker of their own, `coworker-mailbox`, at `https://mailbox.<test domain>`: step 9 deploys it. It keeps mail for 7 days, answers only
with its token (`LIVE_MAILBOX_TOKEN`, made by `pnpm credentials`), and sends only to the test domain's own addresses.

**What this cannot show:** mail goes from Cloudflare to Cloudflare, so no other provider's DKIM and no other mail client's
threading is tested.

## 6. GitHub: the test organization and repo

1. An organization you own, or a new one: GitHub, **+**, **New organization**, the free plan. Give its name.
2. The command offers to make the private repo `sandbox` in it, with one passing test. Say yes.

## 7. GitHub: the App "Co-worker (staging)"

The manifest is `live/github-app-manifest.json`: it asks for issues and pull requests (read and write), contents and
checks (read), metadata, a sign-in step when someone installs it (`request_oauth_on_install`, with the callback
`https://<staging>/github/installed` and no setup URL), and the events issues, issue comment, pull request, pull request review, check run and push.

1. The command offers to make it: say yes. A page opens; press **Create the App on GitHub**, then **Create GitHub App** on GitHub.
   The page says **Done**, and the command keeps the App's seven values (its key in the format the Worker needs).
2. Do not install the App from GitHub's own page: the app must start the install, so that it knows which workspace is
   connecting and checks that you administer the repos. It is done in the app, in step 10.

## 8. GitHub: the person's token

The person who opens issues can be your own account. **Settings**, **Developer settings**, **Personal access tokens**,
**Fine-grained tokens**, **Generate new token**. **Resource owner**: the test organization (the account must be in it).
**Only select repositories**: `sandbox`. **Permissions**: **Issues** and **Pull requests**, read and write. Copy it and paste it
when asked. (If the organization requires approval for tokens, approve it.) A separate machine user works the same way.

## 9. Deploy staging

1. `pnpm staging` prints every step and runs nothing.
2. `pnpm credentials run pnpm staging --apply` looks at what the account has, makes what is missing (database, files bucket,
   secrets store), fills in `wrangler.jsonc`, `wrangler.fake-model.jsonc` and `wrangler.mailbox.jsonc`, puts the vault key in the store, makes the
   tables, deploys `coworker-staging`, `coworker-fake-model` and `coworker-mailbox` with their secrets, and routes the mail. It can be run again at any time,
   and never replaces the vault key. The account's ids are put in for that run only, then the files are as they were.

No Docker is needed: the setup copies the sandbox image from Docker Hub to Cloudflare's registry over HTTP, once. An account has one secrets store: if there is one it is
used, and the key is called `coworker-staging-vault-master-key` so that it cannot be taken for another project's.

## 10. The test workspace, and the one thing only a browser can do

The runner makes the workspace itself, over the app's own API, signing in as the allowed mailbox (it asks the app for the
emailed sign-in link, reads it from that mailbox through `coworker-mailbox`, and follows it). That mailbox is the workspace's Owner.
Each run does the same, so it is safe to repeat. It makes, if they are not there: the workspace `live`, a model endpoint
(`coworker-fake-model`, the address in `LIVE_FAKE_MODEL_URL`, with the key if you set `FAKE_MODEL_KEY`), the manager `launch`,
who may ask it (the allowed mailbox, and the machine user's GitHub account), the repo it hears and an environment for runs.

1. Run `pnpm credentials run pnpm test:live` once. The two email tests can pass now. The GitHub and sandbox ones stop with a message that the
   App is not installed. That is expected; it also made the workspace for you.
2. Install the App, once, in a browser. `pnpm credentials run pnpm live:sign-in` prints an address of this computer: open it in that browser
   and you are signed in as `person@<test domain>` (it reads the emailed link for you, and never prints it). Open **Settings**,
   **Keys and connections**, **GitHub**, **Connect GitHub**. GitHub opens: choose the test org,
   **Only select repositories**, `sandbox`, **Install**. The GitHub account you are signed in as there must be an
   administrator of every repo you pick (the org owner is): the app checks this and refuses otherwise. You land back in the app,
   connected.

## 11. Run it

- `pnpm credentials run pnpm test:live` runs just the four live tests. They pass when: a mail from the allowed person puts a task on the board and
  the manager's threaded reply arrives within 60 seconds; a mail from the stranger puts no task on the board, adds exactly one
  line to Events and gets no reply; an issue from the machine user puts a task on the board and the App comments within 60
  seconds; and a run the manager is asked for in chat clones `sandbox`, runs its tests in a container, and its report says they passed.
- `pnpm credentials run pnpm staging:until-green` asks for your master password once and does all of it: deploys main, runs the live
  tests, waits for the next commit on main when one fails, and counts them when they pass. It holds the credentials until it ends.
- `pnpm credentials run pnpm score --live` runs the whole score with them as a third tier. The sandbox test takes 5 minutes at most.
- A test with a setting missing is skipped and its missing names are printed. Nothing skipped counts as a pass.

## What it costs (about $6 a month)

| Item                                                                                                     | Estimate                     |
| -------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Cloudflare Workers Paid, which also covers Containers, Email Sending, D1 and R2 at this size             | $5                           |
| Test domain                                                                                              | about $1 ($10 to $15 a year) |
| The two mailboxes (`coworker-mailbox`)                                                                         | $0                           |
| Containers beyond the included allowance (a nightly run is a few minutes)                                | $0                           |
| Outbound email beyond the included 3,000 a month                                                         | $0                           |
| GitHub organization, App, machine user                                                                   | $0                           |
| Anthropic key for the optional nightly smoke test                                                        | cents                        |

## Running it every night

Give the runner the settings as its own secrets (the names are in `.dev.vars.example`), and a `CLOUDFLARE_API_TOKEN` (step 1) if
it also deploys. The book's `GH_APP_ID`, `GH_APP_PRIVATE_KEY` and `GH_WEBHOOK_SECRET` are the
staging Worker's `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY` and `GITHUB_WEBHOOK_SECRET`.

## Limits to know

- A sandbox's setup is kept as a Cloudflare **container snapshot**. Snapshots are in public beta and expire. When one is gone,
  a command says so ("The kept setup is gone") and the environment must be saved again, which runs its setup again. See
  `src/modules/sandboxes/README.md`.
- The token a sandbox command gets (`GH_TOKEN`) is made fresh for each command: for the repo of the Task's GitHub thread,
  or the manager's repo when it hears exactly one, and none otherwise. It is never written to a file or shown.
