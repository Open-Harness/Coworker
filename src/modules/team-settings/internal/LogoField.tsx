import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { FileInput } from "@astryxdesign/core/FileInput";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import type { Loaded } from "~/modules/team-core/types.ts";

/** The workspace's picture. A new one is saved as soon as it is chosen, since the server checks what it is. */
export function LogoField({
  name,
  src,
  onUpload,
  onRemove,
}: {
  readonly name: string;
  /** Absent when there is no logo. */
  readonly src: string | undefined;
  readonly onUpload: (file: File) => Promise<Loaded<true>>;
  readonly onRemove: () => Promise<Loaded<true>>;
}) {
  const [failure, setFailure] = useState<string>();
  const [isBusy, setIsBusy] = useState(false);
  const act = async (asking: Promise<Loaded<true>>) => {
    setIsBusy(true);
    const result = await asking;
    setFailure(result._tag === "Failed" ? result.message : undefined);
    setIsBusy(false);
  };
  return (
    <VStack gap={3}>
      <HStack gap={4} vAlign="center" wrap="wrap">
        <Avatar name={name} {...(src === undefined ? {} : { src })} size={64} shape="rounded" tooltip={false} />
        <StackItem size="fill">
          <VStack gap={1} hAlign="start">
            <FileInput
              label="Logo"
              mode="input"
              value={null}
              accept="image/png,image/jpeg,image/webp,image/gif"
              maxSize={256 * 1024}
              isLoading={isBusy}
              onChange={(files) => void (files instanceof File && act(onUpload(files)))}
              description="PNG, JPEG, WebP or GIF, up to 256 KB."
              width="100%"
            />
            {src !== undefined && (
              <HStack>
                <Button label="Remove logo" variant="ghost" size="sm" clickAction={() => act(onRemove())} />
              </HStack>
            )}
          </VStack>
        </StackItem>
      </HStack>
      {failure !== undefined && <Banner status="error" title="The logo was not saved" description={failure} />}
    </VStack>
  );
}
