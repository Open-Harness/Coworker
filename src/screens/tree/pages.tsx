// astryx-template: table-tree
import { useState } from "react";
import { Card } from "@astryxdesign/core/Card";
import { Markdown } from "@astryxdesign/core/Markdown";
import { Section } from "@astryxdesign/core/Section";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { useHref } from "~/modules/page/service.ts";
import type { TreeView } from "~/modules/views-workspace/types.ts";

type Page = TreeView["pages"][number];

const panelId = (page: Page) => `root-${page.id.toLowerCase().replaceAll(" ", "-")}`;

/** The pages say where they link in the workspace's own paths; here they become addresses. */
const linked = (text: string, href: (to: string) => string): string =>
  text.replace(/\]\((\/[^)]*)\)/gu, (_, to: string) => `](${href(to)})`);

/** The co-worker's own pages, under the tree. The tabs swap the content in place, so they are a real tablist. */
export function PagesPanel({ pages }: { readonly pages: TreeView["pages"] }) {
  const href = useHref();
  const [chosen, setChosen] = useState<Page["id"]>("Playbook");
  const page = pages.find((one) => one.id === chosen) ?? pages[0];
  if (page === undefined) return null;
  return (
    <Card padding={0}>
      {/* `hasDivider` is a border on the TabList itself, so the inset goes inside it: the border still runs the card's full width. */}
      <Section variant="transparent" padding={0} paddingBlockStart={1}>
        <TabList
          value={page.id}
          onChange={(value) => setChosen(pages.find((one) => one.id === value)?.id ?? page.id)}
          role="tablist"
          size="sm"
          hasDivider
          style={{ paddingInline: "4px" }}
        >
          {pages.map((one) => (
            <Tab key={one.id} value={one.id} label={one.id} panelId={panelId(one)} />
          ))}
        </TabList>
      </Section>
      <Section variant="transparent" padding={6} id={panelId(page)}>
        <Markdown headingLevelStart={2} contentAlign="center">
          {linked(page.text, href)}
        </Markdown>
      </Section>
    </Card>
  );
}
