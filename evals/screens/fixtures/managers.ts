import type { ManagerOverview } from "~/modules/views-manager/types.ts";
import { CODING } from "./managers-overview-coding.ts";
import { DOCS, RELEASES, SUPPORT, WHATSAPP } from "./managers-overview-others.ts";
import { SALES } from "./managers-overview-sales.ts";
import { CODING_BOARD } from "./managers-coding-board.ts";
import { CODING_SETTINGS } from "./managers-coding-settings.ts";
import { CODING_THREAD } from "./managers-coding-thread.ts";
import { CODING_THREADS } from "./managers-coding-threads.ts";
import { CODING_WORK } from "./managers-coding-work.ts";
import { DOCS_INTAKE } from "./managers-docs-intake.ts";
import { SALES_BOARD } from "./managers-sales-board.ts";
import { SALES_INTAKE } from "./managers-sales-intake.ts";
import { SALES_SIGNS } from "./managers-sales-trigger.ts";
import { read, type Fixture } from "./read.ts";

/* What a manager's pages read: its overview (also read by its connectors tab and its frame), and the pages the drawings show. */

const overview = (manager: string, value: ManagerOverview): Fixture => read("/m/:manager", { manager }, value);

export const MANAGERS: readonly Fixture[] = [
  overview("sales", SALES),
  overview("coding", CODING),
  overview("docs", DOCS),
  overview("releases", RELEASES),
  overview("support", SUPPORT),
  overview("whatsapp", WHATSAPP),
  SALES_INTAKE,
  DOCS_INTAKE,
  SALES_SIGNS,
  SALES_BOARD,
  CODING_BOARD,
  CODING_WORK,
  CODING_THREADS,
  CODING_THREAD,
  CODING_SETTINGS,
];
