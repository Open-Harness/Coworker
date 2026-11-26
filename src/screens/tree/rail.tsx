// astryx-template: table-tree
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Badge } from "@astryxdesign/core/Badge";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { Link } from "@astryxdesign/core/Link";
import { Token } from "@astryxdesign/core/Token";
import { BanknotesIcon, BeakerIcon, EyeIcon, PencilSquareIcon, TagIcon } from "@heroicons/react/24/outline";
import { useGo, useHref } from "~/modules/page/service.ts";
import type { TreeRow, TreeView } from "~/modules/views-workspace/types.ts";

const MAY_DO = [
  { label: "Read every board and every number", icon: EyeIcon },
  { label: "Write notes and what changed", icon: PencilSquareIcon },
  { label: "Try a new version on past work", icon: BeakerIcon },
];

const once = (all: readonly (readonly string[])[]): string[] => [...new Set(all.flat())];

interface AboutProps {
  readonly view: TreeView;
  readonly root: TreeRow;
  /** The versions of every manager, added. */
  readonly versions: number;
  readonly day: (at: number) => string;
}

/** What the co-worker is, what it has handed out, its versions, and who answers for it. */
export function AboutPanel({ view, root, versions, day }: AboutProps) {
  const [go, href] = [useGo(), useHref()];
  const trying = view.trying[0];
  const trial = trying === undefined ? undefined : view.rows.find((row) => row.id === trying.manager);
  const handedOut = view.rows.reduce((total, row) => total + row.limit, 0);
  return (
    <VStack gap={6}>
      <VStack gap={3}>
        <Heading level={3} accessibilityLevel={2}>
          What Juno is
        </Heading>
        <Text color="secondary">{root.job}. It does not do the work itself: it makes the managers that do.</Text>
        {/* Topics are chips you can click, which rules out Badge: its docs name clickable badges as an anti-pattern. */}
        <Text type="label" color="secondary">
          Connectors it has handed out
        </Text>
        <HStack gap={1} wrap="wrap">
          {once(view.rows.map((row) => row.connectors)).map((name) => (
            <Token key={name} size="sm" label={name} onClick={() => go("/settings/connectors")} />
          ))}
        </HStack>
        <Text type="label" color="secondary">
          MCP servers it has handed out
        </Text>
        <HStack gap={1} wrap="wrap">
          {once(view.rows.map((row) => row.mcp)).map((name) => (
            <Token key={name} size="sm" label={name} onClick={() => go("/settings/mcp-servers")} />
          ))}
        </HStack>
        {/* Not a List: ListItem hangs its text further in, and this column needs a single left edge. */}
        <Text type="label" color="secondary">
          What it may do on its own
        </Text>
        <VStack gap={2}>
          {MAY_DO.map((item) => (
            <HStack key={item.label} gap={2} vAlign="center">
              <Icon icon={item.icon} size="sm" color="secondary" />
              <Text>{item.label}</Text>
            </HStack>
          ))}
        </VStack>
        <VStack gap={2}>
          <HStack gap={2} vAlign="center">
            <Icon icon={BanknotesIcon} size="sm" color="secondary" />
            <Link href={href("/juno/spending")}>${root.cost} spent in 7 days</Link>
          </HStack>
          <HStack gap={2} vAlign="center">
            <Icon icon={BanknotesIcon} size="sm" color="secondary" />
            <Link href={href("/juno/spending")}>${handedOut} a week handed out</Link>
          </HStack>
        </VStack>
      </VStack>

      <Divider />

      <VStack gap={3}>
        <Heading level={3} accessibilityLevel={2}>
          Versions
        </Heading>
        <HStack gap={2} vAlign="center">
          <Icon icon={TagIcon} size="sm" color="secondary" />
          <Text weight="bold">Version {root.version}</Text>
          <Badge label="Current" variant="neutral" />
        </HStack>
        <Text type="supporting" color="secondary">
          Changed {day(root.changed)} · {versions} versions
        </Text>
        {trying === undefined || trial === undefined ? null : (
          <>
            <HStack gap={2} vAlign="center">
              <Icon icon={TagIcon} size="sm" color="secondary" />
              <Link href={href(`/m/${trial.id}`)}>{`Version ${trying.version} of ${trial.name}`}</Link>
              <Token size="sm" color="blue" label="Trying" />
            </HStack>
            <Text type="supporting" color="secondary">
              {`On ${trying.cases} past mails, beside version ${trying.against}`}
            </Text>
          </>
        )}
      </VStack>

      <Divider />

      <VStack gap={3}>
        <Heading level={3} accessibilityLevel={2}>
          Who answers for the system
        </Heading>
        {/* AvatarGroup overlaps its children by design, which fights a wrapping grid: a plain wrapped row of avatars. */}
        <HStack gap={1} wrap="wrap">
          {view.answers.map((person) => (
            <Avatar key={person.id} name={person.name} size={32} />
          ))}
        </HStack>
        <Text type="supporting" color="secondary">
          {view.answers.map((person) => `${person.name} (${person.role.toLowerCase()})`).join(", ")}
        </Text>
      </VStack>
    </VStack>
  );
}
