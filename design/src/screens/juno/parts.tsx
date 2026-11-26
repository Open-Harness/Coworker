import { useState } from "react";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Divider } from "@astryxdesign/core/Divider";
import { VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Part } from "../../part";
import { JUNO, RULES, SOUL } from "../../juno/world";

interface P { readonly onDirty: () => void }

export function About({ onDirty }: P) {
  const [name, setName] = useState<string>(JUNO.name);
  const [role, setRole] = useState<string>(JUNO.role);
  const [voice, setVoice] = useState("calm");
  const [aloud, setAloud] = useState(false);
  return (
    <>
      <Part title="Who it is" about="The one name everybody speaks to. Managers stay inside.">
        <TextInput label="Name" value={name} onChange={(v: string) => { setName(v); onDirty(); }} />
        <TextInput label="What it says it is" value={role} onChange={(v: string) => { setRole(v); onDirty(); }} />
      </Part>
      <Divider />
      <Part title="Where people reach it" about="One mail, one number, one Slack name. A message can be about anything: Juno decides which manager takes it.">
        <TextInput label="Mail" value={JUNO.mail} onChange={() => undefined} isReadOnly />
        <TextInput label="WhatsApp and phone" value={JUNO.phone} onChange={() => undefined} isReadOnly description="Offline since 08:10. It is in your inbox." />
        <TextInput label="Slack" value={JUNO.slack} onChange={() => undefined} isReadOnly />
        <TextInput label="GitHub" value={JUNO.github} onChange={() => undefined} isReadOnly />
      </Part>
      <Divider />
      <Part title="Its voice" about="When it reads aloud, or picks up a call.">
        <Selector label="Voice" value={voice} onChange={(v: string) => { setVoice(v); onDirty(); }} options={[{ value: "calm", label: "Calm" }, { value: "bright", label: "Bright" }, { value: "low", label: "Low" }]} />
        <CheckboxInput label="Say aloud what it is doing on the screen" description="You can switch it on and off while it works." value={aloud} onChange={(v: boolean) => { setAloud(v); onDirty(); }} />
      </Part>
    </>
  );
}

export function Soul({ onDirty }: P) {
  const [soul, setSoul] = useState(SOUL);
  const [ask, setAsk] = useState(true);
  return (
    <>
      <Part title="Soul" about="Who Juno is, in its own words. It reads this before everything else, and so does every manager and thread.">
        <TextArea label="Soul" isLabelHidden rows={13} value={soul} onChange={(v: string) => { setSoul(v); onDirty(); }} />
        <CheckboxInput label="Juno may suggest a change to this" description="You see the old and the new beside each other, and say yes or no." value={ask} onChange={(v: boolean) => { setAsk(v); onDirty(); }} />
      </Part>
      <Divider />
      <Part title="Never" about="Lines it does not cross, whoever asks.">
        <TextArea label="Never" isLabelHidden rows={4} value={"Send money.\nPromise a date a person has not given.\nSay it is a person."} onChange={() => undefined} />
      </Part>
    </>
  );
}

export function Talking({ onDirty }: P) {
  return (
    <>
      {RULES.map((r, i) => (
        <VStack key={r.who} gap={4}>
          {i > 0 && <Divider />}
          <Part title={r.who} about={r.may}>
            <TextArea label="How Juno speaks to them" rows={2} value={r.how} onChange={() => undefined} />
            <TextInput label="Signs as" value={r.sign} onChange={() => undefined} />
          </Part>
        </VStack>
      ))}
    </>
  );
}
