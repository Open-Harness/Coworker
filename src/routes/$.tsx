import { createFileRoute } from "@tanstack/react-router";
import { Console } from "../browser.tsx";

/** Every address the console has: `browser.tsx` finds the page, by the folders in `src/screens`. */
export const Route = createFileRoute("/$")({ ssr: false, component: Console });
