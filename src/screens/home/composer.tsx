// astryx-template: ai-chat-landing
import { useMemo, useRef, useState, type RefObject } from "react";
import { AtSymbolIcon as MentionIcon, ChatBubbleLeftIcon, EyeIcon, SparklesIcon } from "@heroicons/react/24/outline";
import {
  ChatComposer,
  ChatComposerDrawer,
  ChatComposerInput,
  ChatDictationButton,
  useChatDictation,
  type ChatComposerInputHandle,
  type ChatComposerTrigger,
} from "@astryxdesign/core/Chat";
import { DropdownMenu, DropdownMenuItem } from "@astryxdesign/core/DropdownMenu";
import { Icon } from "@astryxdesign/core/Icon";
import { Token } from "@astryxdesign/core/Token";
import { createStaticSource, TypeaheadItem, type SearchableItem } from "@astryxdesign/core/Typeahead";
import type { ShellView } from "~/modules/views-workspace/types.ts";

/** What the co-worker may do with what you say next. */
const MODES = [
  { key: "auto", label: "Do it", icon: SparklesIcon },
  { key: "show", label: "Do it while I watch", icon: EyeIcon },
  { key: "ask", label: "Only answer", icon: ChatBubbleLeftIcon },
] as const;
const tall = { minHeight: 84 } as const;

const described = (description: string | undefined): { readonly description?: string } =>
  description === undefined ? {} : { description };
type Mention = SearchableItem<{ readonly role: string }>;
type Command = SearchableItem<{ readonly description: string }>;

/** `@` names a person or a manager, `/` a doing. Both are read from what the shell holds. */
function triggersOf(shell: ShellView): { readonly mentions: readonly Mention[]; readonly triggers: ChatComposerTrigger[] } {
  const mentions: Mention[] = [
    ...shell.people.map((one) => ({ id: one.id, label: one.name, auxiliaryData: { role: one.role } })),
    ...shell.tree.filter((one) => one.id !== "root").map((one) => ({ id: one.id, label: one.name, auxiliaryData: { role: one.now } })),
  ];
  const commands: Command[] = shell.doings.map((one) => ({ id: one.id, label: one.id, auxiliaryData: { description: one.label } }));
  return {
    mentions,
    triggers: [
      {
        character: "@",
        searchSource: createStaticSource(mentions),
        renderItem: (item) => <TypeaheadItem item={item} {...described((item.auxiliaryData as { role: string } | undefined)?.role)} />,
        onSelect: (item) => ({ value: `@${item.id}`, label: item.label, variant: "blue" }),
      },
      {
        character: "/",
        searchSource: createStaticSource(commands),
        renderItem: (item) => (
          <TypeaheadItem item={item} {...described((item.auxiliaryData as { description: string } | undefined)?.description)} />
        ),
        onSelect: (item) => ({ value: `/${item.label}`, label: `/${item.label}`, variant: "yellow" }),
      },
    ],
  };
}

export interface ComposerHandle {
  readonly input: RefObject<ChatComposerInputHandle | null>;
}

/** The composer under the greeting. `input` lets the cards put their words in it. */
export function Composer({
  shell,
  input,
  onSubmit,
}: {
  readonly shell: ShellView;
  readonly input: RefObject<ChatComposerInputHandle | null>;
  readonly onSubmit: (text: string) => void;
}) {
  const [mode, setMode] = useState<(typeof MODES)[number]["key"]>("auto");
  const [attachments, setAttachments] = useState<readonly string[]>([]);
  const dictation = useChatDictation({ inputRef: input });
  const { mentions, triggers } = useMemo(() => triggersOf(shell), [shell]);
  const active = MODES.find((one) => one.key === mode) ?? MODES[0];
  const mention = (item: Mention) => {
    input.current?.focus();
    input.current?.insertToken({ value: `@${item.id}`, label: item.label, variant: "blue" });
  };
  return (
    <ChatComposer
      onSubmit={onSubmit}
      placeholder={`Tell ${shell.coworker.name} what you need, or say it`}
      input={
        <ChatComposerInput
          handleRef={input}
          triggers={triggers}
          style={tall}
          onFiles={(files) => setAttachments((was) => [...was, ...files.map((file) => file.name)])}
        />
      }
      drawer={
        attachments.length > 0 ? (
          <ChatComposerDrawer count={attachments.length}>
            {attachments.map((name) => (
              <Token key={name} label={name} onRemove={() => setAttachments((was) => was.filter((one) => one !== name))} />
            ))}
          </ChatComposerDrawer>
        ) : undefined
      }
      headerActions={
        <DropdownMenu
          button={{ label: "Reference", variant: "ghost", size: "sm", icon: <Icon icon={MentionIcon} size="sm" />, isIconOnly: true }}
          hasChevron={false}
          menuWidth={240}
        >
          {mentions.map((item) => (
            <DropdownMenuItem key={item.id} label={item.label} description={item.auxiliaryData?.role} onClick={() => mention(item)} />
          ))}
        </DropdownMenu>
      }
      footerActions={
        <DropdownMenu
          button={{
            label: active.label,
            variant: "ghost",
            size: "md",
            icon: <Icon icon={active.icon} size="sm" />,
            children: active.label,
          }}
          menuWidth={200}
          items={MODES.map((one) => ({ label: one.label, icon: one.icon, onClick: () => setMode(one.key) }))}
        />
      }
      sendActions={<ChatDictationButton dictation={dictation} />}
    />
  );
}

export const useComposerInput = (): RefObject<ChatComposerInputHandle | null> => useRef<ChatComposerInputHandle>(null);
