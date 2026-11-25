import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { ChatComposer } from "@astryxdesign/core/Chat";
import { ClickableCard } from "@astryxdesign/core/ClickableCard";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Grid } from "@astryxdesign/core/Grid";
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useReport, useSession } from "~/modules/app/service.ts";
import type { AgentTemplate } from "../types.ts";
import { ConfigText } from "./ConfigText.tsx";
import { adminLinks } from "./links.ts";
import { toolNames } from "./names.ts";
import { templates } from "./templates.ts";

function TemplateCard({ template, onPick }: { readonly template: AgentTemplate; readonly onPick: () => void }) {
  const { name, description, tools } = template.config;
  return (
    <ClickableCard label={name} variant="muted" padding={4} height="100%" onClick={onPick}>
      <VStack gap={2}>
        <Heading level={3}>{name}</Heading>
        <Text color="secondary">{description}</Text>
        <Text type="supporting" color="secondary">
          {tools.length === 0 ? "No tools" : toolNames(tools)}
        </Text>
      </VStack>
    </ClickableCard>
  );
}

function TemplateDialog({ template, onClose }: { readonly template: AgentTemplate | undefined; readonly onClose: () => void }) {
  return (
    <Dialog isOpen={template !== undefined} onOpenChange={(open) => !open && onClose()} width={760}>
      {template !== undefined && (
        <Layout
          header={
            <DialogHeader title={template.config.name} subtitle={template.config.description} onOpenChange={onClose} hasDivider={false} />
          }
          content={
            <LayoutContent>
              <ConfigText config={template.config} />
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={2} hAlign="end">
                <Button label="Cancel" variant="ghost" onClick={onClose} />
                <Button label="Use this template" variant="primary" href={adminLinks.template(template.key)} />
              </HStack>
            </LayoutFooter>
          }
        />
      )}
    </Dialog>
  );
}

/** Where an agent begins: a description, a template, or nothing. */
export function CreateScreen() {
  const { directory } = useSession();
  const report = useReport();
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [isDrafting, setIsDrafting] = useState(false);
  const [shown, setShown] = useState<AgentTemplate>();
  const draft = async (text: string) => {
    if (text.trim() === "" || isDrafting) return;
    setIsDrafting(true);
    const config = await report(directory.draftAgent(text.trim()));
    setIsDrafting(false);
    // Plain data: the history entry is copied by the browser.
    if (config !== undefined) router.history.push(adminLinks.blank, { draft: config } as object);
  };
  return (
    <Layout
      height="fill"
      contentWidth={960}
      padding={6}
      content={
        <LayoutContent>
          <Center axis="horizontal">
            <VStack gap={8} width="100%">
              <VStack gap={1} hAlign="center">
                <Heading level={1}>What should the agent do?</Heading>
                <Text color="secondary">Describe it, or pick a template to start from.</Text>
              </VStack>
              <ChatComposer
                value={description}
                onChange={setDescription}
                onSubmit={(text) => void draft(text)}
                placeholder="Reads our changelog every Monday and writes a summary for customers…"
                isDisabled={isDrafting}
                {...(isDrafting ? { status: { type: "warning" as const, message: "Writing the agent…" } } : {})}
              />
              <Grid columns={{ minWidth: 260 }} gap={4}>
                {templates.map((template) => (
                  <TemplateCard key={template.key} template={template} onPick={() => setShown(template)} />
                ))}
              </Grid>
              <Center axis="horizontal">
                <Text color="secondary">
                  Or <Link href={adminLinks.blank}>start from a blank agent</Link>.
                </Text>
              </Center>
            </VStack>
          </Center>
          <TemplateDialog template={shown} onClose={() => setShown(undefined)} />
        </LayoutContent>
      }
    />
  );
}
