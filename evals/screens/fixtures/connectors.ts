import type { Fixture } from "./read.ts";
import { CRM } from "./connectors-crm.ts";
import { EMAIL, EMAIL_OPEN } from "./connectors-email.ts";
import { GITHUB } from "./connectors-github.ts";
import { GITHUB_418 } from "./connectors-github-418.ts";
import { SLACK } from "./connectors-slack.ts";
import { WHATSAPP, WHATSAPP_DESK, WHATSAPP_OPEN } from "./connectors-whatsapp.ts";

/* What each connector's own view reads: the list, and the one conversation, deal or item its drawing has open. */
export const CONNECTORS: readonly Fixture[] = [CRM, EMAIL, EMAIL_OPEN, WHATSAPP, WHATSAPP_DESK, WHATSAPP_OPEN, SLACK, GITHUB, GITHUB_418];
