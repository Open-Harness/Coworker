import { Heading, Text } from "@astryxdesign/core/Text";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { VStack } from "@astryxdesign/core/Layout";
import { Token } from "@astryxdesign/core/Token";
import { useHref } from "~/modules/page/service.ts";

/** The draft so far, part by part, and which skill wrote the steps. */
export function Guide({
  parts,
  step,
  skill,
  who,
}: {
  parts: readonly { part: string; says: string; isNew: boolean }[];
  step: number;
  skill: { skill: string; version: number };
  who: string;
}) {
  const skillsHref = useHref()("/juno/skills");
  return (
    <VStack gap={3}>
      <Heading level={5} accessibilityLevel={3}>
        The draft so far
      </Heading>
      <List density="compact">
        {parts.map((p) => (
          <ListItem
            key={p.part}
            label={
              <Text type="body" color={p.says ? "primary" : "secondary"}>
                {p.part}
              </Text>
            }
            description={
              <Text type="supporting" color="secondary">
                {p.says || "Nothing yet"}
              </Text>
            }
            endContent={step > 0 && p.isNew ? <Token size="sm" color="blue" label="New" /> : undefined}
          />
        ))}
      </List>
      <VStack gap={0}>
        <Text type="supporting" color="secondary">
          Written by a skill of {who}’s, version {skill.version}:
        </Text>
        <Link href={skillsHref} type="supporting">
          {skill.skill}
        </Link>
      </VStack>
    </VStack>
  );
}
