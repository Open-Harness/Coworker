import { createContext, type ReactNode, use } from "react";
import type { Browser } from "../types.ts";

const BrowserContext = createContext<Browser | undefined>(undefined);

/** Gives what the browser does to every screen under it. */
export const BrowserProvider = ({ browser, children }: { readonly browser: Browser; readonly children: ReactNode }) => (
  <BrowserContext value={browser}>{children}</BrowserContext>
);

export function useBrowser(): Browser {
  const browser = use(BrowserContext);
  if (browser === undefined) throw new Error("A screen of the app was drawn outside BrowserProvider");
  return browser;
}
