import { BookOpenIcon } from "@heroicons/react/24/outline";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { List, ListItem } from "@astryxdesign/core/List";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { DocumentRow, WorkspaceRow } from "~/modules/protocol/types.ts";
import type { LibraryProps } from "../types.ts";
import { documentIcon, documentKind } from "./DocumentCard.tsx";
import { Page, PageSection } from "./Page.tsx";

const allDocuments = (workspaces: readonly WorkspaceRow[]) =>
  workspaces
    .flatMap((workspace) => workspace.documents.map((document) => ({ workspace, document })))
    .toSorted((left, right) => right.document.updatedAt - left.document.updatedAt);

const archivedChats = (workspaces: readonly WorkspaceRow[]) =>
  workspaces.flatMap((workspace) =>
    workspace.chats.filter(({ archivedAt }) => archivedAt !== undefined).map((chat) => ({ workspace, chat })),
  );

function DocumentItem({
  document,
  workspace,
  href,
}: {
  readonly document: DocumentRow;
  readonly workspace: WorkspaceRow;
  readonly href: string;
}) {
  return (
    <ListItem
      label={document.title}
      description={`${documentKind(document.language)} · v${document.version} · ${workspace.name}`}
      startContent={<Icon icon={documentIcon(document.language)} size="sm" color="secondary" />}
      endContent={<Timestamp value={document.updatedAt / 1000} format="relative" />}
      href={href}
    />
  );
}

/** Every document, and whatever was archived. */
export function Library({ workspaces, links, onRestoreWorkspace, onRestoreChat }: LibraryProps) {
  const documents = allDocuments(workspaces);
  const chats = archivedChats(workspaces);
  const archived = workspaces.filter(({ archivedAt }) => archivedAt !== undefined);
  return (
    <Page title="Library" description="Documents the assistant wrote, and what was archived.">
      <PageSection title="Documents">
        {documents.length === 0 ? (
          <EmptyState
            title="No documents yet"
            description="Ask the assistant to write something down and it appears here."
            icon={<Icon icon={BookOpenIcon} size="lg" />}
            headingLevel={3}
          />
        ) : (
          <List hasDividers edge="flush">
            {documents.map(({ workspace, document }) => (
              <DocumentItem
                key={`${workspace.id} ${document.id}`}
                document={document}
                workspace={workspace}
                href={links.document(workspace.id, document)}
              />
            ))}
          </List>
        )}
      </PageSection>
      {archived.length + chats.length > 0 && (
        <PageSection title="Archived">
          <List hasDividers edge="flush">
            {archived.map(({ id, name }) => (
              <ListItem
                key={id}
                label={name}
                description="Workspace"
                endContent={<Button label="Restore" size="sm" onClick={() => onRestoreWorkspace(id)} />}
              />
            ))}
            {chats.map(({ workspace, chat }) => (
              <ListItem
                key={`${workspace.id} ${chat.id}`}
                label={chat.title}
                description={`Chat · ${workspace.name}`}
                href={links.chat(workspace.id, chat.id)}
                endContent={<Button label="Restore" size="sm" onClick={() => onRestoreChat(workspace.id, chat.id)} />}
              />
            ))}
          </List>
        </PageSection>
      )}
    </Page>
  );
}
