// astryx-template: form-wizard-inline
import { useEffect, useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Reading, useBrowser, useGo, useRefresh } from "~/modules/page/service.ts";
import type { ConnectGithubView } from "~/modules/views-workspace/types.ts";
import { useDoing } from "../doing.ts";
import { AbilitiesStep, DoneStep, InstallStep, ReposStep, TryStep, type Phase } from "./github-steps.tsx";

const STEPS = ["Install the app", "Choose repos", "What it can do there", "Try it", "Done"] as const;

/** Where the walk is when the page opens: by what the console already knows. */
const startAt = (view: ConnectGithubView): number => (view.installed === null ? 0 : view.chosen.length === 0 ? 1 : 2);

function Walk({ view }: { readonly view: ConnectGithubView }) {
  const [go, doing, browser, refresh] = [useGo(), useDoing(), useBrowser(), useRefresh()];
  const [active, setActive] = useState(() => startAt(view));
  const [install, setInstall] = useState<Phase>("idle");
  const [repos, setRepos] = useState<string[]>([...view.chosen]);
  const [can, setCan] = useState<Phase>("idle");
  const [fixed, setFixed] = useState(false);
  const [tried, setTried] = useState<Phase>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const later = (ms: number, f: () => void) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(f, ms);
  };
  // A person installs the app on GitHub: this page notices by itself, because the console says the read changed.
  useEffect(() => {
    if (install === "running" && view.installed !== null) {
      setInstall("ok");
      setRepos([...view.chosen]);
      setActive(1);
    }
  }, [install, view]);

  const startInstall = async () => {
    setInstall("running");
    const did = await doing("connector.connect", { connector: "github" }, ["/settings/connectors/github"]);
    if (did?._tag === "Done" && did.link !== null) browser.open(did.link);
    else if (did === null || did._tag !== "Done") setInstall("idle");
  };
  const checkAbilities = () => {
    setCan("running");
    refresh(["/settings/connectors/github"]);
    later(1300, () => {
      if (fixed || view.abilities.every((a) => !a.missing)) {
        setCan("ok");
        setActive(3);
      } else setCan("problem");
    });
  };
  const tryIt = () => {
    setTried("running");
    void doing("connector.check", { account: "github" }, ["/settings/connectors"]);
    later(1800, () => {
      setTried("ok");
      setActive(4);
    });
  };
  const back = (i: number) => {
    if (i >= active) return;
    setActive(i);
    if (i < 3) setTried("idle");
    if (i < 2) {
      setCan("idle");
      setFixed(false);
    }
    if (i < 1) setInstall("idle");
  };

  const summary = (i: number): string | undefined =>
    i >= active
      ? undefined
      : [
          view.installed === null ? "Installed" : `Installed on ${view.installed.on} by ${view.installed.by}`,
          repos.join(", "),
          `It can do all ${view.abilities.length}`,
          "Opened and closed a draft pull request",
          "",
        ][i];
  const missing = view.abilities.filter((a) => a.missing && !fixed);

  return (
    <VStack gap={4}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill">
          <VStack gap={0.5}>
            <Heading level={3} accessibilityLevel={2}>
              Connect GitHub
            </Heading>
            <Text type="supporting" color="secondary">
              Each step checks itself. You do the ones only a person can.
            </Text>
          </VStack>
        </StackItem>
        <Button label="Back to Connectors" variant="ghost" onClick={() => go("/settings/connectors")} />
      </HStack>
      <Stepper activeStep={active} orientation="vertical" density="compact" label="Connecting GitHub" onStepClick={back}>
        {STEPS.map((label, i) => (
          <Step
            key={label}
            step={i}
            label={label}
            isDisabled={i > active}
            {...(i === 2 && can === "problem" ? { status: "warning" as const } : {})}
            indicator={
              (i === 0 && install === "running") || (i === 2 && can === "running") || (i === 3 && tried === "running") ? (
                <Spinner size="sm" shade="inherit" />
              ) : (
                "auto"
              )
            }
            {...(summary(i)
              ? {
                  endContent: (
                    <StackItem size="fill">
                      <HStack gap={3} hAlign="end">
                        <Text type="supporting" color="secondary" justify="end" maxLines={1}>
                          {summary(i)}
                        </Text>
                        <Text type="supporting" color="accent" weight="medium" textWrap="nowrap">
                          Edit
                        </Text>
                      </HStack>
                    </StackItem>
                  ),
                }
              : {})}
          >
            {i === active && (
              <VStack gap={3} paddingBlockEnd={2}>
                {i === 0 && <InstallStep running={install === "running"} onInstall={() => void startInstall()} />}
                {i === 1 && (
                  <ReposStep
                    repos={view.repos}
                    chosen={repos}
                    onChange={setRepos}
                    onContinue={() => {
                      setActive(2);
                      setCan("running");
                      later(1300, () => setCan(missing.length > 0 ? "problem" : "ok"));
                    }}
                  />
                )}
                {i === 2 && (
                  <AbilitiesStep
                    abilities={view.abilities}
                    repos={repos}
                    can={can}
                    fixed={fixed}
                    onFix={() => setFixed(true)}
                    onCheck={checkAbilities}
                  />
                )}
                {i === 3 && <TryStep repo={repos[0] ?? "the repo"} running={tried === "running"} onTry={tryIt} />}
                {i === 4 && (
                  <DoneStep repos={repos} onConnectors={() => go("/settings/connectors")} onManager={() => go("/m/coding/settings")} />
                )}
              </VStack>
            )}
          </Step>
        ))}
      </Stepper>
    </VStack>
  );
}

/** Connecting GitHub in steps that check themselves. A person does the two that only a person can. */
export default function ConnectGitHub() {
  return <Reading from="/settings/connectors/github">{(view) => <Walk view={view} />}</Reading>;
}
