# Draw a screen

Everything drawn is here: `src/screens`, one folder per screen, one sample story in `src/world.ts` (and `src/sales.ts`,
`src/juno/world.ts`). The words, colours and rules are in [../docs/design.md](../docs/design.md): it wins over everything.

## Adapt a template, do not invent

1. `pnpm exec astryx template <name>` prints a template. **Copy it, then change it.** Keep its layout, components, spacing, inline and
   StyleX styles, responsive behaviour, keyboard and empty states. First line of `index.tsx`: `// astryx-template: <name>`.
   For a page in Settings or About Juno, follow the pages that are there (`settings/general.tsx`, `juno/parts.tsx`, `juno/triggers.tsx`).
2. Change the data, the words, which columns and fields there are, what buttons do. Leave out a part only when it means nothing here.
3. No styling the template does not have. Only `@astryxdesign/core/*`, `@heroicons/react/24/outline` (in place of lucide), and recharts
   where the template has it. Colours from theme variables, never hex.
4. It sits under our shell, in a pane: `100vh` becomes `100%`. The manager's name and tabs, or Settings' list, are already there.
5. **It must agree with the story**: names, numbers, dates. Today is 25 November 2026, 09:54. New facts go in the screen's own `data.ts`.
   Data is kept apart from layout, as plain typed arrays: the app will get the same shape from its API.
6. Click-through works in local state: a filter filters, a menu opens, Save is off until something changed.
7. 1440, 390 and dark all right. Nothing scrolls sideways; a table that does not fit drops columns, then folds a row into lines.
8. Copy: plain words, short, sentence case, second person. No jargon, no em dashes. Yellow only where it waits for a person, red only
   where something is wrong or below its line; a badge is solid only for what waits. Grey for everything else.
9. Files under 250 lines. No home paths, no real names or addresses.

## Look at it

From the repo root: `PORT=<yours> node design/shot.mjs <folder outside the repo> <hash>…` writes 1440, phone and dark pictures and
says what went wrong. Look at all three, and compare with its nearest drawn neighbour. Fix what is worse: clipped or wrapped labels,
empty areas, columns that do not line up, two things with the same weight.
