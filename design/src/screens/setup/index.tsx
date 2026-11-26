// astryx-template: form-wizard-vertical
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { ChatComposer, ChatComposerInput, ChatDictationButton, useChatDictation, type ChatComposerInputHandle } from "@astryxdesign/core/Chat";
import { Icon } from "@astryxdesign/core/Icon";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutFooter, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Card } from "@astryxdesign/core/Card";
import { Link } from "@astryxdesign/core/Link";
import { List, ListItem } from "@astryxdesign/core/List";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Token } from "@astryxdesign/core/Token";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { go } from "../../shell";
import { BLIND, FIRST, PARTS, SAID, SECOND, SO_FAR, STEPS } from "./data";
import { Connect, Found } from "./look";
import { Round } from "./questions";

const MEASURE = 600;
const RAIL = 260;
const GUIDE = 260;
const lean: CSSProperties = { marginInlineStart: RAIL - 16 };
const at = () => Math.max(0, STEPS.findIndex((s) => s.hash === location.hash.slice(1)));

/** Says it back so that it can be measured, then shows what it wrote. */
function Start() {
  const input = useRef<ChatComposerInputHandle>(null);
  const dictation = useChatDictation({ inputRef: input });
  const [said, setSaid] = useState(SAID);
  return <ChatComposer value={said} onChange={(v: string) => setSaid(v)} onSubmit={() => go("setup-ask")} placeholder="I want …" input={<ChatComposerInput handleRef={input} style={{ minHeight: 120 }} />} sendActions={<ChatDictationButton dictation={dictation} />} />;
}
function Back() {
  return (
    <Card variant="muted" padding={4}>
      <VStack gap={1}><Text type="label">Juno heard</Text><Text type="body">12 good calls a week by 31 December, 5 now, without taking more of Bo’s day.</Text></VStack>
    </Card>
  );
}
function Draft() {
  return (
    <VStack gap={5}>
      <MetadataList columns="single" label={{ position: "start", width: 104 }}>{PARTS.map((p, i) => <MetadataListItem key={p} label={p}>{SO_FAR[5]![i]}</MetadataListItem>)}</MetadataList>
      <List density="balanced" hasDividers>
        <ListItem label="Tried on 5 Sep to 4 Oct, sending nothing" description={<Text type="supporting" color="secondary">148 came in. 61 taken on, 22 asked of Bo, 18 watched, 47 left alone. $94</Text>} />
        <ListItem label="7 lines you said, 12 I looked up, 9 are my idea" description={<Text type="supporting" color="secondary">My ideas are marked. Those are the ones to read first</Text>} />
        <ListItem label="10 cases to judge. Bo did 3" description={<Text type="supporting" color="secondary">Right or wrong, about 3 minutes. They are how it will be measured first</Text>} />
      </List>
    </VStack>
  );
}

/** What can be written when nothing may be looked at. It says what it then does not know. */
function Blind() {
  return (
    <VStack gap={5}>
      <MetadataList columns="single" label={{ position: "start", width: 104 }}>{BLIND.map(([p, v]) => <MetadataListItem key={p} label={p}>{v}</MetadataListItem>)}</MetadataList>
      <List density="balanced" hasDividers>
        <ListItem label="Tried on nothing" description={<Text type="supporting" color="secondary">I may not read the past, so I cannot say how it would have gone</Text>} />
        <ListItem label="7 lines you said, none I looked up, 14 are my idea" description={<Text type="supporting" color="secondary">It would begin by asking you about almost everything</Text>} />
      </List>
    </VStack>
  );
}

