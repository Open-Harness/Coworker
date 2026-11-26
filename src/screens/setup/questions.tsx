import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Divider } from "@astryxdesign/core/Divider";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Token } from "@astryxdesign/core/Token";
import type { SetUpView } from "~/modules/views-manager/types.ts";
import type { Question } from "~/modules/walkthrough/types.ts";

type Asked = SetUpView["asked"][string];
export type Chosen = Readonly<Record<string, { readonly picks: readonly string[]; readonly else_: string }>>;

const cap = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);
/** The parts of the playbook an answer changes, as a person says them: "Objective, reach". */
const changesOf = (q: Question): string =>
  [...new Set(q.changes.map((line) => line.split("/")[0] ?? line))].map((part, i) => (i === 0 ? cap(part) : part)).join(", ");

interface OneProps {
  readonly q: Question;
  readonly asked: Asked;
  readonly value: { readonly picks: readonly string[]; readonly else_: string };
  readonly onChange: (picks: readonly string[], else_: string) => void;
}

/** One question: why it is asked, what its answer changes, the co-worker's own answer picked, and room to say it differently. */
function One({ q, asked, value, onChange }: OneProps) {
  const one = value.picks[0] ?? "";
  const description = (
    <VStack gap={0.5}>
      <Text type="supporting" color="secondary">
        {q.because}
      </Text>
      <Text type="supporting" color="secondary">
        Changes: {changesOf(q)}
      </Text>
    </VStack>
  );
  const tag = (id: string) =>
    asked.best.includes(id) && !asked.many ? { endContent: <Token size="sm" color="gray" label="Juno’s answer" /> } : {};
  return (
    <VStack gap={3}>
      {asked.many ? (
        <CheckboxList
          label={q.ask}
          description={description as never}
          value={[...value.picks]}
          onChange={(v: string[]) => onChange(v, value.else_)}
        >
          {asked.options.map((p) => (
            <CheckboxListItem key={p.id} value={p.id} label={p.label} {...(p.about === null ? {} : { description: p.about })} />
          ))}
        </CheckboxList>
      ) : (
        <RadioList label={q.ask} description={description as never} value={one} onChange={(v: string) => onChange([v], value.else_)}>
          {asked.options.map((p) => (
            <RadioListItem key={p.id} value={p.id} label={p.label} {...(p.about === null ? {} : { description: p.about })} {...tag(p.id)} />
          ))}
          <RadioListItem value="else" label="Something else" />
        </RadioList>
      )}
      {(asked.many || one === "else") && (
        <HStack>
          <StackItem size="fill">
            <TextInput
              label={asked.many ? "Anything else" : "In your words"}
              isLabelHidden={!asked.many}
              isOptional={asked.many}
              value={value.else_}
              onChange={(v: string) => onChange(value.picks, v)}
              placeholder={asked.many ? "" : "Say it as you would to a colleague"}
            />
          </StackItem>
        </HStack>
      )}
    </VStack>
  );
}

/** What each question starts as: the answer given, or the one the co-worker would pick. */
export const initial = (questions: readonly Question[], answers: Readonly<Record<string, string>>, asked: SetUpView["asked"]): Chosen =>
  Object.fromEntries(questions.map((q) => [q.id, { picks: answers[q.id]?.split(",") ?? asked[q.id]?.best ?? [q.best], else_: "" }]));

export function Round({
  questions,
  asked,
  chosen,
  onChange,
}: {
  questions: readonly Question[];
  asked: SetUpView["asked"];
  chosen: Chosen;
  onChange: (id: string, picks: readonly string[], else_: string) => void;
}) {
  return (
    <VStack gap={6}>
      {questions.map((q, i) => {
        const about = asked[q.id];
        const value = chosen[q.id];
        return about === undefined || value === undefined ? null : (
          <VStack key={q.id} gap={6}>
            {i > 0 && <Divider />}
            <One q={q} asked={about} value={value} onChange={(picks, else_) => onChange(q.id, picks, else_)} />
          </VStack>
        );
      })}
    </VStack>
  );
}
