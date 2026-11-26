import { useState } from "react";
import { useImperativeAlertDialog } from "@astryxdesign/core/AlertDialog";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { LIMITS } from "~/modules/protocol/service.ts";
import type { RowMenuProps } from "../types.ts";
import { NameDialog } from "./NameDialog.tsx";

const capitalized = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** The menu of anything that can be pinned, renamed, archived and deleted. */
export function RowMenu(props: RowMenuProps) {
  const { kind, title, isPinned, isArchived, deleteWarning, extraItems = [], onOpenChange } = props;
  const [isRenaming, setIsRenaming] = useState(false);
  const confirm = useImperativeAlertDialog();
  const askToDelete = () =>
    confirm.show({
      title: `Delete ${title}?`,
      description: deleteWarning,
      actionLabel: "Delete",
      onAction: () => {
        confirm.hide();
        props.onDelete();
      },
    });
  return (
    <>
      <MoreMenu
        size="sm"
        label={`${capitalized(kind)} options`}
        {...(onOpenChange === undefined ? {} : { onOpenChange })}
        items={[
          ...extraItems,
          { label: isPinned ? "Unpin" : "Pin", onClick: () => props.onPin(!isPinned) },
          { label: "Rename", onClick: () => setIsRenaming(true) },
          { label: isArchived ? "Restore" : "Archive", onClick: () => props.onArchive(!isArchived) },
          { label: "Delete", onClick: askToDelete },
        ]}
      />
      <NameDialog
        isOpen={isRenaming}
        title={`Rename ${kind}`}
        label="Name"
        initialValue={title}
        submitLabel="Rename"
        maxLength={LIMITS.title}
        onClose={() => setIsRenaming(false)}
        onSubmit={(name) => {
          setIsRenaming(false);
          props.onRename(name);
        }}
      />
      {confirm.element}
    </>
  );
}
