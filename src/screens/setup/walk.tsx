// astryx-template: form-wizard-vertical
import { useEffect, useState, type CSSProperties } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { Icon } from "@astryxdesign/core/Icon";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutFooter, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { useGo } from "~/modules/page/service.ts";
import type { SetUpView } from "~/modules/views-manager/types.ts";
import type { Person } from "~/modules/views-workspace/types.ts";
import type { WalkEvent } from "~/modules/walkthrough/types.ts";
import { Draft } from "./draft.tsx";
import { Guide } from "./guide.tsx";
import { Connect, Found } from "./look.tsx";
import { initial, Round, type Chosen } from "./questions.tsx";
import { Back, Start } from "./start.tsx";
import { askedOf, PARTS, startOf, stepOf, titleOf } from "./steps.ts";

const MEASURE = 600;
const RAIL = 260;
const GUIDE = 260;
const lean: CSSProperties = { marginInlineStart: RAIL - 16 };

/** What the page is given of the walk, and what it does to it: every press is an event, and the answer is the walk one step on. */
export interface Walking {
  readonly view: SetUpView | undefined;
  readonly who: string;
  readonly me: string;
  readonly people: readonly Person[];
  readonly zone: string;
  readonly say: (said: string) => void;
  readonly send: (event: WalkEvent) => void;
  /** The skill that wrote the steps, and its version. */
  readonly skill: { readonly skill: string; readonly version: number } | undefined;
}

export function Walk({ view, who, me, people, zone, skill, say, send }: Walking) {
  const hasRail = useMediaQuery("(min-width: 1080px)");
  const start = startOf(who);
  const hasGuide = useMediaQuery("(min-width: 1320px)");
  const [showToast, go] = [useToast(), useGo()];
  const frontier = view === undefined ? 0 : stepOf(view.walk.stage);
  const [viewed, setViewed] = useState<number | undefined>(undefined);
  useEffect(() => setViewed(undefined), [frontier]);
  const step = Math.min(viewed ?? frontier, frontier);
  const to = (i: number) => setViewed(Math.max(0, Math.min(i, frontier)));
  const steps = view?.steps ?? [];
  const current = view === undefined ? start : (steps[step] ?? start);
  // Before anything is said there is one step. The others are written from it.
  const shown = view === undefined ? [start] : steps;
  const nodes = (about: boolean) =>
    shown.map((x, i) => <Step key={x.label} step={i} label={x.label} indicator="number" {...(about ? { description: x.about } : {})} />);
  const questions = view?.walk.rounds[step === 1 ? 0 : 1]?.questions ?? [];
  const [chosen, setChosen] = useState<Chosen>({});
  const answers = view === undefined ? {} : (view.walk.rounds[step === 1 ? 0 : 1]?.answers ?? {});
  const picked: Chosen = view === undefined ? {} : { ...initial(questions, answers, view.asked), ...chosen };
  const answer = () => {
    const given = Object.fromEntries(
      questions.map((q) => {
        const one = picked[q.id];
        return [
          q.id,
          one === undefined
            ? q.best
            : one.picks[0] === "else"
              ? one.else_
              : [...one.picks, ...(one.else_ === "" ? [] : [one.else_])].join(","),
        ];
      }),
    );
    send({ is: "answers", by: me, answers: given });
  };
  const parts = view?.sofar ?? PARTS.map((part) => ({ part, says: "", isNew: false }));
  const guide = skill === undefined ? null : <Guide parts={parts} step={step} skill={skill} who={who} />;
  const body =
    view === undefined || step === 0 ? (
      <Start onSay={say} />
    ) : step === 1 || step === 4 ? (
      <>
        {step === 1 && view.heard !== null ? <Back heard={view.heard} who={who} /> : null}
        <Round
          questions={questions}
          asked={view.asked}
          chosen={picked}
          onChange={(id, picks, else_) => setChosen((was) => ({ ...was, [id]: { picks, else_ } }))}
        />
      </>
    ) : step === 2 ? (
      <Connect wants={view.walk.wants} looks={view.looks} onPress={(connector, is) => send({ is, connector })} />
    ) : step === 3 ? (
      <Found walk={view.walk} figures={view.figures} onWrong={(finding, says) => send({ is: "that is wrong", finding, says })} />
    ) : (
      <Draft view={view} owner={people.find((p) => p.id === askedOf(view))?.name.split(" ")[0] ?? "a person"} zone={zone} />
    );
  const onNext = () => {
    if (view === undefined) return;
    if (step < frontier) return to(step + 1);
    if (step === 1 || step === 4) return answer();
    if (step === 5) return go(`/set-up/${view.walk.id}/draft`);
  };
  return (
    <Layout
      height="fill"
      padding={4}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <HStack gap={3} vAlign="center" wrap="wrap">
              <StackItem size="fill">
                <Heading level={1}>{view === undefined ? "New objective" : titleOf(view.walk.said)}</Heading>
              </StackItem>
              <Button
                label="Talk it through instead"
                variant="ghost"
                isIconOnly={!hasRail}
                icon={<Icon icon={ChatBubbleLeftRightIcon} size="sm" />}
                onClick={() => go("/")}
              />
              <Button
                label="Keep for later"
                variant="secondary"
                onClick={() => showToast({ body: "Kept. It is under your chats.", uniqueID: "keep" })}
              />
            </HStack>
            {!hasRail && step > 0 && (
              <Stepper activeStep={step} orientation="horizontal" onStepClick={to} label="Set-up">
                {nodes(false)}
              </Stepper>
            )}
          </VStack>
        </LayoutHeader>
      }
      start={
        hasRail ? (
          <LayoutPanel width={RAIL}>
            <Stepper activeStep={step} orientation="vertical" onStepClick={to} label="Set-up">
              {nodes(true)}
            </Stepper>
          </LayoutPanel>
        ) : undefined
      }
      end={
        hasGuide ? (
          <LayoutPanel width={GUIDE} role="complementary" label="The draft so far">
            {step < 5 ? guide : null}
          </LayoutPanel>
        ) : undefined
      }
      content={
        <LayoutContent role="main" style={{ scrollbarGutter: "stable both-edges" }}>
          <Center axis="horizontal">
            <VStack gap={6} width="100%" maxWidth={MEASURE}>
              <VStack gap={1}>
                <Heading level={2}>{current.title}</Heading>
                <Text type="body" color="secondary">
                  {current.lead}
                </Text>
              </VStack>
              {body}
            </VStack>
          </Center>
        </LayoutContent>
      }
      footer={
        <LayoutFooter hasDivider>
          <Center axis="horizontal" {...(hasRail && !hasGuide ? { style: lean } : {})}>
            <HStack gap={3} vAlign="center" width="100%" maxWidth={MEASURE}>
              <Button label="Back" variant="secondary" isDisabled={step === 0} onClick={() => to(step - 1)} />
              <StackItem size="fill" />
              {(step === 1 || step === 4) && (
                <Button
                  label="You decide"
                  variant="ghost"
                  onClick={() => (step < frontier ? to(step + 1) : send({ is: "answers", by: me, answers: {} }))}
                />
              )}
              {step === 2 && view !== undefined && (
                <Button
                  label="Skip looking"
                  variant="ghost"
                  onClick={() => view.walk.wants.forEach((w) => send({ is: "skipped", connector: w.connector }))}
                />
              )}
              <Button
                label={step === 5 ? "Open the draft" : step === 2 ? "Look" : step === 4 ? "Draft it" : "Continue"}
                variant="primary"
                onClick={onNext}
              />
            </HStack>
          </Center>
        </LayoutFooter>
      }
    />
  );
}
