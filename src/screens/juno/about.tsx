import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Divider } from "@astryxdesign/core/Divider";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Part } from "./part.tsx";
import type { JunoPage } from "./types.ts";
import { useWords } from "./words.ts";

const VOICES = [
  { value: "calm", label: "Calm" },
  { value: "bright", label: "Bright" },
  { value: "low", label: "Low" },
];
/** Where people reach it, in the order the page says them. */
const PLACES = [
  { connector: "email", label: "Mail" },
  { connector: "whatsapp", label: "WhatsApp and phone" },
  { connector: "slack", label: "Slack" },
  { connector: "github", label: "GitHub" },
] as const;

/** Who Juno is, where it is reached, and how it sounds. There is no doing on the console that changes these, so the page shows them and has nothing to save. */
export function About({ view }: JunoPage) {
  const { clock } = useWords();
  return (
    <>
      <Part title="Who it is" about="The one name everybody speaks to. Managers stay inside.">
        <TextInput label="Name" value={view.identity.name} onChange={() => undefined} isReadOnly />
        <TextInput label="What it says it is" value={view.identity.role} onChange={() => undefined} isReadOnly />
      </Part>
      <Divider />
      <Part
        title="Where people reach it"
        about="One mail, one number, one Slack name. A message can be about anything: Juno decides which manager takes it."
      >
        {PLACES.map(({ connector, label }) => {
          const address = view.identity.addresses.find((one) => one.connector === connector);
          const off = view.offline.find((one) => one.connector === connector);
          if (address === undefined) return null;
          return (
            <TextInput
              key={connector}
              label={label}
              value={address.as}
              onChange={() => undefined}
              isReadOnly
              {...(off === undefined ? {} : { description: `Offline since ${clock.time(off.since)}. It is in your inbox.` })}
            />
          );
        })}
      </Part>
      <Divider />
      <Part title="Its voice" about="When it reads aloud, or picks up a call.">
        <Selector label="Voice" value={view.voice} onChange={() => undefined} options={VOICES} isReadOnly />
        <CheckboxInput
          label="Say aloud what it is doing on the screen"
          description="You can switch it on and off while it works."
          value={view.aloud}
          isReadOnly
        />
      </Part>
    </>
  );
}
