// astryx-template: login-sso (its step for an organisation it knows), in login-card's page
import { useEffect, useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { Door } from "~/door/Door.tsx";
import { useGo, useOutside, Waiting } from "~/modules/page/service.ts";
import { knownOf, type Known } from "./known.ts";

/** After the first sign-in, when someone from the same mail domain is already here. */
export default function JoinPage() {
  const [outside, go] = [useOutside(), useGo()];
  const [known, setKnown] = useState<Known | null | undefined>();
  const [asked, setAsked] = useState(false);
  const [failed, setFailed] = useState<string>();
  useEffect(() => {
    void outside.get("/api/join/known").then((answer) => {
      const found = answer._tag === "Ok" ? knownOf(answer.value) : null;
      if (found === null) go(answer._tag !== "Ok" && answer.status === 401 ? "//sign-in" : "//start", { replace: true });
      setKnown(found);
    });
  }, [outside, go]);
  if (known === undefined || known === null) return <Waiting />;
  const ask = async () => {
    const sent = await outside.post("/api/join/request", { address: known.address });
    if (sent._tag === "Ok") setAsked(true);
    else setFailed(`We could not ask. ${sent.says}`);
  };
  const owner = known.owners[0] ?? "An owner";
  return (
    <Door
      title={asked ? "You’ve asked to join" : "Your team is already here"}
      description={
        asked ? `${owner} is told. You get a mail when they answer.` : (failed ?? "Anyone with your company’s mail address can ask to join")
      }
    >
      <Card padding={0}>
        <Section variant="muted" padding={4}>
          <HStack gap={2} vAlign="center">
            <Avatar name={known.name} size={32} />
            <VStack gap={0}>
              <Text type="label">{known.name}</Text>
              <Text type="supporting" color="secondary">
                {known.people} people, {known.managers} managers
              </Text>
            </VStack>
          </HStack>
        </Section>
      </Card>
      <VStack gap={3} hAlign="stretch">
        <Button
          label={asked ? "Waiting for an answer" : `Ask to join ${known.name}`}
          variant="primary"
          size="lg"
          isDisabled={asked}
          clickAction={ask}
        />
        <Button label="Make a new workspace instead" variant="ghost" size="lg" onClick={() => go("//start")} />
      </VStack>
    </Door>
  );
}
