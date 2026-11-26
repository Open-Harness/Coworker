// astryx-template: empty-state
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Grid } from "@astryxdesign/core/Grid";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useClock } from "~/modules/page/service.ts";
import type { ManagerOverview } from "~/modules/views-manager/types.ts";
import { say, useZone } from "../manager-frame/words.ts";

/** The six numbers every manager is read by, in this order, before it has an objective to show. */
const SIX = ["Came in", "Became work", "Sent back", "Median time", "Waiting on people", "What it cost"] as const;

type Failed = { readonly what: string; readonly says: string; readonly onRetry: () => void };

/**
 * No objective yet, or no answer: six tiles. Failed, they say so and nothing stands in for a number. Not yet, a number that cannot
 * be read says Not yet and when it will be.
 */
export function Six({ view, failed }: { readonly view?: ManagerOverview; readonly failed?: Failed }) {
  const clock = useClock();
  const zone = useZone();
  const when = (at: number): string => new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "long" }).format(at);
  if (failed !== undefined) {
    return (
      <VStack gap={4} padding={4}>
        <Banner
          status="error"
          title={failed.what}
          description={`Nothing is lost. ${failed.says === "" ? "It did not answer" : failed.says} at ${clock.time(clock.now())}.`}
          endContent={<Button label="Try again" size="sm" variant="secondary" onClick={failed.onRetry} />}
        />
        <Grid columns={{ minWidth: 200, max: 3 }} gap={4}>
          {SIX.map((label) => (
            <Card key={label} padding={4}>
              <VStack gap={1}>
                <Text type="supporting" color="secondary">
                  {label}
                </Text>
                <Text type="body" color="secondary">
                  Could not be read
                </Text>
              </VStack>
            </Card>
          ))}
        </Grid>
      </VStack>
    );
  }
  if (view === undefined) return null;
  const waiting = view.standing._tag === "NotYet" ? view.standing.why : "";
  return (
    <VStack gap={4} padding={4}>
      <Text type="supporting" color="secondary">
        {waiting}
      </Text>
      <Grid columns={{ minWidth: 200, max: 3 }} gap={4}>
        {view.tiles.map((tile) => {
          const notYet = view.tilesNotYet.find((one) => one.tile === tile.id);
          const value = tile.value === null ? "Not yet" : say(tile.unit, tile.value, true);
          return (
            <Card key={tile.id} padding={4}>
              <VStack gap={1}>
                <Text type="supporting" color="secondary">
                  {tile.label}
                </Text>
                <Heading level={2} color={tile.value === null ? "secondary" : "primary"}>
                  {value}
                </Heading>
                <Text type="supporting" color="secondary">
                  {notYet === undefined
                    ? `Today, ${clock.time(view.readAt)}`
                    : `First read on ${when(notYet.from)}, ${clock.time(notYet.from)}`}
                </Text>
              </VStack>
            </Card>
          );
        })}
      </Grid>
    </VStack>
  );
}
