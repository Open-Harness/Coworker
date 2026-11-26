import { Field } from "@astryxdesign/core/Field";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { VStack } from "@astryxdesign/core/Layout";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Selector } from "@astryxdesign/core/Selector";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Blank } from "~/modules/templates/types.ts";
import type { FillView } from "~/modules/views-manager/types.ts";
import type { KeysView, Person } from "~/modules/views-workspace/types.ts";
import { ModelPicker } from "./model-picker.tsx";

type Filled = FillView["blanks"][number];
export type Answers = Readonly<Record<string, string>>;

/** What the page calls a blank when it asks: its own words for the kinds there are, the template's for any other. */
const LABELS: Readonly<Record<string, string>> = {
  repo: "Which repo",
  name: "Name",
  owner: "Who answers for it",
  perWork: "Most it may spend on one piece of work, in dollars",
};
const labelOf = (b: Blank): string => LABELS[b.id] ?? b.ask.replace(/\?$/u, "");
const cap = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
const from = (b: Blank): string | undefined => (b.best === null ? undefined : `From ${b.best.from}`);

/** The blanks of a template. Only the ones without an answer are questions: every other says where its answer came from. */
export function Fill({
  view,
  answers,
  onAnswer,
  keys,
  people,
  connector,
}: {
  view: FillView;
  answers: Answers;
  onAnswer: (id: string, value: string) => void;
  keys: KeysView;
  people: readonly Person[];
  connector: (id: string) => string;
}) {
  const valueOf = (b: Filled): string => answers[b.id] ?? b.best?.value ?? "";
  const models = view.blanks.filter((b) => b.is.a === "model");
  const rest = view.blanks.filter((b) => b.is.a !== "model");
  return (
    <VStack gap={5}>
      <VStack gap={1}>
        <Heading level={2}>{view.name}</Heading>
        <Text type="supporting" color="secondary">
          One question, the rest is answered. Change what is wrong. The manager gets a copy of its own: later changes to the template do not
          reach it.
        </Text>
      </VStack>
      <FormLayout defaultOptionality="optional">
        {rest.map((b) =>
          b.is.a === "place" ? (
            <Selector
              key={b.id}
              label={labelOf(b)}
              isRequired
              value={valueOf(b)}
              onChange={(v) => onAnswer(b.id, v ?? "")}
              options={b.picks.map((p) => ({ value: p.id, label: p.id, ...(p.about === null ? {} : { description: p.about }) }))}
              description={`Where the co-worker has the ${connector(b.is.connector)} app. Read first, nothing is changed.`}
            />
          ) : b.is.a === "person" ? (
            <Selector
              key={b.id}
              label={labelOf(b)}
              value={valueOf(b)}
              onChange={(v) => onAnswer(b.id, v ?? valueOf(b))}
              options={b.picks.map((p) => ({ value: p.id, label: people.find((x) => x.id === p.id)?.name ?? p.id }))}
              {...(from(b) === undefined ? {} : { description: from(b) as string })}
            />
          ) : b.is.a === "number" ? (
            <NumberInput
              key={b.id}
              label={labelOf(b)}
              value={Number(valueOf(b))}
              onChange={(v: number) => onAnswer(b.id, String(v))}
              min={1}
              isIntegerOnly
              {...(from(b) === undefined ? {} : { description: from(b) as string })}
            />
          ) : (
            <TextInput
              key={b.id}
              label={labelOf(b)}
              value={valueOf(b)}
              onChange={(v: string) => onAnswer(b.id, v)}
              {...(from(b) === undefined ? {} : { description: from(b) as string })}
            />
          ),
        )}
        {models.length === 0 ? null : (
          <Field
            label="Models"
            inputID="models"
            isGroupLabel
            description={`From ${models[0]?.best?.from ?? "the workspace"}. A template never names a model`}
          >
            <VStack gap={4}>
              {models.map((b) => (
                <ModelPicker
                  key={b.id}
                  keys={keys}
                  label={cap(b.is.a === "model" ? b.is.agent : b.id)}
                  value={answers[b.id] ?? ""}
                  onChange={(m) => onAnswer(b.id, m)}
                />
              ))}
            </VStack>
          </Field>
        )}
      </FormLayout>
    </VStack>
  );
}
