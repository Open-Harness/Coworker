import { HStack, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Token } from "@astryxdesign/core/Token";

const VERSIONS = [["6", "Signs: not a single job advert", "Ama, from 3 corrections", "23 Nov", "2 open pieces were told"], ["5", "A lead that went quiet: ask to do", "Bo, proposed by Juno", "16 Nov", "None was affected"], ["4", "Ama and Bo may ask in Slack #sales", "Ama", "9 Nov", "None was affected"], ["3", "Never write to a private address it found", "Bo, after one mail", "2 Nov", "1 open piece was stopped"], ["2", "A company like our best: in a country we sell to", "Ama, from 4 corrections", "19 Oct", "None was affected"], ["1", "Set up, from the draft", "Juno, Ama said yes", "5 Oct", "The first"]] as const;

/** Every decision keeps the version it was made under. */
export function Versions() {
  const showToast = useToast();
  return (
    <VStack gap={4}>
      <Text type="supporting" color="secondary">Every decision keeps the version it was made under. Going back is a new version.</Text>
      <List density="balanced" hasDividers>
        {VERSIONS.map(([n, what, who, when, told], i) => <ListItem key={n} label={what} description={`${when} · ${who} · ${told}`} startContent={<Token size="sm" color="gray" label={n} />} endContent={i === 0 ? <HStack><Token size="sm" color="gray" label="Current" /></HStack> : <Button label="Go back" aria-label={`Go back to version ${n}`} size="sm" variant="ghost" onClick={() => showToast({ body: `Version 7, the same as ${n}. 4 open pieces of work would be told. Save to make it so.`, uniqueID: "back" })} />} />)}
      </List>
    </VStack>
  );
}
