import { useState } from "react";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { RadioList, RadioListItem } from "@astryxdesign/core/RadioList";
import { Divider } from "@astryxdesign/core/Divider";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Token } from "@astryxdesign/core/Token";
import type { Question } from "./data";

/** One question: why it is asked, what its answer changes, Juno’s own answer picked, and room to say it differently. */
function One({ q }: { q: Question }) {
  const [one, setOne] = useState(q.best[0]!);
  const [many, setMany] = useState<string[]>([...q.best]);
  const [else_, setElse] = useState("");
  const tag = (id: string) => (q.best.includes(id) && !q.many ? { endContent: <Token size="sm" color="gray" label="Juno’s answer" /> } : {});
  const description = <VStack gap={0.5}><Text type="supporting" color="secondary">{q.why}</Text><Text type="supporting" color="secondary">Changes: {q.changes}</Text></VStack>;
  return (
    <VStack gap={3}>
      {q.many ? (
        <CheckboxList label={q.ask} description={description as never} value={many} onChange={(v: string[]) => setMany(v)}>
          {q.picks.map((p) => <CheckboxListItem key={p.id} value={p.id} label={p.label} {...(p.about ? { description: p.about } : {})} />)}
        </CheckboxList>
      ) : (
        <RadioList label={q.ask} description={description as never} value={one} onChange={(v: string) => setOne(v)}>
          {q.picks.map((p) => <RadioListItem key={p.id} value={p.id} label={p.label} {...(p.about ? { description: p.about } : {})} {...tag(p.id)} />)}
          <RadioListItem value="else" label="Something else" />
        </RadioList>
      )}
      {(q.many || one === "else") && <HStack><StackItem size="fill"><TextInput label={q.many ? "Anything else" : "In your words"} isLabelHidden={!q.many} isOptional={!!q.many} value={else_} onChange={(v: string) => setElse(v)} placeholder={q.many ? "" : "Say it as you would to a colleague"} /></StackItem></HStack>}
    </VStack>
  );
}
export function Round({ questions }: { questions: readonly Question[] }) {
  return <VStack gap={6}>{questions.map((q, i) => <VStack key={q.id} gap={6}>{i > 0 && <Divider />}<One q={q} /></VStack>)}</VStack>;
}
