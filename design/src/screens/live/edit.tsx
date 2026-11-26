import { useRef, type ReactNode } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { FormLayout } from "@astryxdesign/core/FormLayout";
import { Layout, LayoutContent, LayoutFooter } from "@astryxdesign/core/Layout";
import { HStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextArea } from "@astryxdesign/core/TextArea";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { Row } from "./data";
import type { Draft, Target } from "./walk";

/** The place a walkthrough points at. */
export const Spot = ({ at, children }: { at: Target; children: ReactNode }) => <div data-spot={at}>{children}</div>;

/** The edit dialog of one trigger, drawn inside the stage. Only When is bound to the walk; the rest is as it was. */
export function Edit({ t, d, onChange }: { t: Row; d: Draft; onChange: (d: Partial<Draft>) => void }) {
  const before = useRef(d.when);
  const close = () => onChange({ editing: false, when: before.current });
  return (
    <Dialog isOpen isInline onOpenChange={(o) => { if (!o) close(); }} purpose="form" width="min(520px, 100%)" padding={0}>
      <Layout padding={4} defaultHasDividers header={<DialogHeader title={t.name} onOpenChange={close} />} content={
        <LayoutContent>
          <FormLayout>
            <Spot at="when"><TextInput label="When" value={d.when} onChange={(when: string) => onChange({ when })} description="In words. Juno turns it into a cron" /></Spot>
            <Spot at="rest">
              <FormLayout>
                <TextArea label="What happens" rows={3} value={t.does} onChange={() => undefined} />
                <TextInput label="Only when" value={t.only} onChange={() => undefined} description="Checked first, in code. Costs nothing when it is not so" />
                <TextInput label="At most" value={t.most} onChange={() => undefined} />
              </FormLayout>
            </Spot>
            <Text type="supporting" color="secondary">On 5 Sep to 4 Oct: 22 found, 19 became work, $13.</Text>
          </FormLayout>
        </LayoutContent>
      } footer={<LayoutFooter hasDivider><HStack gap={2} hAlign="end"><Button label="Cancel" variant="ghost" onClick={close} /><Spot at="keep"><Button label="Keep" variant="primary" onClick={() => onChange({ editing: false, kept: d.when !== before.current })} /></Spot></HStack></LayoutFooter>} />
    </Dialog>
  );
}
