# ui

Owns the pieces of the page that no screen owns: the charts, and the root's `Failed` and `Gone`. The first product's chat pieces (navigation, transcript, composer, documents) were removed with its core on 26 November.

Read `types.ts` for what each piece takes. Everything drawn is an Astryx component; `pnpm check:ui` fails on a raw
element, a class, a style, or another component library. A piece lives here only when Astryx has no component that does
its job alone.

Invariants

- Props in, callbacks out. No sockets, routes, stores or storage.
- Every place to go is a link, so it can be opened in a tab, copied and bookmarked.
- What cannot be undone asks first.
- `Chart` (`LineChart`, `BarChart`, `DonutChart`): Astryx has no chart component, so the pictures are drawn by recharts.
  Only `internal/Chart.tsx` may import it (`pnpm check:ui` refuses it anywhere else), and `internal/ChartFrame.tsx` loads
  that file on demand, so the library is not in the first bundle of any page. Colours are named (`blue`, `green`…) and become
  Astryx's `--color-data-categorical-*` tokens, passed through recharts' own stroke and fill props; text follows the theme in
  dark mode. Every chart has an accessible name (`label`), a legend, and the same numbers as a visually hidden table; a
  chart with nothing to show (every number zero, or one lonely point for a line) is a sentence instead.

Test: `pnpm vitest --run --project page src/modules/ui`
