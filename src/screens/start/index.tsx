// astryx-template: form-wizard
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Layout, LayoutContent, LayoutFooter, LayoutHeader } from "@astryxdesign/core/Layout";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { useGo, useOutside } from "~/modules/page/service.ts";
import { problems, START, STEPS, type Answers } from "./answers.ts";
import { ConnectorStep, ModelStep, ReviewStep, WorkspaceStep, type Repo } from "./steps.tsx";
import { createWorkspace, reposOf } from "./workspace.ts";

// The footer's two end zones divide the leftover space equally rather than sizing to their own contents, which keeps the step counter
// on the page's centre line.
// Outside the shell nothing above the page has a height, so a page that fills the window says how tall that is.
const whole: CSSProperties = { height: "100dvh" };
const footerZone: CSSProperties = { flexBasis: 0 };
const footerActionsZone: CSSProperties = { flexBasis: 0, minWidth: "fit-content" };

/** Making a workspace: four steps, and nothing is made until the last. */
export default function StartPage() {
  const isNarrow = useMediaQuery("(max-width: 640px)");
  const [outside, go] = [useOutside(), useGo()];
  const [step, setStep] = useState(0);
  // Steps the person has tried to go past. A step says what is wrong only once it is in this set.
  const [attempted, setAttempted] = useState<ReadonlySet<number>>(new Set());
  const [answers, setAnswers] = useState<Answers>(START);
  const [repos, setRepos] = useState<readonly Repo[]>([]);
  const [refused, setRefused] = useState<string>();
  const set = (change: Partial<Answers>) => setAnswers((a) => ({ ...a, ...change }));
  const errorsByStep = useMemo(() => problems(answers), [answers]);
  const shown = (index: number) => (attempted.has(index) ? (errorsByStep[index] ?? {}) : {});
  const isLast = step === STEPS.length - 1;
  const mark = (index: number) => setAttempted((prev) => new Set(prev).add(index));

  useEffect(() => {
    void outside.get("/api/start/repos").then((answer) => {
      const found = answer._tag === "Ok" ? reposOf(answer.value) : [];
      setRepos(found);
      // The first of what GitHub shows is where most people begin.
      setAnswers((a) => (a.repos.length === 0 && found[0] !== undefined ? { ...a, repos: [found[0].repo] } : a));
    });
  }, [outside]);

  const create = async () => {
    const made = await createWorkspace(outside, answers);
    if (made._tag === "Made") return go(`/ws/${encodeURIComponent(made.address)}`);
    setRefused(made.says);
    if (made._tag === "Taken") {
      mark(0);
      setStep(0);
    }
  };
  const goNext = () => {
    mark(step);
    if (Object.keys(errorsByStep[step] ?? {}).length > 0) return;
    if (!isLast) return setStep(step + 1);
    const broken = errorsByStep.findIndex((errors) => Object.keys(errors).length > 0);
    if (broken === -1) return void create();
    mark(broken);
    setStep(broken);
  };
  const goTo = (index: number) => {
    if (index > step) mark(step);
    setStep(index);
  };
  const part = { answers, set, errors: { ...shown(step), ...(refused !== undefined && step === 0 ? { slug: refused } : {}) } };
  return (
    <Layout
      height="fill"
      style={whole}
      contentWidth={720}
      padding={5}
      defaultHasDividers
      header={
        <LayoutHeader hasDivider={false}>
          <VStack gap={isNarrow ? 3 : 5}>
            <HStack wrap="wrap" gap={3} vAlign="center">
              <StackItem size="fill">
                <Heading level={1}>Create workspace</Heading>
              </StackItem>
              <Button label="Cancel" variant="ghost" onClick={() => go("//sign-in")} />
            </HStack>
            <Stepper
              activeStep={step}
              orientation="horizontal"
              onStepClick={goTo}
              label="Create workspace progress"
              density="balanced"
              indicatorPosition="on-track"
            >
              {STEPS.map((s, i) => (
                <Step
                  key={s.label}
                  step={i}
                  label={s.label}
                  {...(s.isOptional === true ? { isOptional: true } : {})}
                  {...(Object.keys(shown(i)).length > 0 ? { status: "error" as const } : {})}
                />
              ))}
            </Stepper>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main">
          {step === 0 && <WorkspaceStep {...part} />}
          {step === 1 && <ModelStep {...part} />}
          {step === 2 && <ConnectorStep {...part} repos={repos} />}
          {step === 3 && <ReviewStep {...part} />}
        </LayoutContent>
      }
      footer={
        <LayoutFooter>
          <HStack wrap="wrap" gap={3} vAlign="center">
            <StackItem size="fill" style={footerZone}>
              {STEPS[step]?.isOptional === true && (
                <Button
                  label="Skip"
                  variant="ghost"
                  onClick={() => {
                    set({ connector: "none" });
                    setStep(step + 1);
                  }}
                />
              )}
            </StackItem>
            <Text type="supporting" color="secondary">
              {step + 1} of {STEPS.length}
            </Text>
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
