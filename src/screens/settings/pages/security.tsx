// astryx-template: settings
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useClock, useRead } from "~/modules/page/service.ts";
import type { MeView } from "~/modules/views-workspace/types.ts";
import { useDoing } from "../doing.ts";
import { lastSeen } from "../format.ts";
import { Part } from "../part.tsx";

const WAYS: Readonly<Record<MeView["ways"][number]["id"], string>> = { mail: "A link by mail", google: "Google", github: "GitHub" };

function Security({ view, zone }: { readonly view: MeView; readonly zone: string }) {
  const [showToast, clock, doing] = [useToast(), useClock(), useDoing()];
  const [sessions, setSessions] = useState(view.sessions);
  const say = (body: string) => showToast({ body, uniqueID: body });
  return (
    <>
      <Part title="Ways to sign in" about="There is no password. Keep at least two, so losing one does not lock you out.">
        {view.ways.map((w) => (
          <HStack key={w.id} gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <VStack gap={0}>
                <Text type="body">{WAYS[w.id]}</Text>
                <Text type="supporting" color="secondary">
                  {w.about}
                </Text>
              </VStack>
            </StackItem>
            <Button
              label="Remove"
              size="sm"
              variant="ghost"
              onClick={() => void doing("security.remove_passkey", { way: w.id }, ["/settings/me"])}
            />
          </HStack>
        ))}
        <HStack>
          <Button label="Add a way to sign in" size="sm" variant="secondary" onClick={() => say("Pick a mail link, Google or GitHub")} />
        </HStack>
      </Part>
      <Divider />
      <Part title="Where you are signed in" about="Sign out one you do not know.">
        {sessions.map((s) => (
          <HStack key={s.id} gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <VStack gap={0}>
                <Text type="body">{s.says}</Text>
                <Text type="supporting" color="secondary">
                  {s.here ? "This one" : lastSeen(s.at, zone, clock)}
                </Text>
              </VStack>
            </StackItem>
            {!s.here && (
              <Button
                label="Sign out"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setSessions((x) => x.filter((y) => y.id !== s.id));
                  void doing("session.sign_out", { session: s.id }, ["/settings/me"]);
                }}
              />
            )}
          </HStack>
        ))}
        {sessions.length > 1 && (
          <HStack>
            <Button
              label="Sign out everywhere else"
              size="sm"
              variant="secondary"
              onClick={() => {
                setSessions((x) => x.filter((y) => y.here));
                void doing("security.sign_out_others", {}, ["/settings/me"]);
              }}
            />
          </HStack>
        )}
      </Part>
    </>
  );
}

export default function SecurityPage() {
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  return <Reading from="/settings/me">{(view) => <Security view={view} zone={zone} />}</Reading>;
}
