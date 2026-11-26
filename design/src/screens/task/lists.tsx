import { Section, VStack } from "@astryxdesign/core/Layout";
import { Icon } from "@astryxdesign/core/Icon";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { ArrowTopRightOnSquareIcon, BeakerIcon, ChevronRightIcon, CpuChipIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { rtlStyles } from "@astryxdesign/core/utils";
import { go } from "../../shell";
import { TASK } from "../../world";
import { RowCard } from "./rows";
import { SECTION_PADDING, SectionHeader } from "./shared";

export function EvidenceSection() {
  return (
    <Section padding={SECTION_PADDING}>
      <VStack gap={4}>
        <SectionHeader title="Evidence" />
        <VStack gap={1}>
          {TASK.evidence.map((e) => (
            <RowCard
              key={e.name}
              label={`Open ${e.name}`}
              href="#soon-Evidence"
              icon={e.size === "Test" ? BeakerIcon : DocumentTextIcon}
              title={e.name}
              lines={[`${e.what} · ${e.size === "Test" ? "A test" : e.size} · made by ${e.by}`]}
              end={
                <MoreMenu
                  presentation="adaptive"
                  label={`Actions for ${e.name}`}
                  items={[
                    { label: "Open", icon: ArrowTopRightOnSquareIcon, onClick: () => go("soon-Evidence") },
                    { label: "See the thread that made it", icon: CpuChipIcon, onClick: () => go("thread") },
                  ]}
                />
              }
            />
          ))}
        </VStack>
      </VStack>
    </Section>
  );
}

/** The threads that worked on it, in the order they ran. The one working now is marked. */
export function ThreadsSection() {
  return (
    <Section padding={SECTION_PADDING}>
      <VStack gap={4}>
        <SectionHeader title="Threads that worked on it" />
        <VStack gap={1}>
          {TASK.threads.map((t) => {
            const working = t.state === "working";
            return (
              <RowCard
                key={t.id}
                label={`Open ${t.id}, ${t.role}`}
                onClick={() => go("thread")}
                icon={CpuChipIcon}
                title={t.role}
                titleExtra={working
                  ? <StatusDot variant="success" label="Working now" />
                  : <StatusDot variant="neutral" label="Done" />}
                lines={[t.said, `${t.id} · ${t.time} · ${t.took} · ${t.cost}`]}
                end={<Icon icon={ChevronRightIcon} size="sm" color="secondary" xstyle={rtlStyles.mirror} />}
              />
            );
          })}
        </VStack>
      </VStack>
    </Section>
  );
}
