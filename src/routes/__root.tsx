import type { ReactNode } from "react";
import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { Failed, Gone } from "~/modules/app/service.ts";
import css from "../styles.css?url";

function Document({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Theme theme={neutralTheme}>{children}</Theme>
        <Scripts />
      </body>
    </html>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [{ charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "Co-worker" }],
    links: [{ rel: "stylesheet", href: css }],
  }),
  shellComponent: Document,
  errorComponent: ({ error }) => (
    <Failed message={error instanceof Error ? error.message : String(error)} onReload={() => window.location.reload()} />
  ),
  notFoundComponent: () => <Gone kind="page" />,
});
