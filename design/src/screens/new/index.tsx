// astryx-template: form-wizard
import { useEffect, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutFooter, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { go } from "../../shell";
import { Check } from "./check";
import { Fill } from "./fill";
import { Pick } from "./pick";

const STEPS = [{ hash: "new", label: "Where from" }, { hash: "new-fill", label: "The blanks" }, { hash: "new-check", label: "What it found" }] as const;
const at = () => Math.max(0, STEPS.findIndex((s) => s.hash === location.hash.slice(1)));

/** A new manager, from what you say or from a template. The two meet in the same draft. */
export default function NewManager() {
  const isNarrow = useMediaQuery("(max-width: 640px)");
  const showToast = useToast();
  const [step, setStep] = useState(at());
  const [repo, setRepo] = useState("acme/api");
  useEffect(() => { const on = () => setStep(at()); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  return (
    <Layout
      height="fill"
      contentWidth={step === 0 ? 880 : 720}
      padding={isNarrow ? 3 : 5}
      defaultHasDividers
      header={
        <LayoutHeader hasDivider={false}>
          <VStack gap={isNarrow ? 3 : 5}>
            <HStack wrap="wrap" gap={3} vAlign="center">
              <StackItem size="fill"><VStack gap={0.5}><Heading level={1}>New manager</Heading><Text type="supporting" color="secondary">{step === 0 ? "Say what you want, or start from a template. Both end in a draft you can change." : "From the template Work on a repo."}</Text></VStack></StackItem>
              <Button label="Cancel" variant="ghost" onClick={() => go("root")} />
            </HStack>
            <Stepper activeStep={step} orientation="horizontal" onStepClick={(i: number) => go(STEPS[i]!.hash)} label="New manager progress" density="balanced" indicatorPosition="on-track">
              {STEPS.map((s, i) => <Step key={s.hash} step={i} label={s.label} />)}
            </Stepper>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main">
          {step === 0 && <Pick />}
          {step === 1 && <Fill repo={repo} onRepo={setRepo} />}
          {step === 2 && <Check repo={repo} />}
        </LayoutContent>
      }
      footer={step === 0 ? undefined : (
        <LayoutFooter>
          <HStack wrap="wrap" gap={3} vAlign="center">
            <StackItem size="fill"><Button label="Back" variant="secondary" onClick={() => go(STEPS[step - 1]!.hash)} /></StackItem>
            <Text type="supporting" color="secondary">{step + 1} of {STEPS.length}</Text>
            <StackItem size="fill">
              <HStack wrap="wrap" gap={3} hAlign="end">
                {step === 1
                  ? <Button label="Read the repo and try it" variant="primary" onClick={() => go("new-check")} />
                  : <><Button label="Open the draft" variant="secondary" onClick={() => go("draft")} /><Button label="Make it" variant="primary" onClick={() => { showToast({ body: "Made. It is in the tree, under Juno.", uniqueID: "made" }); go("root"); }} /></>}
              </HStack>
            </StackItem>
          </HStack>
        </LayoutFooter>
      )}
    />
  );
}
