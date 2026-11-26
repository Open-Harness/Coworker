import { Badge } from "@astryxdesign/core/Badge";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Collapsible, CollapsibleGroup } from "@astryxdesign/core/Collapsible";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { CheckCircleIcon, ClockIcon, XCircleIcon } from "@heroicons/react/24/outline";
import type { Check, FileChange, Thread } from "./data";

/** What ran on the pull request, and how it ended. */
export function Checks({ checks }: { checks: readonly Check[] }) {
  return (
    <VStack gap={0}>
      {checks.map((c, i) => (
        <VStack key={c.name} gap={0}>
        {i > 0 ? <Divider /> : null}
        <HStack gap={3} vAlign="center" paddingBlock={3}>
          <Icon icon={c.result === "failed" ? XCircleIcon : c.result === "running" ? ClockIcon : CheckCircleIcon} size="sm" color={c.result === "failed" ? "red" : "gray"} label={c.result} />
          <StackItem size="fill"><VStack gap={0}><Text type="label">{c.name}</Text><Text type="supporting" color="secondary">{c.what}</Text></VStack></StackItem>
          <Text type="supporting" color="secondary" hasTabularNumbers>{c.took}</Text>
        </HStack>
        </VStack>
      ))}
    </VStack>
  );
}

/** Each file with what changed in it, and where review comments sit on it. */
export function Files({ files, threads }: { files: readonly FileChange[]; threads: readonly Thread[] }) {
  return (
    <CollapsibleGroup type="multiple" defaultValue={[files[0]?.path ?? ""]} hasDividers>
      {files.map((f) => {
        const here = threads.filter((t) => t.file === f.path);
        return (
          <Collapsible key={f.path} value={f.path}
            trigger={
              <HStack gap={2} vAlign="center" paddingInlineEnd={2}>
                <StackItem size="fill"><Text type="label" maxLines={1}>{f.path}</Text></StackItem>
                {here.length > 0 ? <Badge label={`${here.length} comments`} variant="neutral" /> : null}
                <Text type="supporting" color="secondary" hasTabularNumbers>+{f.added} −{f.removed}</Text>
              </HStack>
            }>
            <VStack gap={2}>
              <CodeBlock code={f.patch} language={f.path.endsWith(".md") ? "markdown" : "ts"} isDiff hasLanguageLabel={false} size="sm" width="100%" />
              {here.map((t) => <Text key={t.id} type="supporting" color="secondary">Line {t.line}: {t.comments[0]?.body} {t.answered ? "Answered." : "Open."}</Text>)}
            </VStack>
          </Collapsible>
        );
      })}
    </CollapsibleGroup>
  );
}
