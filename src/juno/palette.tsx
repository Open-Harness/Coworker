// astryx-template: command-palette
/* One palette for everything: ask, go, do, find, and be shown. It reads the same list of doings as the buttons and the co-worker. */
import { useMemo } from "react";
import { CommandPalette, CommandPaletteFooter, CommandPaletteInput } from "@astryxdesign/core/CommandPalette";
import { Icon } from "@astryxdesign/core/Icon";
import { Kbd } from "@astryxdesign/core/Kbd";
import { HStack, StackItem } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BoltIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useApi } from "~/modules/page/service.ts";
import type { ShellView } from "~/modules/views-workspace/types.ts";
import { ask, doingsOf, firstOf, foundOf, knownOf, matching, narrowed, pagesOf, showingOf, type Item, type Kind } from "./palette-items.ts";

const ICON = {
  ask: SparklesIcon,
  go: ArrowRightIcon,
  do: BoltIcon,
  show: AcademicCapIcon,
  work: MagnifyingGlassIcon,
  chat: ChatBubbleLeftRightIcon,
  person: UserIcon,
  trigger: ClockIcon,
} as const satisfies Record<Kind, unknown>;

function Row({ item }: { readonly item: Item }) {
  const aux = item.auxiliaryData;
  if (aux === undefined) return null;
  return (
    <HStack gap={3} vAlign="center" width="100%">
      <Icon icon={ICON[aux.kind]} size="sm" color="secondary" />
      <StackItem size="fill">
        <Text maxLines={1}>{item.label}</Text>
      </StackItem>
      {aux.note === "" ? null : (
        <Text type="supporting" color="secondary" maxLines={1}>
          {aux.note}
        </Text>
      )}
      {aux.keys === undefined ? null : <Kbd keys={aux.keys} />}
    </HStack>
  );
}

interface Props {
  readonly isOpen: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** What the page you are on is called: the co-worker sees it. */
  readonly place: string;
  readonly shell: ShellView;
  /** Where the page is, under the workspace: what can be shown there comes first. */
  readonly path: string;
  readonly onGo: (to: string) => void;
  /** The co-worker is asked to show how to do this. */
  readonly onShow: (doing: string) => void;
}

/** Asking to be shown is a command: what can be shown leads, ahead of asking about the page. */
const isShowing = (query: string): boolean => /^show me how\b/iu.test(query);

export function Palette({ isOpen, onOpenChange, place, shell, path, onGo, onShow }: Props) {
  const api = useApi();
  const source = useMemo(() => {
    const known = new Map<string, Item>();
    const keep = (all: readonly Item[]): Item[] => {
      for (const one of all) known.set(one.id, one);
      return [...all];
    };
    const [name, pages, doings, showing] = [shell.coworker.name, pagesOf(shell), doingsOf(shell), showingOf(shell, path)];
    return {
      known,
      bootstrap: () => keep([ask(`Ask ${name} about ${place}`, "It sees the page you are on"), ...firstOf(shell, path)]),
      search: async (raw: string, context?: { readonly update: (items: Item[]) => void }) => {
        const query = raw.trim();
        const here = [...doings, ...showing];
        const mark = narrowed(shell, [], query[0] ?? "", path);
        // What the shell holds shows at once; what the server finds is added after it.
        const own =
          mark !== undefined
            ? matching(mark, query.slice(1))
            : [
                ...(isShowing(query) ? matching(showing, query).slice(0, 5) : []),
                ask(`Ask ${name}: “${query}”`, `It sees the page you are on: ${place}`),
                ...matching(here, query).slice(0, 5),
                ...matching(pages, query).slice(0, 4),
                ...matching(knownOf(shell), query).slice(0, 6),
              ];
        context?.update(keep(own.filter((one, at, all) => all.findIndex((other) => other.id === one.id) === at)));
        const answer = await api.read("/search?words", { words: query.slice(mark === undefined ? 0 : 1) });
        const found = answer._tag === "Ok" ? foundOf(answer.value) : [];
        if (mark !== undefined) return keep(matching(narrowed(shell, found, query[0] ?? "", path) ?? [], query.slice(1)));
        return keep(
          [...own, ...matching(found, query).slice(0, 6)].filter((one, at, all) => all.findIndex((other) => other.id === one.id) === at),
        );
      },
    };
  }, [shell, place, path, api]);
  return (
    <CommandPalette
      label="Ask, go, do or find"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      searchSource={source}
      width={680}
      maxHeight={560}
      input={<CommandPaletteInput placeholder={`Ask ${shell.coworker.name}, go somewhere, do something, find anything`} />}
      renderItem={(item) => <Row item={item as Item} />}
      footer={
        <CommandPaletteFooter>
          <HStack gap={4} vAlign="center" wrap="wrap">
            {(
              [
                [">", "do"],
                ["?", "show me how"],
                ["#", "work"],
                ["@", "people"],
              ] as const
            ).map(([key, text]) => (
              <HStack key={key} gap={1} vAlign="center">
                <Kbd keys={key} />
                <Text type="supporting" color="secondary">
                  {text}
                </Text>
              </HStack>
            ))}
          </HStack>
        </CommandPaletteFooter>
      }
      onValueChange={(id) => {
        onOpenChange(false);
        const picked = source.known.get(id)?.auxiliaryData;
        if (picked?.kind === "show") onShow(id.slice("show:".length));
        else if (picked !== undefined) onGo(picked.to);
      }}
    />
  );
}
