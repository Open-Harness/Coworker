import { ClipboardDocumentIcon } from "@heroicons/react/24/outline";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { useToast } from "@astryxdesign/core/Toast";
import { useClipboard } from "@astryxdesign/core/hooks";

export function CopyButton({ text, label }: { readonly text: string; readonly label: string }) {
  const showToast = useToast();
  const { copy } = useClipboard({ announce: "Copied" });
  return (
    <Button
      label={label}
      variant="ghost"
      size="sm"
      icon={<Icon icon={ClipboardDocumentIcon} size="sm" />}
      isIconOnly
      onClick={() =>
        void copy(text).then((isCopied) => showToast({ body: isCopied ? "Copied" : "The browser did not allow copying", uniqueID: "copy" }))
      }
    />
  );
}
