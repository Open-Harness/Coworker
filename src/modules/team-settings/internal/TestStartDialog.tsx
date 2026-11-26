import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CodeBlock } from "@astryxdesign/core/CodeBlock";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { HStack, Layout, LayoutContent, LayoutFooter, VStack } from "@astryxdesign/core/Layout";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import type { Loaded } from "~/modules/team-core/types.ts";
import type { EnvironmentData, TestData } from "../types.ts";

/** Starts a container from the environment once, and shows what its setup printed. Nothing is kept from the test. */
export function TestStartDialog({
  environment,
  onClose,
  onTest,
}: {
  readonly environment: EnvironmentData;
  readonly onClose: () => void;
  readonly onTest: (environmentId: string) => Promise<Loaded<TestData>>;
}) {
  const [result, setResult] = useState<Loaded<TestData>>();
  const [tries, setTries] = useState(0);
  const run = useCallback(() => {
    setResult(undefined);
    setTries((count) => count + 1);
  }, []);
  const latest = useRef(onTest);
  useEffect(() => {
    latest.current = onTest;
  });
  useEffect(() => {
    let isCurrent = true;
    void latest.current(environment.id).then((answer) => isCurrent && setResult(answer));
    return () => {
      isCurrent = false;
    };
  }, [environment.id, tries]);
  return (
    <Dialog isOpen onOpenChange={(open) => !open && onClose()} purpose="info" width={640}>
      <Layout
        height="auto"
        header={
          <DialogHeader
            title={`Test start of ${environment.name}`}
            subtitle={`Version ${environment.version}`}
            onOpenChange={onClose}
            hasDivider={false}
          />
        }
        content={
          <LayoutContent>
            <VStack gap={3}>
              {result === undefined && (
                <HStack gap={2} vAlign="center">
                  <Spinner />
                  <Text role="status">Starting a container and running the setup…</Text>
                </HStack>
              )}
              {result?._tag === "Failed" && <Banner status="error" title="The test could not run" description={result.message} />}
              {result?._tag === "Loaded" && (
                <>
                  <Badge variant={result.value.ready ? "success" : "error"} label={result.value.ready ? "Ready" : "Setup failed"} />
                  <CodeBlock
                    code={result.value.output === "" ? "# The setup printed nothing" : result.value.output}
                    title="What the setup printed"
                    hasLanguageLabel={false}
                    width="100%"
                    isWrapped
                  />
                </>
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={2} hAlign="end">
              <Button label="Run again" variant="ghost" isDisabled={result === undefined} onClick={run} />
              <Button label="Done" variant="primary" onClick={onClose} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
