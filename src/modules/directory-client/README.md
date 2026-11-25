# directory-client

Owns the page's copy of the directory: workspaces with their chats and documents, people online, models, and who I am.

Invariants

- Workspaces are pinned first, then oldest first, whatever order events arrive in.
- A snapshot replaces everything; `loaded` tells "nothing yet" from "nothing".
- The page picks a new workspace's id, so sending the command again after a reconnect creates one workspace.

Test: `pnpm vitest --run src/modules/directory-client`
