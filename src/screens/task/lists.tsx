// astryx-template: work-item-detail
import { Icon } from "@astryxdesign/core/Icon";
import { Section, VStack } from "@astryxdesign/core/Layout";
import { MoreMenu } from "@astryxdesign/core/MoreMenu";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { rtlStyles } from "@astryxdesign/core/utils";
import { ArrowTopRightOnSquareIcon, BeakerIcon, ChevronRightIcon, CpuChipIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { useClock, useGo, useHref } from "~/modules/page/service.ts";
import type { WorkView } from "~/modules/views-manager/types.ts";
import { dayMonth, lasted, say, useZone } from "../manager-frame/words.ts";
import { RowCard } from "./rows.tsx";
import { SECTION_PADDING, SectionHeader } from "./shared.tsx";

export function EvidenceSection({ view }: { readonly view: WorkView }) {
  const [go, href] = [useGo(), useHref()];
  return (
    <Section padding={SECTION_PADDING}>
      <VStack gap={4}>
        <SectionHeader title="Evidence" />
        <VStack gap={1}>
          {view.evidence.map((one) => (
            <RowCard
              key={one.name}
              label={`Open ${one.name}`}
              href={href(one.link)}
              icon={one.size === "Test" ? BeakerIcon : DocumentTextIcon}
              title={one.name}
              lines={[`${one.says} · ${one.size === "Test" ? "A test" : one.size} · made by ${one.by}`]}
              end={
                <MoreMenu
                  presentation="adaptive"
                  label={`Actions for ${one.name}`}
                  items={[
                    { label: "Open", icon: ArrowTopRightOnSquareIcon, onClick: () => go(one.link) },
                    { label: "See the thread that made it", icon: CpuChipIcon, onClick: () => go(`/m/${view.head.id}/threads/${one.by}`) },
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
export function ThreadsSection({ view }: { readonly view: WorkView }) {
  const [go, clock, zone] = [useGo(), useClock(), useZone()];
  const ran = [...view.threads].sort((a, b) => a.started - b.started);
  return (
    <Section padding={SECTION_PADDING}>
      <VStack gap={4}>
        <SectionHeader title="Threads that worked on it" />
        <VStack gap={1}>
          {ran.map((one) => {
            const isWorking = one.state === "working";
            const took = isWorking ? `${lasted(clock.now() - one.started)} so far` : lasted(one.took);
            return (
              <RowCard
                key={one.id}
                label={`Open ${one.id}, ${one.title}`}
                onClick={() => go(`/m/${view.head.id}/threads/${one.id}`)}
                icon={CpuChipIcon}
                title={one.title}
                titleExtra={isWorking ? <StatusDot variant="success" label="Working now" /> : <StatusDot variant="neutral" label="Done" />}
                lines={[
                  one.said,
                  `${one.id} · ${dayMonth(one.started, zone)}, ${clock.time(one.started)} · ${took} · ${say("dollars", one.cost)}`,
                ]}
                end={<Icon icon={ChevronRightIcon} size="sm" color="secondary" xstyle={rtlStyles.mirror} />}
              />
            );
          })}
        </VStack>
      </VStack>
    </Section>
  );
}
