import { HStack, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Token } from "@astryxdesign/core/Token";
import { Reading, useApi, useRefresh, useBrowser } from "~/modules/page/service.ts";
import { useDay } from "./day.ts";
import { useNotes } from "./notes.tsx";

/** Every decision keeps the version it was made under. */
export function Versions() {
  const showToast = useToast();
  const { view, change } = useNotes();
  const [api, refresh, date, { newId }] = [useApi(), useRefresh(), useDay(), useBrowser()];
  const manager = view.head?.id ?? "";
  const back = async (n: number) => {
    const did = await api.write("/do", { doing: "version.go_back", values: { manager, version: n }, key: newId() });
    if (did._tag === "Ok" && (did.value._tag === "Done" || did.value._tag === "Asked")) {
      change();
      showToast({ body: `Version ${view.version + 1}, the same as ${n}. Save to make it so.`, uniqueID: "back" });
    }
    refresh([`/m/${manager}/playbook`, `/m/${manager}/versions`]);
  };
  return (
    <VStack gap={4}>
      <Text type="supporting" color="secondary">
        Every decision keeps the version it was made under. Going back is a new version.
      </Text>
      <Reading from="/m/:manager/versions" parts={{ manager }}>
        {({ versions }) => (
          <List density="balanced" hasDividers>
            {versions.map((v, i) => (
              <ListItem
                key={v.number}
                label={v.says}
                description={`${date.day(v.at)} · ${v.by}${v.how === null ? "" : `, ${v.how}`} · ${v.told}`}
                startContent={<Token size="sm" color="gray" label={String(v.number)} />}
                endContent={
                  i === 0 ? (
                    <HStack>
                      <Token size="sm" color="gray" label="Current" />
                    </HStack>
                  ) : (
                    <Button
                      label="Go back"
                      aria-label={`Go back to version ${v.number}`}
                      size="sm"
                      variant="ghost"
                      onClick={() => void back(v.number)}
                    />
                  )
                }
              />
            ))}
          </List>
        )}
      </Reading>
    </VStack>
  );
}
