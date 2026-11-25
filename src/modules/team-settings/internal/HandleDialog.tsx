import { useState } from "react";
import { Selector } from "@astryxdesign/core/Selector";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { NewHandle, PersonData } from "../types.ts";
import { FormDialog } from "./FormDialog.tsx";

const SOMEONE = "someone-new";
const KINDS = [
  { value: "email", label: "Email address" },
  { value: "github", label: "GitHub user id" },
];

/** An Owner vouches for how someone appears on a platform. */
export function HandleDialog({
  isOpen,
  people,
  onClose,
  onAdd,
}: {
  readonly isOpen: boolean;
  readonly people: readonly PersonData[];
  readonly onClose: () => void;
  readonly onAdd: (input: NewHandle) => Promise<Loaded<true>>;
}) {
  const [person, setPerson] = useState(SOMEONE);
  const [email, setEmail] = useState("");
  const [kind, setKind] = useState("email");
  const [id, setId] = useState("");
  const [display, setDisplay] = useState("");
  const [failure, setFailure] = useState<string>();
  const isNew = person === SOMEONE;
  const who = isNew ? `email:${email.trim().toLowerCase()}` : person;
  const close = () => {
    setId("");
    setDisplay("");
    setEmail("");
    setFailure(undefined);
    onClose();
  };
  const add = async () => {
    const name = display.trim();
    const result = await onAdd({ person: who, kind, id: id.trim(), ...(name === "" ? {} : { display: name }) });
    if (result._tag === "Loaded") close();
    else setFailure(result.message);
  };
  return (
    <FormDialog
      isOpen={isOpen}
      onClose={close}
      title="Add a handle"
      subtitle="You vouch that this address or account is theirs. Managers then know them by it."
      failure={failure}
      submitLabel="Add"
      isReady={id.trim() !== "" && (!isNew || /^[^@\s]+@[^@\s]+$/u.test(email.trim()))}
      onSubmit={add}
    >
      <Selector
        label="Person"
        width="100%"
        options={[{ value: SOMEONE, label: "Someone new" }, ...people.map((entry) => ({ value: entry.person, label: entry.name }))]}
        value={person}
        onChange={(value) => setPerson(value ?? SOMEONE)}
      />
      {isNew && <TextInput label="Their main email" type="email" value={email} onChange={setEmail} width="100%" isRequired />}
      <Selector label="Known by" width="100%" options={KINDS} value={kind} onChange={(value) => setKind(value ?? kind)} />
      <TextInput label={kind === "email" ? "Address" : "User id"} value={id} onChange={setId} width="100%" isRequired />
      <TextInput label="Shown as" value={display} onChange={setDisplay} width="100%" isOptional />
    </FormDialog>
  );
}
