// astryx-template: settings
import { useState } from "react";
import { AlertDialog } from "@astryxdesign/core/AlertDialog";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { HStack, Layout, LayoutContent, LayoutHeader, StackItem, VStack } from "@astryxdesign/core/Layout";
import { Selector } from "@astryxdesign/core/Selector";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useApi, useBrowser, useGo, useRead, useRefresh } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { ManagerSettings } from "~/modules/views-manager/types.ts";
import type { KeysView } from "~/modules/views-workspace/types.ts";
import { ManagerFrame } from "../manager-frame/frame.tsx";
import { say } from "../manager-frame/words.ts";
import { INHERIT, keyOf, ModelPicker } from "./model.tsx";
import { Part } from "./part.tsx";

const NONE: readonly KeysView["models"][number][] = [];
const listed = (names: readonly string[]): string =>
  names.length < 2 ? (names[0] ?? "") : `${names.slice(0, -1).join(", ")} and ${names.at(-1) ?? ""}`;

/** A manager's own Settings tab. What it sets here is for this manager only; the workspace's own are in Settings. */
function Settings({ view, manager }: { readonly view: ManagerSettings; readonly manager: string }) {
  const showToast = useToast();
  const [api, refresh, { newId }, go, keys, shell] = [
    useApi(),
    useRefresh(),
    useBrowser(),
    useGo(),
    useRead("/settings/keys"),
    useRead("/shell"),
  ];
  const juno = shell._tag === "Ok" ? shell.value.coworker.name : "the co-worker";
  const tell = (body: string) => showToast({ body, uniqueID: body });
  const name0 = view.head.name;
  const connections = keys._tag === "Ok" ? keys.value.models : NONE;
  const all = connections.flatMap((one) => one.models);
  // What the workspace chose is named by the id its connection gives it; a short id names the one it is the start of.
  const above = all.find((one) => one.connection === view.workspace.model.connection && one.model.includes(view.workspace.model.model));
  const [isDirty, setDirty] = useState(false);
  const [name, setName] = useState(name0);
  const [answers, setAnswers] = useState(view.answers);
  const [model, setModel] = useState(view.model === "inherit" ? INHERIT : keyOf(view.model));
  const [thinking, setThinking] = useState(view.model === "inherit" ? view.workspace.model.thinking : view.model.thinking);
  const [perDay] = useState(String(view.limits.perDay ?? ""));
  const [perWork, setPerWork] = useState(String(view.limits.perWork ?? ""));
  const [isPaused, setPaused] = useState(view.head.is === "paused");
  const [isRetiring, setRetiring] = useState(false);
  const touch = () => setDirty(true);
  const doing = (id: string, values: Record<string, unknown>) =>
    api.write("/do", { doing: id, values: { manager, ...values }, key: newId() });
  const chosen = all.find((one) => keyOf(one) === model);
  const run = async (id: string, values: Record<string, unknown>, done: string) => {
    const did = await doing(id, values);
    if (did._tag !== "Ok") return showToast({ body: `That did not go through. ${did.says}`, uniqueID: `failed-${id}` });
    tell(done);
    refresh();
  };
  const save = async () => {
    await run(
      "manager.settings",
      {
        name,
        answers,
        ...(chosen === undefined ? {} : { connection: chosen.connection, model: chosen.model, thinking }),
        ...(perWork === "" || Number.isNaN(Number(perWork)) ? {} : { perWork: Number(perWork) }),
      },
      "Saved",
    );
    setDirty(false);
  };
  return (
    <Layout
      height="fill"
      header={
        <LayoutHeader hasDivider={false} padding={4}>
          <HStack gap={2} vAlign="center" wrap="wrap">
            <StackItem size="fill">
              <Text
                type="supporting"
                color="secondary"
              >{`Only for ${name0}. Its playbook, with the work it does, is on the Playbook tab.`}</Text>
            </StackItem>
            <Button label="Save" variant="primary" isDisabled={!isDirty} onClick={() => void save()} />
          </HStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent role="main" padding={4}>
          <VStack gap={4}>
            <Part title="Who it is" about="The name people see, and the one person who answers for it. It asks them, first.">
              <TextInput
                label="Name"
                value={name}
                onChange={(next: string) => {
                  setName(next);
                  touch();
                }}
              />
              <Selector
                label="Who answers for it"
                value={answers}
                options={view.people.map((one) => ({ value: one.id, label: `${one.name}, ${one.role}` }))}
                onChange={(next) => {
                  if (next) {
                    setAnswers(next);
                    touch();
                  }
                }}
              />
            </Part>
            <Divider />
            <Part
              title="Model"
              about="What its agents use when they have not chosen one of their own. Chosen from what the workspace connected."
            >
              <ModelPicker
                connections={connections}
                value={model}
                above={above}
                aboveName="The workspace’s"
                thinking={thinking}
                onChange={(next) => {
                  setModel(next);
                  touch();
                }}
                onThinking={(level) => {
                  setThinking(level as typeof thinking);
                  touch();
                }}
              />
            </Part>
            <Divider />
            <Part
              title="Limits"
              about={`Out of the ${say("dollars", view.workspace.perDay)} a day for everyone.${view.below.length === 0 ? "" : ` ${listed(view.below)}, below it, have parts of their own.`}`}
            >
              <TextInput
                label="Most it may spend in a day, in dollars"
                description={`${juno} handed it this. Change it in About ${juno}, Spending, so the parts still add up.`}
                value={perDay}
                isReadOnly
                onChange={() => undefined}
              />
              <TextInput
                label="Most for one piece of work, in dollars"
                description="A piece of work stops here and asks."
                value={perWork}
                onChange={(next: string) => {
                  setPerWork(next);
                  touch();
                }}
              />
            </Part>
            <Divider />
            <Part title="Pause" about="It takes nothing new on. What is under way finishes, and what waits for a person still waits.">
              <Switch
                label={isPaused ? `${name0} is paused` : `${name0} is working`}
                value={!isPaused}
                onChange={(on: boolean) => {
                  setPaused(!on);
                  void run(
                    on ? "manager.start" : "manager.pause",
                    {},
                    on ? `${name0} works again` : `${name0} is paused. ${view.running} threads finish what they are on.`,
                  );
                }}
              />
            </Part>
            <Divider />
            <Part
              title="Save as a template"
              about="A copy of its playbook with blanks, for making more. It names no repo, no account and no model."
            >
              <HStack>
                <Button
                  label="Save as a template"
                  variant="secondary"
                  onClick={() =>
                    void run("template.save", { name: name0, about: "" }, "Saved as a template. It is in Settings, Templates.")
                  }
                />
              </HStack>
            </Part>
            <Divider />
            <Part
              title="Retire"
              about={`Stops it for good. It has ${view.openWork} open pieces of work and ${view.running} threads running.`}
            >
              <HStack>
                <Button label={`Retire ${name0}`} variant="destructive" onClick={() => setRetiring(true)} />
              </HStack>
            </Part>
          </VStack>
          <AlertDialog
            isOpen={isRetiring}
            onOpenChange={setRetiring}
            title={`Retire ${name0}?`}
            actionLabel={`Retire ${name0}`}
            description={`${view.running} threads stop where they are. The ${view.openWork} open pieces of work are not lost: the ${view.waiting} that wait for a person go to your inbox, the rest are kept, read only.${view.below.length === 0 ? "" : ` ${listed(view.below)}, below it, go up to ${view.head.above === "root" ? juno : "the manager above"} until you choose another.`} Its playbook, with every version, stays.`}
            onAction={() => {
              setRetiring(false);
              void run("manager.retire", {}, `${name0} is retired`).then(() => go("/managers"));
            }}
          />
        </LayoutContent>
      }
    />
  );
}

export default function SettingsPage({ params }: PageProps) {
  const manager = params["manager"] ?? "";
  return (
    <ManagerFrame id={manager} tab="Settings">
      <Reading
        from="/m/:manager/settings"
        parts={params}
        failed="We could not read these settings"
        gone={{ title: "This manager is not here" }}
      >
        {(view) => <Settings view={view} manager={manager} />}
      </Reading>
    </ManagerFrame>
  );
}
