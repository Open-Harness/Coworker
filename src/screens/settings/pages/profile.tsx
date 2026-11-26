// astryx-template: settings
import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useGo, useOutside, useRead } from "~/modules/page/service.ts";
import type { MeView, ShellView } from "~/modules/views-workspace/types.ts";
import { useDoing } from "../doing.ts";
import { place } from "../format.ts";
import { Part } from "../part.tsx";
import type { Dirty } from "../types.ts";

function Profile({ view, shell, onDirty }: { readonly view: MeView; readonly shell: ShellView | undefined; readonly onDirty: Dirty }) {
  const [showToast, go, outside, doing] = [useToast(), useGo(), useOutside(), useDoing()];
  const [name, setName] = useState(view.name);
  const [zone, setZone] = useState(place(view.zone));
  const kept = () => onDirty(() => showToast({ body: "Saved", uniqueID: "save" }));
  const signOut = async () => {
    await outside.post("/api/auth/sign-out", {});
    go("//sign-in");
  };
  return (
    <>
      <Part title="You" about="How you show to people, and to Juno when it writes to you.">
        <HStack gap={3} vAlign="center">
          <Avatar name={name} size={48} tooltip={false} />
          <VStack gap={0}>
            <Text type="body">{name}</Text>
            <Text type="supporting" color="secondary">{`${shell?.me.role ?? ""} of ${shell?.workspace.name ?? ""}`}</Text>
          </VStack>
        </HStack>
        <TextInput
          label="Name"
          value={name}
          onChange={(v: string) => {
            setName(v);
            kept();
          }}
        />
        <TextInput
          label="Time zone"
          description="Quiet hours and every time on screen follow this."
          value={zone}
          onChange={(v: string) => {
            setZone(v);
            kept();
          }}
        />
      </Part>
      <Divider />
      <Part
        title="Your mails"
        about="Juno knows you by a mail it has proven. Mail from one that is not proven is treated as from a stranger."
      >
        {view.mails.map((m) => (
          <HStack key={m.mail} gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <VStack gap={0}>
                <Text type="body" maxLines={1}>
                  {m.mail}
                </Text>
                <Text type="supporting" color="secondary">
                  {m.proven ? "Proven" : "Not proven yet"}
                </Text>
              </VStack>
            </StackItem>
            {!m.proven && (
              <Button
                label="Send a link to prove it"
                size="sm"
                variant="secondary"
                onClick={() => showToast({ body: `A link is on its way to ${m.mail}`, uniqueID: m.mail })}
              />
            )}
          </HStack>
        ))}
        <HStack>
          <Button label="Add a mail" size="sm" variant="secondary" onClick={() => void doing("profile.add_mail", {}, ["/settings/me"])} />
        </HStack>
      </Part>
      <Divider />
      <Part title="Sign out" about="On this device only.">
        <HStack>
          <Button label="Sign out" variant="secondary" onClick={() => void signOut()} />
        </HStack>
      </Part>
    </>
  );
}

export default function ProfilePage({ onDirty }: { readonly onDirty: Dirty }) {
  const shell = useRead("/shell");
  return (
    <Reading from="/settings/me">
      {(view) => <Profile view={view} shell={shell._tag === "Ok" ? shell.value : undefined} onDirty={onDirty} />}
    </Reading>
  );
}
