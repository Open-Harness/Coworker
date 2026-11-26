import { createFileRoute } from "@tanstack/react-router";
import { Console } from "../browser.tsx";

export const Route = createFileRoute("/")({ ssr: false, component: Console });
