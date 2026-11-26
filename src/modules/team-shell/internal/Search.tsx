import { useMemo } from "react";
import { CpuChipIcon, DocumentTextIcon, UserCircleIcon, ViewColumnsIcon } from "@heroicons/react/24/outline";
import { CommandPalette } from "@astryxdesign/core/CommandPalette";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import type { SearchableItem } from "@astryxdesign/core/Typeahead";
import { teamLinks } from "~/modules/team-core/service.ts";
import type { ManagerLink, SearchResult, ShellApi } from "../types.ts";

type Item = SearchableItem<{ readonly kind: SearchResult["kind"]; readonly about: string; readonly group: string }>;

const ICONS = { page: DocumentTextIcon, task: ViewColumnsIcon, manager: CpuChipIcon, person: UserCircleIcon } as const;
/** The palette lists a group's items together, in the order the groups first appear. */
const GROUPS = { task: "Tasks", page: "Mission pages", manager: "Managers", person: "People" } as const;
const ORDER = ["task", "page", "manager", "person"] as const;

function Row({ item }: { readonly item: Item }) {
  return (
    <HStack gap={3} vAlign="center" width="100%">
      <Icon icon={ICONS[item.auxiliaryData?.kind ?? "task"]} size="sm" color="secondary" />
      <StackItem size="fill">
        <VStack gap={0}>
          <Text maxLines={1}>{item.label}</Text>
          <Text type="supporting" maxLines={1}>
            {item.auxiliaryData?.about ?? ""}
          </Text>
        </VStack>
      </StackItem>
    </HStack>
  );
}

/** Where a result opens: a task on its own page, a page in the Mission, a manager on its board, a person where People lists them. */
function addressOf(workspaceId: string, hit: SearchResult): string {
  switch (hit.kind) {
    case "task":
      return teamLinks.task(workspaceId, hit.managerId, hit.id);
    case "page":
      return teamLinks.mission(workspaceId, hit.managerId, hit.id);
    case "manager":
      return teamLinks.board(workspaceId, hit.id);
    case "person":
      return teamLinks.people(workspaceId);
  }
}

function itemOf(workspaceId: string, managers: readonly ManagerLink[], hit: SearchResult): Item {
  const manager = managers.find(({ managerId }) => managerId === hit.managerId)?.name ?? "";
  const words = hit.snippet === "" || hit.snippet === hit.title ? "" : hit.snippet;
  const where = hit.kind === "task" ? `${manager} · Task` : hit.kind === "page" ? `${manager} · Mission page` : "";
  return {
    id: `${hit.kind}:${addressOf(workspaceId, hit)}`,
    label: hit.kind === "task" ? `${hit.id} ${hit.title}` : hit.title,
    auxiliaryData: {
      kind: hit.kind,
      group: GROUPS[hit.kind],
      about: [where, words].filter((part) => part !== "").join(" · ") || GROUPS[hit.kind].replace(/s$/u, ""),
    },
  };
}

/** Finds tasks, mission pages, managers and people. Arrow keys move through the results and Enter opens one. */
export function Search({
  api,
  workspaceId,
  managers,
  isOpen,
  onOpenChange,
  onGo,
}: {
  readonly api: ShellApi;
  readonly workspaceId: string;
  readonly managers: readonly ManagerLink[];
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly onGo: (address: string) => void;
}) {
  const source = useMemo(
    () => ({
      bootstrap: (): Item[] => [],
      search: async (query: string): Promise<Item[]> => {
        const found = await api.search(workspaceId, query);
        if (found._tag !== "Loaded") return [];
        const byKind = (hit: SearchResult) => ORDER.indexOf(hit.kind);
        return found.value.toSorted((a, b) => byKind(a) - byKind(b)).map((hit) => itemOf(workspaceId, managers, hit));
      },
    }),
    [api, managers, workspaceId],
  );
  return (
    <CommandPalette
      label="Search"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      searchSource={source}
      emptyBootstrapText="Search tasks, mission pages, managers and people"
      renderItem={(item) => <Row item={item} />}
      onValueChange={(value) => {
        onOpenChange(false);
        onGo(value.slice(value.indexOf(":") + 1));
      }}
    />
  );
}
