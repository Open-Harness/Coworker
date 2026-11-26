// astryx-template: form-wizard
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutFooter, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useApi, useBrowser, useGo, useRead } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { FillView } from "~/modules/views-manager/types.ts";
import { Check } from "./check.tsx";
import { Fill, type Answers } from "./fill.tsx";
import { Pick } from "./pick.tsx";
import { nameOf } from "./templates.ts";

const STEPS = ["Where from", "The blanks", "What it found"] as const;

/** What it found, asked for the place chosen: the template is tried in a copy, sending nothing. */
function Tried({ template, place, who, onFound }: { template: string; place: string; who: string; onFound: (view: FillView) => void }) {
  const api = useApi();
  const [tried, setTried] = useState<FillView | "failed" | undefined>(undefined);
  useEffect(() => {
    let isLive = true;
    void api.write("/templates/:template/try", { place }, { template }).then((answer) => {
      if (!isLive) return;
      setTried(answer._tag === "Ok" ? answer.value : "failed");
      if (answer._tag === "Ok") onFound(answer.value);
    });
    return () => {
      isLive = false;
    };
  }, [api, template, place, onFound]);
  if (tried === undefined)
    return (
      <Text type="supporting" color="secondary">
        Reading {place}
      </Text>
    );
  if (tried === "failed" || tried.found === null)
    return (
      <Text type="supporting" color="secondary">
        It could not read {place}. Choose another repo and try again.
      </Text>
    );
  return <Check place={place} found={tried.found} who={who} />;
}

/** A new manager, from what you say or from a template. The two meet in the same draft. */
export default function NewManager({ params, search }: PageProps) {
  const isNarrow = useMediaQuery("(max-width: 640px)");
  const [showToast, go, api, { newId }] = [useToast(), useGo(), useApi(), useBrowser()];
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const template = params["template"];
  const step = template === undefined ? 0 : pathname.endsWith("/check") ? 2 : 1;
  const shell = useRead("/shell");
  const keys = useRead("/settings/keys");
  const connectors = useRead("/settings/connectors");
  const [answers, setAnswers] = useState<Answers>({});
  const who = shell._tag === "Ok" ? shell.value.coworker.name : "";
  const place = search["place"] ?? answers["repo"] ?? "";
  const to = (i: number) =>
    go(
      i === 0
        ? "/managers/new"
        : i === 1
          ? `/managers/new/${template ?? ""}`
          : `/managers/new/${template ?? ""}/check?place=${encodeURIComponent(place)}`,
    );
  const make = async () => {
    const did = await api.write("/do", {
      doing: "manager.make",
      values: { template: template ?? "", answers: JSON.stringify({ ...answers, repo: place }) },
      key: newId(),
    });
    if (did._tag !== "Ok") return showToast({ body: `That did not go through. ${did.says}`, uniqueID: "make-failed" });
    if (did.value._tag === "Refused") return showToast({ body: did.value.why, uniqueID: "make-refused" });
    showToast({
      body: did.value._tag === "Asked" ? "Asked. It waits for a yes in your inbox." : `Made. It is in the tree, under ${who}.`,
      uniqueID: "made",
    });
    go("/managers");
  };
  const frame = (view: FillView | undefined) => (
    <Layout
      height="fill"
      contentWidth={step === 0 ? 880 : 720}
      padding={isNarrow ? 3 : 5}
      defaultHasDividers
      header={
        <LayoutHeader hasDivider={false}>
          <VStack gap={isNarrow ? 3 : 5}>
            <HStack wrap="wrap" gap={3} vAlign="center">
              <StackItem size="fill">
                <VStack gap={0.5}>
                  <Heading level={1}>New manager</Heading>
                  <Text type="supporting" color="secondary">
                    {step === 0
                      ? "Say what you want, or start from a template. Both end in a draft you can change."
                      : `From the template ${view?.name ?? ""}.`}
                  </Text>
                </VStack>
              </StackItem>
              <Button label="Cancel" variant="ghost" onClick={() => go("/managers")} />
            </HStack>
            <Stepper
              activeStep={step}
              orientation="horizontal"
              onStepClick={(i: number) => (i <= step ? to(i) : undefined)}
              label="New manager progress"
              density="balanced"
              indicatorPosition="on-track"
            >
              {STEPS.map((label, i) => (
                <Step key={label} step={i} label={label} />
              ))}
            </Stepper>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main">
          {step === 0 && <Pick who={who} />}
          {step === 1 && view !== undefined && keys._tag === "Ok" && shell._tag === "Ok" && (
            <Fill
              view={view}
              answers={{ ...(place === "" ? {} : { repo: place }), ...answers }}
              onAnswer={(id, value) => setAnswers((was) => ({ ...was, [id]: value }))}
              keys={keys.value}
              people={shell.value.people}
              connector={(id) => nameOf(connectors._tag === "Ok" ? connectors.value.connectors : [], id)}
            />
          )}
          {step === 2 && template !== undefined && <Tried template={template} place={place} who={who} onFound={() => undefined} />}
        </LayoutContent>
      }
      footer={
        step === 0 ? undefined : (
          <LayoutFooter>
            <HStack wrap="wrap" gap={3} vAlign="center">
              <StackItem size="fill">
                <Button label="Back" variant="secondary" onClick={() => to(step - 1)} />
              </StackItem>
              <Text type="supporting" color="secondary">
                {step + 1} of {STEPS.length}
              </Text>
              <StackItem size="fill">
                <HStack wrap="wrap" gap={3} hAlign="end">
                  {step === 1 ? (
                    <Button label="Read the repo and try it" variant="primary" isDisabled={place === ""} onClick={() => to(2)} />
                  ) : (
                    <>
                      <Button label="Open the draft" variant="secondary" onClick={() => go(`/set-up/${template ?? ""}/draft`)} />
                      <Button label="Make it" variant="primary" onClick={() => void make()} />
                    </>
                  )}
                </HStack>
              </StackItem>
            </HStack>
          </LayoutFooter>
        )
      }
    />
  );
  return template === undefined ? (
    frame(undefined)
  ) : (
    <Reading from="/templates/:template" parts={{ template }} failed="We could not read this template">
      {frame}
    </Reading>
  );
}
