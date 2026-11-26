import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { StepProps } from "../types.ts";
import { templateOf } from "./words.ts";
import { Wizard } from "./Wizard.tsx";

const MAX_MISSION = 4_000;

/** Names the manager and says what it is for: its mission page starts with it, and it is the first thing it is told. */
export function Mission({ api, workspaceId, frame, next, template }: StepProps & { readonly template: string | undefined }) {
  const starting = templateOf(template);
  const [name, setName] = useState(starting?.name ?? "");
  const [mission, setMission] = useState("");
  const [failure, setFailure] = useState<string>();
  const create = async () => {
    const words = mission.trim();
    const made = await api.createManager(workspaceId, { name: name.trim(), template: starting?.value ?? "kanban", mission: words });
    if (made._tag === "Failed") {
      setFailure(made.message === "Address taken" ? "A manager here has that name already. Pick another." : made.message);
      return;
    }
    const { managerId } = made.value;
    await api.say(workspaceId, managerId, words, `mission:${managerId}`);
    next({ managerId });
  };
  return (
    <Wizard
      frame={frame}
      title="What should it get done?"
      description="Its mission page starts with this, and it is the first thing it is told. You can change everything later."
      failure={failure === undefined ? undefined : { title: "The manager was not made", description: failure }}
      action={
        <Button label="Create manager" variant="primary" isDisabled={name.trim() === "" || mission.trim() === ""} clickAction={create} />
      }
    >
      <FormLayout>
        <TextInput label="Name" value={name} onChange={setName} placeholder="Launch" width="100%" />
        <TextArea
          label="Mission"
          value={mission}
          onChange={setMission}
          rows={6}
          maxLength={MAX_MISSION}
          placeholder={starting?.mission ?? "Say what it should get done, by when, and what must come to you first."}
          width="100%"
        />
      </FormLayout>
    </Wizard>
  );
}
