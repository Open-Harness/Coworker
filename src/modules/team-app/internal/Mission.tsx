import { useCallback, useState } from "react";
import { PencilSquareIcon } from "@heroicons/react/24/outline";
import { Banner } from "@astryxdesign/core/Banner";
import { Breadcrumbs, BreadcrumbItem } from "@astryxdesign/core/Breadcrumbs";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { Divider } from "@astryxdesign/core/Divider";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import { Load, teamLinks, useBrowser, useLoading, useNarrow } from "~/modules/team-core/service.ts";
import type { Allowed, MissionScreenProps, PageData, PageEdit } from "../types.ts";
import { useTeamApi } from "./context.ts";
import { PageEditor } from "./PageEditor.tsx";

const REFRESH_MS = 5_000;

/** A page that opens with its own title as a heading would say it twice. */
const withoutTitle = ({ title, body }: PageData): string => {
  const [first = "", ...rest] = body.trimStart().split("\n");
  return first.replace(/^#+\s*/u, "").trim() === title.trim() ? rest.join("\n") : body;
};

/** The mission first, then the pages under it. */
function Pages({
  workspaceId,
  managerId,
  pages,
  openId,
}: Pick<MissionScreenProps, "workspaceId" | "managerId" | "pages"> & { readonly openId: string | undefined }) {
  return (
    <List density="compact">
      {[...pages]
        .toSorted((a, b) => Number(a.parent !== undefined) - Number(b.parent !== undefined))
        .map(({ id, title, parent }) => (
          <ListItem
            key={id}
            label={title}
            description={parent === undefined ? "Mission" : "Page"}
            href={teamLinks.mission(workspaceId, managerId, id)}
            isSelected={id === openId}
          />
        ))}
    </List>
  );
}

const READ_ONLY = "You can read this page. An Owner has not let you edit it.";

/** One page: who changed it last and when, its text, and a way to edit it when the person may. */
function Reading({
  page,
  allowed,
  onSave,
}: {
  readonly page: PageData;
  readonly allowed: Allowed;
  readonly onSave: MissionScreenProps["onSave"];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const canEdit = allowed !== "off" && onSave !== undefined;
  return (
    <VStack gap={4}>
      <HStack gap={3} vAlign="start" hAlign="between" wrap="wrap">
        <VStack gap={1}>
          <Heading level={2}>{page.title}</Heading>
          <Text type="supporting">
            {page.updatedBy === "" ? "Updated " : `Updated by ${page.updatedBy} `}
            <Timestamp value={Math.floor(page.updatedAt / 1000)} format="relative" />
          </Text>
        </VStack>
        {canEdit && !isEditing && (
          <Button
            label="Edit"
            icon={<Icon icon={PencilSquareIcon} size="sm" />}
            onClick={() => {
              setWaiting(false);
              setIsEditing(true);
            }}
          />
        )}
      </HStack>
      {waiting && (
        <Banner
          status="info"
          title="Waiting for an Owner"
          description="They were asked to approve your change. The page changes once they do."
        />
      )}
      {isEditing && onSave !== undefined ? (
        <PageEditor
          page={page}
          allowed={allowed}
          onSave={onSave}
          onClose={(result) => {
            setIsEditing(false);
            setWaiting(result?._tag === "Waiting");
          }}
        />
      ) : page.body.trim() === "" ? (
        <Text color="secondary">This page is empty. Edit it here, or tell the manager what to write in its chat.</Text>
      ) : (
        <Markdown headingLevelStart={3}>{withoutTitle(page)}</Markdown>
      )}
      {onSave !== undefined && allowed === "off" && <Text type="supporting">{READ_ONLY}</Text>}
    </VStack>
  );
}

/** A manager's mission and the pages under it. The manager writes them, and so may a person the workspace lets. */
export function MissionScreen({ workspaceId, managerId, managerName, pages, pageId, can, onSave }: MissionScreenProps) {
  const mission = pages.find(({ parent }) => parent === undefined);
  const page = pages.find(({ id }) => id === pageId) ?? mission ?? pages[0];
  const isNarrow = useNarrow();
  const list = <Pages workspaceId={workspaceId} managerId={managerId} pages={pages} openId={page?.id} />;
  const allowed = page === undefined || can === undefined ? "off" : page.parent === undefined ? can.mission : can.page;
  const reading =
    page === undefined ? <EmptyState title="No mission yet" /> : <Reading key={page.id} page={page} allowed={allowed} onSave={onSave} />;
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader padding={4} hasDivider>
          <VStack gap={1}>
            <Breadcrumbs variant="supporting">
              <BreadcrumbItem>{managerName}</BreadcrumbItem>
              <BreadcrumbItem isCurrent>Mission</BreadcrumbItem>
            </Breadcrumbs>
            <Heading level={1}>Mission</Heading>
          </VStack>
        </LayoutHeader>
      }
      {...(isNarrow
        ? {}
        : {
            start: (
              <LayoutPanel width={260} padding={2} hasDivider label="Pages">
                {list}
              </LayoutPanel>
            ),
          })}
      content={
        <LayoutContent padding={isNarrow ? 4 : 6}>
          {/* The page keeps its place when the screen turns narrow, so a text being written is not lost with it. */}
          <VStack gap={isNarrow ? 6 : 0}>
            {isNarrow && pages.length > 1 ? list : null}
            {isNarrow && pages.length > 1 ? <Divider /> : null}
            {reading}
          </VStack>
        </LayoutContent>
      }
    />
  );
}

/** Loads a manager's pages and keeps them fresh while they are open. */
export function MissionPage({ workspaceId, managerId, pageId }: Pick<MissionScreenProps, "workspaceId" | "managerId" | "pageId">) {
  const api = useTeamApi();
  const { newId } = useBrowser();
  const { loaded: board } = useLoading(useCallback(() => api.board(workspaceId, managerId), [api, workspaceId, managerId]));
  const { loaded, reload } = useLoading(
    useCallback(() => api.pages(workspaceId, managerId), [api, workspaceId, managerId]),
    REFRESH_MS,
  );
  /** Whatever came of it, the pages are asked for again: a refused save is a page that changed. */
  const save = async (edit: PageEdit) => {
    const saved = await api.savePage(workspaceId, managerId, edit, newId());
    reload();
    return saved;
  };
  return (
    <Load loaded={board} failedTitle="The mission did not load">
      {({ managerName }) => (
        <Load loaded={loaded} failedTitle="The mission did not load">
          {({ pages, can }) => (
            <MissionScreen
              workspaceId={workspaceId}
              managerId={managerId}
              managerName={managerName}
              pages={pages}
              can={can}
              onSave={save}
              {...(pageId === undefined ? {} : { pageId })}
            />
          )}
        </Load>
      )}
    </Load>
  );
}
