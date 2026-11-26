// astryx-template: login-sso (its step for an organisation it knows), in login-card's page
import { useState } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { Door } from "../../door/Door";
import { go } from "../../shell";

/** After the first sign-in, when someone from the same mail domain is already here. */
export default function Page() {
  const [asked, setAsked] = useState(false);
  return (
    <Door title={asked ? "You’ve asked to join" : "Your team is already here"} description={asked ? "Ama Mensah is told. You get a mail when they answer." : "Anyone with your company’s mail address can ask to join"}>
      <Card padding={0}>
        <Section variant="muted" padding={4}>
          <HStack gap={2} vAlign="center">
            <Avatar name="Acme" size={32} />
            <VStack gap={0}>
              <Text type="label">Acme</Text>
              <Text type="supporting" color="secondary">3 people, 6 managers</Text>
            </VStack>
          </HStack>
        </Section>
      </Card>
      <VStack gap={3} hAlign="stretch">
        <Button label={asked ? "Waiting for an answer" : "Ask to join Acme"} variant="primary" size="lg" isDisabled={asked} onClick={() => setAsked(true)} />
        <Button label="Make a new workspace instead" variant="ghost" size="lg" onClick={() => go("start")} />
      </VStack>
    </Door>
  );
}
