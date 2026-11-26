// astryx-template: empty-state
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack } from "@astryxdesign/core/Layout";
import { NoSymbolIcon } from "@heroicons/react/24/outline";
import { useGo, useRead } from "~/modules/page/service.ts";

/** A piece of work that was removed, or belongs to a workspace you are not in: nothing else is wrong, and here is where to go. */
export function Gone({ work, manager, name }: { readonly work: string; readonly manager: string; readonly name: string }) {
  const [go, shell] = [useGo(), useRead("/shell")];
  const juno = shell._tag === "Ok" ? shell.value.coworker.name : "the co-worker";
  return (
    <Center axis="both" height="100%">
      <EmptyState
        icon={<Icon icon={NoSymbolIcon} size="lg" />}
        title={`${work} is not here`}
        description="It was removed, or it belongs to a workspace you are not in. Nothing else is wrong."
        actions={
          <HStack gap={2}>
            <Button label={`Go to ${name}`} variant="primary" onClick={() => go(`/m/${manager}`)} />
            <Button label={`Ask ${juno}`} variant="secondary" onClick={() => go("/")} />
          </HStack>
        }
      />
    </Center>
  );
}
