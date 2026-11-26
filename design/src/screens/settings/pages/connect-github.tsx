// astryx-template: form-wizard-inline
import { useEffect, useRef, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Heading, Text } from "@astryxdesign/core/Text";
import { go } from "../../../shell";
import { ABILITIES, REPOS, STEPS } from "../parts/github-steps";

type Phase = "idle" | "running" | "problem" | "ok";

/** Connecting GitHub in steps that check themselves. A person does the two that only a person can. */
export default function ConnectGitHub() {
  const [active, setActive] = useState(0);
  const [install, setInstall] = useState<Phase>("idle");
  const [repos, setRepos] = useState<string[]>(["acme/web", "acme/docs"]);
  const [can, setCan] = useState<Phase>("idle");
  const [fixed, setFixed] = useState(false);
  const [tried, setTried] = useState<Phase>("idle");
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const later = (ms: number, f: () => void) => { window.clearTimeout(timer.current); timer.current = window.setTimeout(f, ms); };

  const startInstall = () => { setInstall("running"); later(1500, () => { setInstall("ok"); setActive(1); }); };
  const checkAbilities = (isFixed: boolean) => { setCan("running"); later(1300, () => { if (isFixed) { setCan("ok"); setActive(3); } else setCan("problem"); }); };
  const tryIt = () => { setTried("running"); later(1800, () => { setTried("ok"); setActive(4); }); };
  const back = (i: number) => { if (i >= active) return; setActive(i); if (i < 3) { setTried("idle"); } if (i < 2) { setCan("idle"); setFixed(false); } if (i < 1) setInstall("idle"); };

  const summary = (i: number): string | undefined => i >= active ? undefined : [
    "Installed on acme by Ama Mensah", repos.join(", "), "It can do all five", "Opened and closed a draft pull request", ""][i];
  const missing = ABILITIES.filter((a) => a.missing === true && !fixed);

  return (
    <VStack gap={4}>
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill"><VStack gap={0.5}><Heading level={3} accessibilityLevel={2}>Connect GitHub</Heading><Text type="supporting" color="secondary">Each step checks itself. You do the ones only a person can.</Text></VStack></StackItem>
        <Button label="Back to Connectors" variant="ghost" onClick={() => go("set-connectors")} />
      </HStack>
      <Stepper activeStep={active} orientation="vertical" density="compact" label="Connecting GitHub" onStepClick={back}>
        {STEPS.map((label, i) => (
          <Step key={label} step={i} label={label} isDisabled={i > active}
            status={i === 2 && can === "problem" ? "warning" : undefined}
            indicator={(i === 0 && install === "running") || (i === 2 && can === "running") || (i === 3 && tried === "running") ? <Spinner size="sm" shade="inherit" /> : "auto"}
            endContent={summary(i) ? <StackItem size="fill"><HStack gap={3} hAlign="end"><Text type="supporting" color="secondary" justify="end" maxLines={1}>{summary(i)}</Text><Text type="supporting" color="accent" weight="medium" textWrap="nowrap">Edit</Text></HStack></StackItem> : undefined}>
            {i === active && (
              <VStack gap={3} paddingBlockEnd={2}>
                {i === 0 && (<>
                  <Text>Only a person can install the app, on GitHub. Co-worker cannot do it for you. Choose the Acme organisation there, and come back.</Text>
                  {install === "running" ? <Text type="supporting" color="secondary">Waiting for you to finish on GitHub. This page notices by itself.</Text>
                    : <HStack gap={2}><Button label="Install on GitHub" variant="primary" onClick={startInstall} /></HStack>}
                </>)}
                {i === 1 && (<>
                  <Text>Pick what Co-worker may see. A manager is handed a repo later, and only then does anything start.</Text>
                  <CheckboxList label="Repos" isLabelHidden value={repos} onChange={(v: string[]) => setRepos(v)}>
                    {REPOS.map((r) => <CheckboxListItem key={r.id} value={r.id} label={r.id} description={r.about} />)}
                  </CheckboxList>
                  <HStack gap={2}><Button label="Continue" variant="primary" isDisabled={repos.length === 0} onClick={() => { setActive(2); setCan("running"); later(1300, () => setCan("problem")); }} /></HStack>
                </>)}
                {i === 2 && (<>
                  <Text type="supporting" color="secondary">Checked on {repos.join(" and ")}.</Text>
                  <VStack gap={2}>
                    {can === "running" ? <HStack gap={2} vAlign="center"><Spinner size="sm" /><Text>Looking at what the app is allowed to do</Text></HStack> : ABILITIES.map((a) => {
                      const bad = a.missing === true && !fixed;
                      return <HStack key={a.id} gap={2} vAlign="start"><Icon icon={bad ? "error" : "check"} size="sm" color={bad ? "red" : "gray"} /><StackItem size="fill"><VStack gap={0}><Text>{a.does}</Text><Text type="supporting" color={bad ? "primary" : "secondary"}>{bad ? `Cannot yet: allow ${a.needs}` : a.needs}</Text></VStack></StackItem></HStack>;
                    })}
                  </VStack>
                  {can === "problem" && missing.length > 0 && (
                    <Banner status="warning" title="It cannot push" description="Co-worker would have to ask you for every change. Allow Contents, write for the app on GitHub, then check again." />
                  )}
                  {can === "problem" && (
                    <HStack gap={2} wrap="wrap">
                      <Button label="Open the app’s permissions" variant="secondary" onClick={() => { setFixed(true); }} />
                      <Button label="Check again" variant="primary" isDisabled={!fixed} onClick={() => checkAbilities(fixed)} />
                    </HStack>
                  )}
                </>)}
                {i === 3 && (<>
                  <Text>It will make a branch, open a draft pull request that adds one line, and close it again. Nothing stays on acme/web.</Text>
                  {tried === "running" ? <Text type="supporting" color="secondary">Trying it on acme/web</Text> : <HStack gap={2}><Button label="Try it" variant="primary" onClick={tryIt} /></HStack>}
                </>)}
                {i === 4 && (<>
                  <Text>GitHub is connected, on {repos.join(" and ")}. Hand a repo to a manager from its Settings, and say which events it takes.</Text>
                  <HStack gap={2}><Button label="Go to Connectors" variant="primary" onClick={() => go("set-connectors")} /><Button label="Coding’s settings" variant="secondary" onClick={() => go("m-coding-settings")} /></HStack>
                </>)}
              </VStack>
            )}
          </Step>
        ))}
      </Stepper>
    </VStack>
  );
}
