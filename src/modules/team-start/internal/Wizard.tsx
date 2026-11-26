import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Heading, Text } from "@astryxdesign/core/Text";
import { CubeTransparentIcon } from "@heroicons/react/24/outline";
import type { WizardProps } from "../types.ts";

const STEPS = ["Workspace", "Model", "Manager", "Mission", "Listening", "Team"] as const;
const WIDTH = 800;

/** One step of setting up, on a page of its own: how far along, what it asks, and what to do. */
export function Wizard({ frame, title, description, failure, children, action, skip }: WizardProps) {
  const { workspace, step, leave } = frame;
  return (
    <Layout
      contentWidth={WIDTH}
      padding={5}
      header={
        <LayoutHeader hasDivider={false}>
          <VStack gap={4}>
            <HStack gap={2} vAlign="center">
              <Icon icon={CubeTransparentIcon} size="md" />
              <StackItem size="fill">
                <Text weight="bold">{workspace ?? "Co-worker"}</Text>
              </StackItem>
              {leave !== undefined && <Button label={leave.label} variant="ghost" size="sm" href={leave.href} />}
            </HStack>
            {step !== undefined && (
              <Stepper activeStep={step} label="Setting up" density="compact">
                {STEPS.map((label, index) => (
                  <Step key={label} step={index} label={label} />
                ))}
              </Stepper>
            )}
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent>
          <VStack gap={6}>
            <VStack gap={1}>
              <Heading level={1}>{title}</Heading>
              <Text color="secondary">{description}</Text>
            </VStack>
            {failure !== undefined && (
              <Banner
                status="error"
                title={failure.title}
                {...(failure.description === undefined ? {} : { description: failure.description })}
              />
            )}
            {children}
            <HStack gap={2} hAlign="end" vAlign="center" wrap="wrap">
              {skip}
              {action}
            </HStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
