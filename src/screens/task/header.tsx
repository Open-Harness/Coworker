// astryx-template: work-item-detail
import { Avatar } from "@astryxdesign/core/Avatar";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { HStack, LayoutHeader, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Token } from "@astryxdesign/core/Token";
import { Tokenizer } from "@astryxdesign/core/Tokenizer";
import type { SearchSource } from "@astryxdesign/core/Typeahead";
import { useClipboard } from "@astryxdesign/core/hooks";
import { rtlStyles } from "@astryxdesign/core/utils";
import { ArrowLeftIcon, ChatBubbleLeftRightIcon, EyeIcon, LinkIcon, ViewColumnsIcon } from "@heroicons/react/24/outline";
import { useGo, useHref } from "~/modules/page/service.ts";
import type { WorkView } from "~/modules/views-manager/types.ts";

export interface LabelOption {
  readonly id: string;
  readonly label: string;
  readonly color: "gray";
}
/** The three fields a person can change here. Each change is told to the manager. */
export interface Fields {
  readonly step: string;
  readonly kind: string;
  readonly answers: string;
  readonly labels: readonly LabelOption[];
}
const RULE = { height: 12 } as const;

/** A step's dot: the first is not begun, the last is done, and the ones between are under way. */
const dotOf = (index: number, last: number): "neutral" | "accent" | "success" =>
  index === 0 ? "neutral" : index === last ? "success" : "accent";

export function PageHeader(props: {
  readonly view: WorkView;
  readonly name: string;
  readonly fields: Fields;
  readonly onFieldsChange: (patch: Partial<Fields>, what: string) => void;
  readonly isDetailsOpen: boolean;
  readonly onToggleDetails: () => void;
  readonly isNarrow: boolean;
  readonly isTold: boolean;
  readonly onToggleTold: () => void;
}) {
  const { view, name, fields, onFieldsChange, isDetailsOpen, onToggleDetails, isNarrow, isTold, onToggleTold } = props;
  const [showToast, go, href, { copy }] = [useToast(), useGo(), useHref(), useClipboard({ announce: "Link copied" })];
  const { steps, kinds, answerers } = view.options;
  const stepOptions = steps.map((one, i) => ({
    value: one.id,
    label: one.name,
    icon: <StatusDot variant={dotOf(i, steps.length - 1)} label={one.name} />,
  }));
  const answerOptions = answerers.map((one) => ({ value: one.id, label: one.name, icon: <Avatar name={one.name} size="xsm" /> }));
  const labelsOf = view.labels.map((one) => ({ id: one.toLowerCase(), label: one, color: "gray" as const }));
  const source: SearchSource<LabelOption> = {
    search: (query) => labelsOf.filter((one) => one.label.toLowerCase().includes(query.toLowerCase())),
    bootstrap: () => labelsOf,
  };
  const labelOf = (options: readonly { readonly value: string; readonly label: string }[], value: string): string =>
    options.find((one) => one.value === value)?.label ?? value;
  const actions = [
    { label: isTold ? "Stop telling me" : "Tell me when it moves", icon: EyeIcon, onClick: onToggleTold },
    {
      label: "Copy link",
      icon: LinkIcon,
      onClick: () =>
        void copy(href(`/m/${view.head.id}/work/${view.work.id}`)).then(() => showToast({ body: "Link copied", uniqueID: "copy-link" })),
    },
    { label: "Ask Juno about it", icon: ChatBubbleLeftRightIcon, onClick: () => go("/") },
  ];
  return (
    <LayoutHeader padding={4} hasDivider>
      <VStack gap={4}>
        <HStack gap={4} vAlign="start" hAlign="between">
          <VStack gap={2}>
            <HStack gap={4} vAlign="center" wrap="wrap">
              <Link href={href(`/m/${view.head.id}/board`)} type="supporting" color="secondary">
                <HStack as="span" gap={1} vAlign="center">
                  <Icon icon={ArrowLeftIcon} size="sm" xstyle={rtlStyles.mirror} />
                  {`${name}’s board`}
                </HStack>
              </Link>
              <Divider orientation="vertical" style={RULE} />
              <Text type="supporting" color="secondary">
                {view.work.id}
              </Text>
              <Divider orientation="vertical" style={RULE} />
              <Text type="supporting" color="secondary">
                From {view.from}
              </Text>
            </HStack>
            <Heading level={1} maxLines={2}>
              {view.work.title}
            </Heading>
          </VStack>
          {!isNarrow && (
            <HStack gap={1}>
              {actions.map((one) => (
                <IconButton
                  key={one.label}
                  label={one.label}
                  variant="secondary"
                  icon={<Icon icon={one.icon} size="sm" />}
                  onClick={one.onClick}
                />
              ))}
              <Button
                label={isDetailsOpen ? "Hide details" : "Show details"}
                variant="secondary"
                icon={<Icon icon={ViewColumnsIcon} size="sm" />}
                onClick={onToggleDetails}
              />
            </HStack>
          )}
        </HStack>
        <HStack gap={1} vAlign="center" wrap="wrap">
          <Selector
            label="Step"
            isLabelHidden
            value={fields.step}
            onChange={(step) => onFieldsChange({ step }, `moved to ${labelOf(stepOptions, step)}`)}
            options={stepOptions}
          />
          <Selector
            label="Kind"
            isLabelHidden
            value={fields.kind}
            onChange={(kind) =>
              onFieldsChange(
                { kind },
                `called a ${labelOf(
                  kinds.map((one) => ({ value: one.id, label: one.name })),
                  kind,
                )}`,
              )
            }
            options={kinds.map((one) => ({ value: one.id, label: one.name }))}
          />
          <Selector
            label="Who answers"
            isLabelHidden
            hasSearch
            searchPlaceholder="Search people…"
            value={fields.answers}
            onChange={(answers) => onFieldsChange({ answers }, `given to ${labelOf(answerOptions, answers)}`)}
            options={answerOptions}
          />
          <Tokenizer
            label="Labels"
            isLabelHidden
            searchSource={source}
            value={[...fields.labels]}
            onChange={(labels) => onFieldsChange({ labels }, "relabelled")}
            renderToken={(label, onRemove) => <Token label={label.label} color={label.color} onRemove={onRemove} />}
          />
        </HStack>
      </VStack>
    </LayoutHeader>
  );
}
