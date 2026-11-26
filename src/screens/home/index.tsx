// astryx-template: ai-chat-landing
import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { HStack, Layout, LayoutContent, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { Reading, useApi, useBrowser, useClock, useGo, useRead } from "~/modules/page/service.ts";
import type { Clock } from "~/modules/page/types.ts";
import type { HomeView, ShellView } from "~/modules/views-workspace/types.ts";
import { Cards } from "./cards.tsx";
import { Composer, useComposerInput } from "./composer.tsx";

const fill = { minHeight: "100%" } as const;

const greeting = (clock: Clock): string => {
  const hour = Number(clock.time(clock.now()).slice(0, 2));
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};

/** What the person says to the co-worker, and what it can be asked to do first. */
function Home({ shell, home }: { readonly shell: ShellView; readonly home: HomeView }) {
  const [category, setCategory] = useState<HomeView["suggestions"][number]["category"] | null>("set");
  const input = useComposerInput();
  const [api, go, { newId }, clock] = [useApi(), useGo(), useBrowser(), useClock()];
  const send = async (text: string) => {
    const made = await api.write("/chats", { text, key: newId() });
    if (made._tag === "Ok") go(`/chats/${made.value.chat}`);
  };
  const pick = (one: HomeView["suggestions"][number]) => {
    if (one.link !== null) return go(one.link);
    input.current?.focus();
    input.current?.insertText(one.prompt);
  };
  return (
    <Layout
      height="fill"
      contentWidth={720}
      padding={6}
      content={
        <LayoutContent role="main">
          <VStack gap={8} vAlign="center" style={fill}>
            <VStack gap={1}>
              <HStack gap={2} vAlign="center">
                <Avatar name={shell.coworker.name} size={24} tooltip={false} />
                <Text type="large" as="h2">
                  {greeting(clock)}, {shell.me.name.split(" ")[0]}
                </Text>
              </HStack>
              <Text type="display-2" as="h1">
                What should I do?
              </Text>
            </VStack>
            <Composer shell={shell} input={input} onSubmit={(text) => void send(text)} />
            <Cards suggestions={home.suggestions} category={category} onCategory={setCategory} onPick={pick} />
          </VStack>
        </LayoutContent>
      }
    />
  );
}

export default function HomePage() {
  const shell = useRead("/shell");
  return (
    <Reading from="/home" failed="We could not read what Juno suggests">
      {(home) => (shell._tag === "Ok" ? <Home shell={shell.value} home={home} /> : null)}
    </Reading>
  );
}
