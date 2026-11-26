// astryx-template: settings
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Part } from "../../../part";

const WAYS = [
  { id: "mail", name: "A link by mail", about: "To ama@acme.co", on: true },
  { id: "key", name: "Google", about: "ama@acme.co", on: true },
  { id: "github", name: "GitHub", about: "ama-m", on: true },
] as const;
const SESSIONS = [
  { id: "now", what: "This browser, Copenhagen", when: "Now", here: true },
  { id: "phone", what: "Phone, Copenhagen", when: "Today, 07:58", here: false },
  { id: "old", what: "Another browser, Aarhus", when: "19 Nov", here: false },
];

export default function Security({ onDirty }: { onDirty: () => void }) {
  void onDirty;
  const showToast = useToast();
  const [sessions, setSessions] = useState(SESSIONS);
  const say = (body: string) => showToast({ body, uniqueID: body });
  return (
    <>
      <Part title="Ways to sign in" about="There is no password. Keep at least two, so losing one does not lock you out.">
        {WAYS.map((w) => (
          <HStack key={w.id} gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill"><VStack gap={0}><Text type="body">{w.name}</Text><Text type="supporting" color="secondary">{w.about}</Text></VStack></StackItem>
            <Button label="Remove" size="sm" variant="ghost" onClick={() => say(`${w.name} removed`)} />
          </HStack>
        ))}
        <HStack><Button label="Add a way to sign in" size="sm" variant="secondary" onClick={() => say("Pick a mail link, Google or GitHub")} /></HStack>
      </Part>
      <Divider />
      <Part title="Where you are signed in" about="Sign out one you do not know.">
        {sessions.map((s) => (
          <HStack key={s.id} gap={3} vAlign="center" wrap="wrap">
            <StackItem size="fill"><VStack gap={0}><Text type="body">{s.what}</Text><Text type="supporting" color="secondary">{s.here ? "This one" : s.when}</Text></VStack></StackItem>
            {!s.here && <Button label="Sign out" size="sm" variant="ghost" onClick={() => { setSessions((x) => x.filter((y) => y.id !== s.id)); say("Signed out"); }} />}
          </HStack>
        ))}
        {sessions.length > 1 && <HStack><Button label="Sign out everywhere else" size="sm" variant="secondary" onClick={() => { setSessions((x) => x.filter((y) => y.here)); say("Signed out everywhere else"); }} /></HStack>}
      </Part>
    </>
  );
}