/** The walkthrough. Its steps and questions are written for this one objective, by Juno’s set-up skill. */
export default function Setup() {
  const hasRail = useMediaQuery("(min-width: 1080px)");
  const hasGuide = useMediaQuery("(min-width: 1320px)");
  const showToast = useToast();
  const [step, setStep] = useState(at());
  const [isBlind, setBlind] = useState(false);
  useEffect(() => { const on = () => setStep(at()); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  const to = (i: number) => go(STEPS[i]!.hash);
  const s = STEPS[step]!;
  // Before anything is said there is one step. The others are written from it.
  const shown = step === 0 ? STEPS.slice(0, 1) : STEPS;
  const nodes = (about: boolean) => shown.map((x, i) => <Step key={x.hash} step={i} label={x.label} indicator="number" {...(about ? { description: x.about } : {})} />);
  const now = SO_FAR[step]!; const was = SO_FAR[Math.max(0, step - 1)]!;
  const guide = (
    <VStack gap={3}>
      <Heading level={5} accessibilityLevel={3}>The draft so far</Heading>
      <List density="compact">
        {PARTS.map((p, i) => <ListItem key={p} label={<Text type="body" color={now[i] ? "primary" : "secondary"}>{p}</Text>} description={<Text type="supporting" color="secondary">{now[i] || "Nothing yet"}</Text>} endContent={step > 0 && now[i] !== was[i] ? <Token size="sm" color="blue" label="New" /> : undefined} />)}
      </List>
      <VStack gap={0}><Text type="supporting" color="secondary">Written by a skill of Juno’s, version 14:</Text><Link href="#juno-skills" type="supporting">Set up a manager</Link></VStack>
    </VStack>
  );
  const body = step === 0 ? <Start /> : step === 1 ? <><Back /><Round key="1" questions={FIRST} /></> : step === 2 ? <Connect /> : step === 3 ? <Found /> : step === 4 ? <Round key="2" questions={SECOND} /> : isBlind ? <Blind /> : <Draft />;
  return (
    <Layout height="fill" padding={4}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={4}>
            <HStack gap={3} vAlign="center" wrap="wrap">
              <StackItem size="fill"><Heading level={1}>{step === 0 ? "New objective" : "More good calls"}</Heading></StackItem>
              <Button label="Talk it through instead" variant="ghost" isIconOnly={!hasRail} icon={<Icon icon={ChatBubbleLeftRightIcon} size="sm" />} onClick={() => go("soon-Chat")} />
              <Button label="Keep for later" variant="secondary" onClick={() => showToast({ body: "Kept. It is under your chats.", uniqueID: "keep" })} />
            </HStack>
            {!hasRail && step > 0 && <Stepper activeStep={step} orientation="horizontal" onStepClick={to} label="Set-up">{nodes(false)}</Stepper>}
          </VStack>
        </LayoutHeader>
      }
      start={hasRail ? <LayoutPanel width={RAIL}><Stepper activeStep={step} orientation="vertical" onStepClick={to} label="Set-up">{nodes(true)}</Stepper></LayoutPanel> : undefined}
      end={hasGuide ? <LayoutPanel width={GUIDE} role="complementary" label="The draft so far">{step < 5 ? guide : null}</LayoutPanel> : undefined}
      content={
        <LayoutContent role="main" style={{ scrollbarGutter: "stable both-edges" }}>
          <Center axis="horizontal">
            <VStack gap={6} width="100%" maxWidth={MEASURE}>
              <VStack gap={1}><Heading level={2}>{s.title}</Heading><Text type="body" color="secondary">{s.lead}</Text></VStack>
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
              {(step === 1 || step === 4) && <Button label="You decide" variant="ghost" onClick={() => to(step + 1)} />}
              {step === 2 && <Button label="Skip looking" variant="ghost" onClick={() => { setBlind(true); to(5); }} />}
              <Button label={step === 5 ? (isBlind ? "Look after all" : "Open the draft") : step === 2 ? "Look" : step === 4 ? "Draft it" : "Continue"} variant="primary" onClick={() => { if (step === 5 && !isBlind) return go("draft"); setBlind(false); to(step === 5 ? 2 : step + 1); }} />
            </HStack>
          </Center>
        </LayoutFooter>
      }
    />
  );
}
