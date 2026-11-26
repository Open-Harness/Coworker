// astryx-template: form-wizard-inline
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Spinner } from "@astryxdesign/core/Spinner";
import { Text } from "@astryxdesign/core/Text";
import type { ConnectGithubView } from "~/modules/views-workspace/types.ts";

export type Phase = "idle" | "running" | "problem" | "ok";
type Ability = ConnectGithubView["abilities"][number];

/** Only a person can install the app, on GitHub. */
export function InstallStep({ running, onInstall }: { readonly running: boolean; readonly onInstall: () => void }) {
  return (
    <>
      <Text>
        Only a person can install the app, on GitHub. Co-worker cannot do it for you. Choose the Acme organisation there, and come back.
      </Text>
      {running ? (
        <Text type="supporting" color="secondary">
          Waiting for you to finish on GitHub. This page notices by itself.
        </Text>
      ) : (
        <HStack gap={2}>
          <Button label="Install on GitHub" variant="primary" onClick={onInstall} />
        </HStack>
      )}
    </>
  );
}

export function ReposStep({
  repos,
  chosen,
  onChange,
  onContinue,
}: {
  readonly repos: ConnectGithubView["repos"];
  readonly chosen: string[];
  readonly onChange: (v: string[]) => void;
  readonly onContinue: () => void;
}) {
  return (
    <>
      <Text>Pick what Co-worker may see. A manager is handed a repo later, and only then does anything start.</Text>
      <CheckboxList label="Repos" isLabelHidden value={chosen} onChange={onChange}>
        {repos.map((r) => (
          <CheckboxListItem key={r.id} value={r.id} label={r.id} description={r.about} />
        ))}
      </CheckboxList>
      <HStack gap={2}>
        <Button label="Continue" variant="primary" isDisabled={chosen.length === 0} onClick={onContinue} />
      </HStack>
    </>
  );
}

interface AbilitiesProps {
  readonly abilities: readonly Ability[];
  readonly repos: readonly string[];
  readonly can: Phase;
  readonly fixed: boolean;
  readonly onFix: () => void;
  readonly onCheck: () => void;
}

/** What the app is allowed to do on GitHub, one line each, and what to do about the one it cannot. */
export function AbilitiesStep({ abilities, repos, can, fixed, onFix, onCheck }: AbilitiesProps) {
  const missing = abilities.filter((a) => a.missing && !fixed);
  return (
    <>
      <Text type="supporting" color="secondary">
        Checked on {repos.join(" and ")}.
      </Text>
      <VStack gap={2}>
        {can === "running" ? (
          <HStack gap={2} vAlign="center">
            <Spinner size="sm" />
            <Text>Looking at what the app is allowed to do</Text>
          </HStack>
        ) : (
          abilities.map((a) => {
            const bad = a.missing && !fixed;
            return (
              <HStack key={a.id} gap={2} vAlign="start">
                <Icon icon={bad ? "error" : "check"} size="sm" color={bad ? "red" : "gray"} />
                <StackItem size="fill">
                  <VStack gap={0}>
                    <Text>{a.does}</Text>
                    <Text type="supporting" color={bad ? "primary" : "secondary"}>
                      {bad ? `Cannot yet: allow ${a.needs}` : a.needs}
                    </Text>
                  </VStack>
                </StackItem>
              </HStack>
            );
          })
        )}
      </VStack>
      {can === "problem" && missing.length > 0 && (
        <Banner
          status="warning"
          title="It cannot push"
          description="Co-worker would have to ask you for every change. Allow Contents, write for the app on GitHub, then check again."
        />
      )}
      {can === "problem" && (
        <HStack gap={2} wrap="wrap">
          <Button label="Open the app’s permissions" variant="secondary" onClick={onFix} />
          <Button label="Check again" variant="primary" isDisabled={!fixed} onClick={onCheck} />
        </HStack>
      )}
    </>
  );
}

export function TryStep({ repo, running, onTry }: { readonly repo: string; readonly running: boolean; readonly onTry: () => void }) {
  return (
    <>
      <Text>It will make a branch, open a draft pull request that adds one line, and close it again. Nothing stays on {repo}.</Text>
      {running ? (
        <Text type="supporting" color="secondary">
          Trying it on {repo}
        </Text>
      ) : (
        <HStack gap={2}>
          <Button label="Try it" variant="primary" onClick={onTry} />
        </HStack>
      )}
    </>
  );
}

export function DoneStep({
  repos,
  onConnectors,
  onManager,
}: {
  readonly repos: readonly string[];
  readonly onConnectors: () => void;
  readonly onManager: () => void;
}) {
  return (
    <>
      <Text>GitHub is connected, on {repos.join(" and ")}. Hand a repo to a manager from its Settings, and say which events it takes.</Text>
      <HStack gap={2}>
        <Button label="Go to Connectors" variant="primary" onClick={onConnectors} />
        <Button label="Coding’s settings" variant="secondary" onClick={onManager} />
      </HStack>
    </>
  );
}
