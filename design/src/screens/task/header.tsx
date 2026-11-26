import * as stylex from "@stylexjs/stylex";
import { LayoutHeader, VStack, HStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { Tokenizer } from "@astryxdesign/core/Tokenizer";
import type { SearchSource } from "@astryxdesign/core/Typeahead";
import { Button } from "@astryxdesign/core/Button";
import { IconButton } from "@astryxdesign/core/IconButton";
import { useToast } from "@astryxdesign/core/Toast";
import { Link } from "@astryxdesign/core/Link";
import { Icon } from "@astryxdesign/core/Icon";
import { rtlStyles } from "@astryxdesign/core/utils";
import { Divider } from "@astryxdesign/core/Divider";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Selector } from "@astryxdesign/core/Selector";
import { Avatar } from "@astryxdesign/core/Avatar";
import { ArrowLeftIcon, ChatBubbleLeftRightIcon, EyeIcon, LinkIcon, ViewColumnsIcon } from "@heroicons/react/24/outline";
import { go } from "../../shell";
import { TASK } from "../../world";
import { ANSWER_OPTIONS, KIND_OPTIONS, LABELS, LANE_DOTS, LANE_OPTIONS, type LabelOption } from "./data";

const styles = stylex.create({
  // A vertical rule has no intrinsic height and the breadcrumb row centers its
  // children rather than stretching them, so the separator needs its own.
  breadcrumbRule: { height: 12 },
});

/** The three fields a person can change here. Each change is told to the manager. */
export type Fields = { lane: string; kind: string; answers: string; labels: LabelOption[] };

const LABEL_SEARCH_SOURCE: SearchSource<LabelOption> = {
  search: (query) => LABELS.filter((o) => o.label.toLowerCase().includes(query.toLowerCase())),
  bootstrap: () => LABELS,
};

const laneOptions = LANE_OPTIONS.map((o) => ({ ...o, icon: <StatusDot variant={LANE_DOTS[o.value as keyof typeof LANE_DOTS]} label={o.label} /> }));
const answerOptions = ANSWER_OPTIONS.map((o) => ({ ...o, icon: <Avatar name={o.label} size="xsm" /> }));

export function PageHeader({ fields, onFieldsChange, isDetailsOpen, onToggleDetails, isNarrow, isTold, onToggleTold }: {
  fields: Fields; onFieldsChange: (patch: Partial<Fields>, what: string) => void;
  isDetailsOpen: boolean; onToggleDetails: () => void; isNarrow: boolean; isTold: boolean; onToggleTold: () => void;
}) {
  const showToast = useToast();
  const actions = [
    { label: isTold ? "Stop telling me" : "Tell me when it moves", icon: EyeIcon, onClick: onToggleTold },
    { label: "Copy link", icon: LinkIcon, onClick: () => { void navigator.clipboard?.writeText(location.href); showToast({ body: "Link copied", uniqueID: "copy-link" }); } },
    { label: "Ask Juno about it", icon: ChatBubbleLeftRightIcon, onClick: () => go("home") },
  ];
  return (
    <LayoutHeader padding={4} hasDivider>
      <VStack gap={4}>
        <HStack gap={4} vAlign="start" hAlign="between">
          <VStack gap={2}>
            <HStack gap={4} vAlign="center" wrap="wrap">
              <Link href="#m-coding-board" type="supporting" color="secondary">
                <HStack as="span" gap={1} vAlign="center">
                  <Icon icon={ArrowLeftIcon} size="sm" xstyle={rtlStyles.mirror} />
                  Coding’s board
                </HStack>
              </Link>
              <Divider orientation="vertical" xstyle={styles.breadcrumbRule} />
              <Text type="supporting" color="secondary">{TASK.id}</Text>
              <Divider orientation="vertical" xstyle={styles.breadcrumbRule} />
              <Text type="supporting" color="secondary">From {TASK.from}</Text>
            </HStack>
            <Heading level={1} maxLines={2}>{TASK.title}</Heading>
          </VStack>
          {!isNarrow && (
            <HStack gap={1}>
              {actions.map((a) => (
                <IconButton key={a.label} label={a.label} variant="secondary" icon={<Icon icon={a.icon} size="sm" />} onClick={a.onClick} />
              ))}
              <Button label={isDetailsOpen ? "Hide details" : "Show details"} variant="secondary" icon={<Icon icon={ViewColumnsIcon} size="sm" />} onClick={onToggleDetails} />
            </HStack>
          )}
        </HStack>
        <HStack gap={1} vAlign="center" wrap="wrap">
          <Selector label="Step" isLabelHidden value={fields.lane} onChange={(lane) => onFieldsChange({ lane }, `moved to ${laneOptions.find((o) => o.value === lane)?.label}`)} options={laneOptions} />
          <Selector label="Kind" isLabelHidden value={fields.kind} onChange={(kind) => onFieldsChange({ kind }, `called a ${kind}`)} options={KIND_OPTIONS} />
          <Selector label="Who answers" isLabelHidden hasSearch searchPlaceholder="Search people…" value={fields.answers} onChange={(answers) => onFieldsChange({ answers }, `given to ${answerOptions.find((o) => o.value === answers)?.label}`)} options={answerOptions} />
          <Tokenizer
            label="Labels"
            isLabelHidden
            searchSource={LABEL_SEARCH_SOURCE}
            value={fields.labels}
            onChange={(labels) => onFieldsChange({ labels }, "relabelled")}
            renderToken={(label, onRemove) => <Token label={label.label} color={label.color} onRemove={onRemove} />}
          />
        </HStack>
      </VStack>
    </LayoutHeader>
  );
}
