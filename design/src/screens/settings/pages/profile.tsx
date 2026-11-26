// astryx-template: settings
import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { Part } from "../../../part";
import { go } from "../../../shell";
import { PEOPLE } from "../../../world";

export const meta = { save: true };
const MAILS = [{ mail: "ama@acme.co", proven: true }, { mail: "ama.mensah@northcote.example", proven: false }] as const;

export default function Profile({ onDirty }: { onDirty: () => void }) {
  const showToast = useToast();
  const me = PEOPLE["ama"]!;
  const [name, setName] = useState(me.name);
  const [zone, setZone] = useState("Copenhagen");
  return (
    <>
      <Part title="You" about="How you show to people, and to Juno when it writes to you.">
        <HStack gap={3} vAlign="center"><Avatar name={name} size={48} tooltip={false} /><VStack gap={0}><Text type="body">{name}</Text><Text type="supporting" color="secondary">{`${me.role} of Acme`}</Text></VStack></HStack>
        <TextInput label="Name" value={name} onChange={(v: string) => { setName(v); onDirty(); }} />
        <TextInput label="Time zone" description="Quiet hours and every time on screen follow this." value={zone} onChange={(v: string) => { setZone(v); onDirty(); }} />
      </Part>
      <Divider />
      <Part title="Your mails" about="Juno knows you by a mail it has proven. Mail from one that is not proven is treated as from a stranger.">
        {MAILS.map((m) => (
          <HStack key={m.mail} gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill"><VStack gap={0}><Text type="body" maxLines={1}>{m.mail}</Text><Text type="supporting" color="secondary">{m.proven ? "Proven" : "Not proven yet"}</Text></VStack></StackItem>
            {!m.proven && <Button label="Send a link to prove it" size="sm" variant="secondary" onClick={() => showToast({ body: `A link is on its way to ${m.mail}`, uniqueID: m.mail })} />}
          </HStack>
        ))}
        <HStack><Button label="Add a mail" size="sm" variant="secondary" onClick={() => showToast({ body: "Type it, and we send a link", uniqueID: "add" })} /></HStack>
      </Part>
      <Divider />
      <Part title="Sign out" about="On this device only.">
        <HStack><Button label="Sign out" variant="secondary" onClick={() => go("signin")} /></HStack>
      </Part>
    </>
  );
}
