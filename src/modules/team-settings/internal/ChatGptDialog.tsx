import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack } from "@astryxdesign/core/Layout";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Text } from "@astryxdesign/core/Text";
import { useClipboard } from "@astryxdesign/core/hooks";
import type { Loaded } from "~/modules/team-core/types.ts";
import { FormDialog } from "./FormDialog.tsx";

interface Props {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onStart: () => Promise<Loaded<string>>;
  readonly onFinish: (redirectUrl: string) => Promise<Loaded<true>>;
}

/** ChatGPT's sign-in ends on an address of its own; the person pastes it back. */
export function ChatGptDialog({ isOpen, onClose, onStart, onFinish }: Props) {
  const [signInAt, setSignInAt] = useState<string>();
  const [pasted, setPasted] = useState("");
  const [failure, setFailure] = useState<string>();
  const { copy, isCopied } = useClipboard({ announce: "Copied" });
  const close = () => {
    setSignInAt(undefined);
    setPasted("");
    setFailure(undefined);
    onClose();
  };
  const start = async () => {
    const result = await onStart();
    if (result._tag === "Loaded") setSignInAt(result.value);
    setFailure(result._tag === "Failed" ? result.message : undefined);
  };
  const finish = async () => {
    const result = await onFinish(pasted.trim());
    if (result._tag === "Loaded") close();
    else setFailure(result.message);
  };
  return (
    <FormDialog
      isOpen={isOpen}
      onClose={close}
      title="Sign in to ChatGPT"
      subtitle="Managers then run on your ChatGPT plan."
      failure={failure}
      submitLabel="Finish"
      isReady={signInAt !== undefined && pasted.trim() !== ""}
      onSubmit={finish}
    >
      <Text>1. Open the sign-in page and sign in.</Text>
      <HStack gap={2}>
        {signInAt === undefined ? (
          <Button label="Get the sign-in page" clickAction={start} />
        ) : (
          <>
            <Button label="Open the sign-in page" href={signInAt} target="_blank" rel="noreferrer" />
            {/* An app that shows this page inside itself may cut the address short when it hands it to a browser. */}
            <Button label={isCopied ? "Copied" : "Copy its address"} variant="ghost" onClick={() => void copy(signInAt)} />
          </>
        )}
      </HStack>
      <TextInput
        label="2. Paste the address the browser ends on"
        description="It starts with http://127.0.0.1:1455. That page does not load: only its address matters."
        value={pasted}
        onChange={setPasted}
        isDisabled={signInAt === undefined}
        width="100%"
      />
    </FormDialog>
  );
}
