// astryx-template: ai-chat-landing
'use client';

import {useRef, useState, type CSSProperties} from 'react';

import {Layout, LayoutContent, VStack, HStack} from '@astryxdesign/core/Layout';
import {Text, Heading} from '@astryxdesign/core/Text';
import {
  ChatComposer,
  ChatComposerDrawer,
  ChatComposerInput,
  ChatDictationButton,
  useChatDictation,
  type ChatComposerInputHandle,
  type ChatComposerTrigger,
} from '@astryxdesign/core/Chat';
import {
  createStaticSource,
  TypeaheadItem,
  type SearchableItem,
} from '@astryxdesign/core/Typeahead';
import {ToggleButton, ToggleButtonGroup} from '@astryxdesign/core/ToggleButton';
import {Token} from '@astryxdesign/core/Token';
import {ClickableCard} from '@astryxdesign/core/ClickableCard';
import {Grid} from '@astryxdesign/core/Grid';
import {Icon} from '@astryxdesign/core/Icon';
import {DropdownMenu, DropdownMenuItem} from '@astryxdesign/core/DropdownMenu';
import {Avatar} from '@astryxdesign/core/Avatar';
import {AcademicCapIcon, AdjustmentsHorizontalIcon, AtSymbolIcon as MentionIcon, BoltIcon, ChatBubbleLeftIcon, EyeIcon, MagnifyingGlassIcon as SearchIcon, SparklesIcon} from '@heroicons/react/24/outline';
import {ACTIONS} from '../../juno/actions';
import {JUNO} from '../../juno/world';
import {go} from '../../shell';
import {MANAGERS, PEOPLE} from '../../world';

// Fill the content area so the greeting and composer stay vertically centered.
const pageStyle: CSSProperties = {minHeight: '100%'};
const composerInput: CSSProperties = {minHeight: 84};
const categories: CSSProperties = {paddingInline: 'var(--spacing-3)'};

// Suggestion cards shown once a category is selected.
const CATEGORY_SUGGESTIONS: Record<string, Array<{heading: string; body: string; prompt: string; to?: string}>> = {
  set: [
    {heading: 'Get to something', body: 'Say what you want. Juno plans it, tries it, then makes it', prompt: 'I want ', to: 'setup'},
    {heading: 'Connect a second number', body: 'You scan one code, Juno does the rest', prompt: 'Connect our second WhatsApp number.'},
    {heading: 'Look at it every Monday', body: 'A trigger, by the clock', prompt: 'Every Monday at 8, tell me '},
    {heading: 'Change how you write to customers', body: 'Juno writes that way from the next mail on', prompt: 'When you write to customers, '},
  ],
  know: [
    {heading: 'What needs a person today?', body: 'Three things wait for you', prompt: 'What needs a person today?'},
    {heading: 'Why is Support slower?', body: 'You asked this at 09:18', prompt: 'Why is Support slower?', to: 'chat-support'},
    {heading: 'What did we spend, and on what?', body: 'By manager, and by piece of work', prompt: 'What did we spend this week, and on what?'},
    {heading: 'What did you send to Northwind?', body: 'Every mail and message, by anyone', prompt: 'What did you send to Northwind this month?'},
  ],
  do: [
    {heading: 'Take something on', body: 'Say what done means, or let Juno ask', prompt: 'Take this on: '},
    {heading: 'Answer the review on #418', body: 'One comment is open', prompt: 'Answer the review on #418.'},
    {heading: 'Write to Pat Reyes', body: 'You see it before it goes', prompt: 'Write to Pat Reyes about the Monday export.'},
    {heading: 'Stop something', body: 'A thread, a manager or everything', prompt: 'Stop '},
  ],
  learn: [
    {heading: 'Make a manager', body: 'Juno does it on the screen, slowly', prompt: 'Show me how to make a manager.', to: 'live'},
    {heading: 'Read a board', body: 'What the lanes mean, on your own work', prompt: 'Show me how to read a board.'},
    {heading: 'Take over a conversation', body: 'And hand it back', prompt: 'Show me how to take over a conversation.'},
    {heading: 'Undo what you did', body: 'Anything Juno changed', prompt: 'Show me how to undo what you did.'},
  ],
};

// Category filters, shared by the toggle group and the composer mode menu.
const CATEGORIES = [
  {key: 'set', label: 'Set up', icon: AdjustmentsHorizontalIcon},
  {key: 'know', label: 'Find out', icon: SearchIcon},
  {key: 'do', label: 'Get done', icon: BoltIcon},
  {key: 'learn', label: 'Show me how', icon: AcademicCapIcon},
] as const;

// What Juno may do with what you say next.
const MODE_OPTIONS = [
  {key: 'auto', label: 'Do it', icon: SparklesIcon},
  {key: 'show', label: 'Do it while I watch', icon: EyeIcon},
  {key: 'ask', label: 'Only answer', icon: ChatBubbleLeftIcon},
] as const;

// Composer trigger data: @ mentions and / commands.
const MENTION_ITEMS: SearchableItem<{role: string}>[] = [
  ...Object.values(PEOPLE).map(p => ({id: p.id, label: p.name, auxiliaryData: {role: p.role}})),
  ...MANAGERS.filter(m => m.id !== 'root').map(m => ({id: m.id, label: m.name, auxiliaryData: {role: m.job}})),
];

const COMMAND_ITEMS: SearchableItem<{description: string}>[] = ACTIONS.map(a => ({
  id: a.id,
  label: a.id,
  auxiliaryData: {description: a.label},
}));

const mentionTrigger: ChatComposerTrigger = {
  character: '@',
  searchSource: createStaticSource(MENTION_ITEMS),
  renderItem: item => (
    <TypeaheadItem
      item={item}
      description={(item.auxiliaryData as {role: string})?.role}
    />
  ),
  onSelect: item => ({
    value: `@${item.id}`,
    label: item.label,
    variant: 'blue',
  }),
};

