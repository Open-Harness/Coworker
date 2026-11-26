import type { ManagerOverview } from "~/modules/views-manager/types.ts";
import { at } from "./read.ts";
import { head, NOW, sixTiles } from "./managers-kit.ts";

/* The managers whose overview is not drawn but is read: for their tabs, and for what a new manager shows (Releases). */

type Plain = Pick<ManagerOverview, "said" | "says" | "by" | "connectors">;

const waiting = (why: string, until: string): ManagerOverview["standing"] => ({ _tag: "NotYet", until: at(until), why }) as const;

function plain(id: string, standing: ManagerOverview["standing"], base: Plain, notYet: readonly string[] = []): ManagerOverview {
  return {
    head: head(id),
    ...base,
    standing,
    unit: "",
    brought: [],
    measures: [],
    worse: [],
    lost: { steps: [], most: null },
    lostWhy: [],
    readAt: NOW,
    tiles: sixTiles(id, notYet),
    tilesNotYet: notYet.map((tile) => ({ tile, from: at("30 Nov 07:00") })),
    rail: [],
  };
}

const connector = (id: string, name: string, as: string, works = true, says = "Connected") => ({
  id,
  name,
  as,
  works,
  says,
  in: 0,
  out: 0,
});

export const RELEASES = plain(
  "releases",
  waiting("Releases is new. It has made one release, and some numbers need more than one to mean anything.", "30 Nov 07:00"),
  {
    said: "Cut a release every second Thursday, and tell people.",
    says: "v2.3 out on 26 November",
    by: { person: "Ama Mensah", at: at("18 Nov 12:00") },
    connectors: [connector("github", "GitHub", "acme/web"), connector("email", "Email", "juno@acme.co-worker.tech")],
  },
  ["sent-back"],
);

export const DOCS = plain("docs", waiting("Docs has no number to read yet.", "30 Nov 07:00"), {
  said: "Keep the docs true after each merge.",
  says: "Docs within a day of the merge",
  by: { person: "Chidi Okafor", at: at("3 Nov 12:00") },
  connectors: [connector("github", "GitHub", "acme/web")],
});

export const SUPPORT = plain("support", waiting("Support has no number to read yet.", "30 Nov 07:00"), {
  said: "Answer customers, and hand bugs to Coding.",
  says: "Answer in 2 hours",
  by: { person: "Ama Mensah", at: at("9 Nov 12:00") },
  connectors: [
    connector("email", "Email", "juno@acme.co-worker.tech"),
    connector("whatsapp", "WhatsApp", "+44 7700 900123", false, "offline since 08:10"),
  ],
});

export const WHATSAPP = plain("whatsapp", waiting("The desk has no number to read yet.", "30 Nov 07:00"), {
  said: "First answer on WhatsApp.",
  says: "Answer in 30 minutes",
  by: { person: "Ama Mensah", at: at("9 Nov 12:00") },
  connectors: [connector("whatsapp", "WhatsApp", "+44 7700 900123", false, "offline since 08:10")],
});
