import { useMemo } from "react";
import { useClock, useRead } from "~/modules/page/service.ts";
import { openedOf } from "./adapt.ts";
import type { Item } from "./data.ts";
import { Record } from "./record.tsx";

/** One issue or pull request, opened: what GitHub shows of it is read when it is opened. */
export function OpenRecord(props: {
  readonly manager: string;
  readonly managerName: string;
  readonly who: string;
  readonly zone: string;
  readonly item: Item;
  readonly isYours: boolean;
  readonly isFullWidth: boolean;
  readonly onClose: () => void;
  readonly onTell: (text: string) => void;
  readonly onWrite: (text: string) => void;
  readonly onHandBack: () => void;
}) {
  const { manager, who, zone, item } = props;
  const clock = useClock();
  const read = useRead("/m/:manager/connectors/github/:number", { manager, number: item.id });
  const opened = useMemo(() => (read._tag === "Ok" ? openedOf(read.value, clock, zone, who) : null), [read, clock, zone, who]);
  const thread = read._tag === "Ok" ? read.value.thread : null;
  return <Record {...props} opened={opened} thread={thread} />;
}