const commandTrigger: ChatComposerTrigger = {
  character: '/',
  searchSource: createStaticSource(COMMAND_ITEMS),
  renderItem: item => (
    <TypeaheadItem
      item={item}
      description={(item.auxiliaryData as {description: string})?.description}
    />
  ),
  onSelect: item => ({
    value: `/${item.label}`,
    label: `/${item.label}`,
    variant: 'yellow',
  }),
};

const composerTriggers = [mentionTrigger, commandTrigger];

// Main component

export default function AIChatTemplate() {
  const [mode, setMode] = useState<string | null>('auto');
  const [category, setCategory] = useState<string | null>('set');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);
  const composerInputRef = useRef<ChatComposerInputHandle>(null);
  const dictation = useChatDictation({inputRef: composerInputRef});

  const activeMode = MODE_OPTIONS.find(m => m.key === mode) ?? MODE_OPTIONS[0];
  const suggestions = category ? CATEGORY_SUGGESTIONS[category] : null;

  const applySuggestion = (prompt: string) => {
    const input = composerInputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    if (document.activeElement) {
      window.getSelection()?.selectAllChildren(document.activeElement);
    }
    input.insertText(prompt);
  };

  const insertMention = (item: (typeof MENTION_ITEMS)[number]) => {
    const input = composerInputRef.current;
    if (!input) {
      return;
    }
    input.focus();
    if (document.activeElement) {
      const sel = window.getSelection();
      sel?.selectAllChildren(document.activeElement);
      sel?.collapseToEnd();
    }
    input.insertToken({
      value: `@${item.id}`,
      label: item.label,
      variant: 'blue',
    });
  };

  return (
    <Layout
      height="fill"
      contentWidth={720}
      padding={6}
      content={
        <LayoutContent role="main">
          <VStack gap={8} vAlign="center" style={pageStyle}>
            {/* Greeting */}
            <VStack gap={1}>
              <HStack gap={2} vAlign="center">
                <Avatar name={JUNO.name} size={24} tooltip={false} />
                <Text type="large" as="h2">
                  Good morning, Ama
                </Text>
              </HStack>
              <Text type="display-2" as="h1">
                What should I do?
              </Text>
            </VStack>

            {/* Composer */}
            <ChatComposer
              onSubmit={() => go(mode === 'show' ? 'live' : 'chat-support')}
              placeholder="Tell Juno what you need, or say it"
              input={
                <ChatComposerInput
                  handleRef={composerInputRef}
                  triggers={composerTriggers}
                  style={composerInput}
                  onFiles={files =>
                    setAttachments(prev => [...prev, ...files.map(f => f.name)])
                  }
                />
              }
              drawer={
                attachments.length > 0 ? (
                  <ChatComposerDrawer count={attachments.length}>
                    {attachments.map(name => (
                      <Token
                        key={name}
                        label={name}
                        onRemove={() =>
                          setAttachments(prev => prev.filter(n => n !== name))
                        }
                      />
                    ))}
                  </ChatComposerDrawer>
                ) : undefined
              }
              headerActions={
                <DropdownMenu
                  button={{
                    label: 'Reference',
                    variant: 'ghost',
                    size: 'sm',
                    icon: <Icon icon={MentionIcon} size="sm" />,
                    isIconOnly: true,
                  }}
                  hasChevron={false}
                  menuWidth={240}>
                  {MENTION_ITEMS.map(item => (
                    <DropdownMenuItem
                      key={item.id}
                      label={item.label}
                      description={item.auxiliaryData?.role}
                      onClick={() => insertMention(item)}
                    />
                  ))}
                </DropdownMenu>
              }
              footerActions={
                <>
                  <DropdownMenu
                    button={{
                      label: activeMode.label,
                      variant: 'ghost',
                      size: 'md',
                      icon: <Icon icon={activeMode.icon} size="sm" />,
                      children: activeMode.label,
                    }}
                    menuWidth={200}
                    isMenuOpen={isModeMenuOpen}
                    onOpenChange={isOpen => {
                      setIsModeMenuOpen(isOpen);
                    }}
                    items={MODE_OPTIONS.map(opt => ({label: opt.label, icon: opt.icon, onClick: () => setMode(opt.key)}))}
                  />
                  </>
              }
              sendActions={<ChatDictationButton dictation={dictation} />}
            />

            {/* Category filters + suggestion cards */}
            <VStack gap={6} style={categories}>
              <ToggleButtonGroup
                label="Category"
                value={category}
                onChange={setCategory}
                size="lg">
                {CATEGORIES.map(cat => (
                  <ToggleButton
                    key={cat.key}
                    value={cat.key}
                    label={cat.label}
                    icon={<Icon icon={cat.icon} size="sm" />}
                  />
                ))}
              </ToggleButtonGroup>

              {suggestions && (
                <Grid columns={{minWidth: 280}} gap={3}>
                  {suggestions.map(suggestion => (
                    <ClickableCard
                      key={suggestion.heading}
                      label={suggestion.heading}
                      variant="muted"
                      padding={3}
                      onClick={() => {
                        if (suggestion.to) go(suggestion.to); else applySuggestion(suggestion.prompt);
                      }}>
                      <VStack gap={0.5}>
                        <Heading level={4}>{suggestion.heading}</Heading>
                        <Text type="body" color="secondary" size="xsm">
                          {suggestion.body}
                        </Text>
                      </VStack>
                    </ClickableCard>
                  ))}
                </Grid>
              )}
            </VStack>
          </VStack>
        </LayoutContent>
      }
    />
  );
}
