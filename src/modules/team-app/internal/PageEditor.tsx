import { useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { TextArea } from "@astryxdesign/core/TextArea";
import { Timestamp } from "@astryxdesign/core/Timestamp";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { Allowed, PageData, PageEdit, SaveResult } from "../types.ts";

/**
 * The page's text in a box. It remembers which version the person started from (`base`); when the page has a newer one,
 * whether the server says so or the next refresh shows it, nothing is replaced until they choose to.
 */
export function PageEditor({
  page,
  allowed,
  onSave,
  onClose,
}: {
  readonly page: PageData;
  readonly allowed: Allowed;
  readonly onSave: (edit: PageEdit) => Promise<Loaded<SaveResult>>;
  readonly onClose: (result?: SaveResult) => void;
}) {
  const [draft, setDraft] = useState(page.body);
  const [base, setBase] = useState(page.updatedAt);
  const [failure, setFailure] = useState<string>();
  const changed = page.updatedAt !== base;
  const save = async (from: number): Promise<void> => {
    setFailure(undefined);
    const saved = await onSave({ page, body: draft, base: from });
    if (saved._tag === "Failed") setFailure(saved.message);
    else if (saved.value._tag === "Refused") setFailure(saved.value.message);
    else onClose(saved.value);
  };
  const useTheirs = (): void => {
    setDraft(page.body);
    setBase(page.updatedAt);
    setFailure(undefined);
  };
  return (
    <VStack gap={3}>
      {changed ? (
        <Banner
          status="warning"
          title={`${page.updatedBy === "" ? "Someone" : page.updatedBy} changed this page while you were editing`}
          description={
            <>
              Their version is from <Timestamp value={Math.floor(page.updatedAt / 1000)} format="relative" />. Your text is still in the box
              below, and saving it replaces theirs.
            </>
          }
          endContent={<Button label="Use their version" onClick={useTheirs} />}
        />
      ) : (
        failure !== undefined && <Banner status="error" title="It was not saved" description={failure} />
      )}
      <TextArea
        label="Page text"
        isLabelHidden
        description="Markdown"
        rows={16}
        value={draft}
        onChange={setDraft}
        hasSpellCheck
        width="100%"
        hasAutoFocus
      />
      <HStack gap={2}>
        <Button
          label={changed ? "Replace their version" : allowed === "ask" ? "Ask an owner to save" : "Save"}
          variant="primary"
          clickAction={() => save(changed ? page.updatedAt : base)}
        />
        <Button label="Cancel" onClick={() => onClose()} />
      </HStack>
    </VStack>
  );
}
