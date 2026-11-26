import { useState } from "react";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Divider } from "@astryxdesign/core/Divider";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Part } from "../../part";
import { WORKSPACE } from "../../world";

export function General({ onDirty }: { onDirty: () => void }) {
  const [name, setName] = useState<string>(WORKSPACE);
  const [address, setAddress] = useState("acme");
  const [zone, setZone] = useState("Copenhagen");
  const [limit, setLimit] = useState("100");
  const [warn, setWarn] = useState("80");
  const [makes, setMakes] = useState(false);
  const [changes, setChanges] = useState(true);
  const [joins, setJoins] = useState(true);
  return (
    <>
      <Part title="Basics" about="What the workspace is called, and where it is.">
        <TextInput label="Name" value={name} onChange={(v: string) => { setName(v); onDirty(); }} />
        <TextInput label="Address" description="Juno gets mail at juno@acme.co-worker.tech" value={address} onChange={(v: string) => { setAddress(v); onDirty(); }} />
        <TextInput label="Time zone" value={zone} onChange={(v: string) => { setZone(v); onDirty(); }} />
      </Part>
      <Divider />
      <Part title="Spending" about="For all managers together. Juno gives each one its part.">
        <TextInput label="Most they may spend in a day, in dollars" value={limit} onChange={(v: string) => { setLimit(v); onDirty(); }} />
        <TextInput label="Tell me at" value={warn} onChange={(v: string) => { setWarn(v); onDirty(); }} />
      </Part>
      <Divider />
      <Part title="Who may do what" about="What Juno does without asking you, and how people come in.">
        <CheckboxInput label="Juno may make new managers" description="Off: it asks you first." value={makes} onChange={(v: boolean) => { setMakes(v); onDirty(); }} />
        <CheckboxInput label="Juno may try changes to a manager" description="On past work, beside the version that is running." value={changes} onChange={(v: boolean) => { setChanges(v); onDirty(); }} />
        <CheckboxInput label="People with your mail domain may ask to join" description="They see this workspace when they sign in. You say yes in your inbox." value={joins} onChange={(v: boolean) => { setJoins(v); onDirty(); }} />
      </Part>
    </>
  );
}
