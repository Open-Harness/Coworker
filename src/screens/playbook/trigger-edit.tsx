// astryx-template: settings
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { HStack, Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { PlaybookView } from "~/modules/views-manager/types.ts";
import { useNotes } from "./notes.tsx";
import { money, upper, whenWords } from "./words.ts";

export interface Trigger {
  readonly id: string;
  readonly name: string;
  readonly by: string;
  readonly when: string;
  readonly cron: string;
  readonly does: string;
  readonly only: string;
  readonly most: string;
  readonly found: number;
  readonly used: number;
  readonly cost: string;
  readonly next: string | null;
  readonly because: string;
}
export function rowsOf(view: PlaybookView, next: (at: number) => string): readonly Trigger[] {
  return view.triggers.map(({ trigger: t, says, most, came, took, cost, next: at }) => ({
    id: t.id,
    name: t.name,
    by: upper(t.by),
    when: whenWords(t),
    cron: t.by === "cron" ? t.when.cron : "",
    does: says,
    only: t.only,
    most,
    found: came,
    used: took,
    cost: money(cost),
    next: at === null ? null : next(at),
    because: view.because[`triggers/${t.id}`]?.why ?? "",
  }));
}

export function Edit({ t, onClose, onKeep }: { t: Trigger; onClose: () => void; onKeep: (t: Trigger) => void }) {
  const { isDraft } = useNotes();
  const [x, set] = useState(t);
  const up = (c: Partial<Trigger>) => set((v) => ({ ...v, ...c }));
  return (
    <Dialog
      isOpen
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      purpose="form"
      width={520}
      padding={0}
    >
      <Layout
        header={<DialogHeader title={t.name} onOpenChange={onClose} />}
        content={
          <LayoutContent>
            <FormLayout>
              <TextInput
                label="When"
                value={x.when}
                onChange={(when: string) => up({ when })}
                description={x.by === "Cron" ? "In words. Juno turns it into a cron" : ""}
              />
              <TextArea label="What happens" rows={3} value={x.does} onChange={(does: string) => up({ does })} />
              <TextInput
                label="Only when"
                value={x.only}
                onChange={(only: string) => up({ only })}
                description="Checked first, in code. Costs nothing when it is not so"
              />
              <TextInput label="At most" value={x.most} onChange={(most: string) => up({ most })} />
              <Text type="supporting" color="secondary">
                {isDraft ? "On the past work" : "In 7 days"}: {t.found} came, {t.used} became work, {t.cost}.
              </Text>
            </FormLayout>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <HStack gap={2} hAlign="end">
              <Button label="Cancel" variant="ghost" onClick={onClose} />
              <Button label="Keep" variant="primary" onClick={() => onKeep(x)} />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
