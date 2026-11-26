// astryx-template: form-wizard
import { useMemo, useState, type CSSProperties } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Layout, LayoutContent, LayoutFooter, LayoutHeader } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { go } from "../../shell";
import { problems, START, STEPS, type Answers } from "./answers";
import { ConnectorStep, ModelStep, ReviewStep, WorkspaceStep } from "./steps";

// The footer's two end zones divide the leftover space equally rather than
// sizing to their own contents, which is what keeps the step counter on the
// page's centre line.
const footerZone: CSSProperties = { flexBasis: 0 };
const footerActionsZone: CSSProperties = { flexBasis: 0, minWidth: "fit-content" };

export default function CreateWorkspace() {
  const isNarrow = useMediaQuery("(max-width: 640px)");
  const [step, setStep] = useState(0);
  // Steps the user has tried to advance past. Errors stay silent until a step is in this set.
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(new Set());
  const [answers, setAnswers] = useState<Answers>(START);
  const set = (change: Partial<Answers>) => setAnswers((a) => ({ ...a, ...change }));
  const errorsByStep = useMemo(() => problems(answers), [answers]);
  const shown = (index: number) => (attempted.has(index) ? (errorsByStep[index] ?? {}) : {});
  const isLast = step === STEPS.length - 1;
  const mark = (index: number) => setAttempted((prev) => new Set(prev).add(index));
  const goNext = () => {
    mark(step);
    if (Object.keys(errorsByStep[step] ?? {}).length > 0) return;
    if (!isLast) return setStep(step + 1);
    const broken = errorsByStep.findIndex((errors) => Object.keys(errors).length > 0);
    if (broken === -1) return go("root");
    mark(broken);
    setStep(broken);
  };
  const goTo = (index: number) => { if (index > step) mark(step); setStep(index); };
  const goSkip = () => { set({ connector: "none" }); setStep(step + 1); };
  const part = { answers, set, errors: shown(step) };
  return (
    <Layout
      height="fill"
      contentWidth={720}
      padding={5}
      defaultHasDividers
      header={
        <LayoutHeader hasDivider={false}>
          <VStack gap={isNarrow ? 3 : 5}>
            <HStack wrap="wrap" gap={3} vAlign="center">
              <StackItem size="fill"><Heading level={1}>Create workspace</Heading></StackItem>
              <Button label="Cancel" variant="ghost" onClick={() => go("signin")} />
            </HStack>
            <Stepper activeStep={step} orientation="horizontal" onStepClick={goTo} label="Create workspace progress" density="balanced" indicatorPosition="on-track">
              {STEPS.map((s, i) => (
                <Step key={s.label} step={i} label={s.label} isOptional={s.isOptional} status={Object.keys(shown(i)).length > 0 ? "error" : undefined} />
              ))}
            </Stepper>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main">
          {step === 0 && <WorkspaceStep {...part} />}
          {step === 1 && <ModelStep {...part} />}
          {step === 2 && <ConnectorStep {...part} />}
          {step === 3 && <ReviewStep {...part} />}
        </LayoutContent>
      }
      footer={
        <LayoutFooter>
          <HStack wrap="wrap" gap={3} vAlign="center">
            <StackItem size="fill" style={footerZone}>{STEPS[step]?.isOptional === true && <Button label="Skip" variant="ghost" onClick={goSkip} />}</StackItem>
            <Text type="supporting" color="secondary">{step + 1} of {STEPS.length}</Text>
            <StackItem size="fill" style={footerActionsZone}>
              <HStack wrap="wrap" gap={3} hAlign="end">
                <Button label="Back" variant="secondary" isDisabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))} />
                <Button label={isLast ? "Create workspace" : "Next"} variant="primary" onClick={goNext} />
              </HStack>
            </StackItem>
          </HStack>
        </LayoutFooter>
      }
    />
  );
}
