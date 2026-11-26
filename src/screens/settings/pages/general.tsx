import { useState } from "react";
import { CheckboxInput } from "@astryxdesign/core/CheckboxInput";
import { Divider } from "@astryxdesign/core/Divider";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Reading, useRead } from "~/modules/page/service.ts";
import type { GeneralView } from "~/modules/views-workspace/types.ts";
import { useDoing } from "../doing.ts";
import { place } from "../format.ts";
import { Part } from "../part.tsx";
import type { Dirty } from "../types.ts";

interface Form {
  readonly name: string;
  readonly address: string;
  readonly zone: string;
  readonly limit: string;
  readonly warn: string;
  readonly makes: boolean;
  readonly changes: boolean;
  readonly joins: boolean;
}

const formOf = (view: GeneralView): Form => ({
  name: view.name,
  address: view.address,
  zone: place(view.zone),
  limit: String(view.perDay),
  warn: String(view.tellAt),
  makes: view.mayMake,
  changes: view.mayTry,
  joins: view.mayJoin,
});

function Fields({ view, onDirty, mail }: { readonly view: GeneralView; readonly onDirty: Dirty; readonly mail: string }) {
  const [form, setForm] = useState<Form>(() => formOf(view));
  const doing = useDoing();
  const change = (next: Partial<Form>) => {
    const made = { ...form, ...next };
    setForm(made);
    onDirty(() =>
      doing(
        "workspace.general",
        {
          name: made.name,
          address: made.address,
          zone: made.zone,
          perDay: Number(made.limit),
          tellAt: Number(made.warn),
          mayMake: made.makes,
          mayTry: made.changes,
          mayJoin: made.joins,
        },
        ["/settings/general"],
      ),
    );
  };
  return (
    <>
      <Part title="Basics" about="What the workspace is called, and where it is.">
        <TextInput label="Name" value={form.name} onChange={(value: string) => change({ name: value })} />
        <TextInput
          label="Address"
          description={`Juno gets mail at ${mail}`}
          value={form.address}
          onChange={(value: string) => change({ address: value })}
        />
        <TextInput label="Time zone" value={form.zone} onChange={(value: string) => change({ zone: value })} />
      </Part>
      <Divider />
      <Part title="Spending" about="For all managers together. Juno gives each one its part.">
        <TextInput
          label="Most they may spend in a day, in dollars"
          value={form.limit}
          onChange={(value: string) => change({ limit: value })}
        />
        <TextInput label="Tell me at" value={form.warn} onChange={(value: string) => change({ warn: value })} />
      </Part>
      <Divider />
      <Part title="Who may do what" about="What Juno does without asking you, and how people come in.">
        <CheckboxInput
          label="Juno may make new managers"
          description="Off: it asks you first."
          value={form.makes}
          onChange={(value: boolean) => change({ makes: value })}
        />
        <CheckboxInput
          label="Juno may try changes to a manager"
          description="On past work, beside the version that is running."
          value={form.changes}
          onChange={(value: boolean) => change({ changes: value })}
        />
        <CheckboxInput
          label="People with your mail domain may ask to join"
          description="They see this workspace when they sign in. You say yes in your inbox."
          value={form.joins}
          onChange={(value: boolean) => change({ joins: value })}
        />
      </Part>
    </>
  );
}

export default function General({ onDirty }: { readonly onDirty: Dirty }) {
  const shell = useRead("/shell");
  const mail = shell._tag === "Ok" ? (shell.value.coworker.addresses.find((one) => one.connector === "email")?.as ?? "") : "";
  return <Reading from="/settings/general">{(view) => <Fields view={view} onDirty={onDirty} mail={mail} />}</Reading>;
}
