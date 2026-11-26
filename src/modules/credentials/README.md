# credentials

The live tier's credentials: which there are, who supplies each, and the one place they are kept.

**Owns**

- The list (`all`, `list`, `toAsk`): three a person gives, seven from making the GitHub App, three made here, six worked out.
- Checking an answer (its shape, then its own service) before it is kept, and keeping what follows from it.
- `bitwarden`: one secure note (`Co-worker staging`), through the `bw` program, which is free.

**Invariants**

- A value is never printed, never an argument of a program, and never in a file. It goes to `bw` on its standard input.
  A command that needs values (`pnpm credentials run`) gets them as its own environment, for that command alone.
- A reason never repeats what was typed.
- `VAULT_MASTER_KEY` is made once. A new one would lose every vault on staging.
- A write is read back and compared, so a value Bitwarden changed or dropped is said, not found out later.

**Outside things**: `Store`, `Run`, `Probe`, injected by `src/bin/credentials.ts`, the composition root. It also has the
terminal, the browser and the page that makes the GitHub App (`src/bin/credentials-terminal.ts`).

**Testing**: `credentials.test.ts`, with `fakeStore` and a scripted `bw`. No network, no Bitwarden.
