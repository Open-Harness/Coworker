import type { ReactNode } from "react";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";

/** A list and the one open beside it. On a narrow screen only one of them shows, and the open one has a way back. */
export function Split({ list, detail, back, width = 340 }: { list: ReactNode; detail: ReactNode; back: { label: string; onBack: () => void }; width?: number }) {
  const isNarrow = useMediaQuery("(max-width: 1100px)");
  if (isNarrow) return detail ? <VStack gap={3}><HStack><Button label={back.label} variant="ghost" size="sm" onClick={back.onBack} /></HStack>{detail}</VStack> : <>{list}</>;
  return <HStack gap={8} vAlign="start"><VStack width={width}>{list}</VStack><StackItem size="fill">{detail}</StackItem></HStack>;
}
