import type { ChatsView } from "~/modules/views-workspace/types.ts";
import { CHAT } from "./workspace-chat.ts";
import { CHATS } from "./workspace-chats.ts";
import { INBOX } from "./workspace-inbox.ts";
import { OVERVIEW } from "./workspace-overview.ts";
import { SHELL_FIXTURES } from "./workspace-shell.ts";
import { TREE_FIXTURES } from "./workspace-tree.ts";
import { read, type Fixture } from "./read.ts";

const CHATS_VIEW: ChatsView = { chats: CHATS };

/** The shell, Home, the inbox, the chats, the overview and the tree. */
export const WORKSPACE: readonly Fixture[] = [
  ...SHELL_FIXTURES,
  ...INBOX,
  read("/chats", {}, CHATS_VIEW),
  ...CHAT,
  ...OVERVIEW,
  ...TREE_FIXTURES,
];
