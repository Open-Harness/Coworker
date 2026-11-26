import { Avatar } from "@astryxdesign/core/Avatar";
import { AvatarGroup, AvatarGroupOverflow } from "@astryxdesign/core/AvatarGroup";
import { Text } from "@astryxdesign/core/Text";
import type { Person } from "~/modules/protocol/types.ts";
import type { PeopleHereProps } from "../types.ts";

const SHOWN = 4;

function People({ people, size }: { readonly people: readonly Person[]; readonly size: "xsm" | "sm" }) {
  if (people.length === 0) return null;
  return (
    <AvatarGroup size={size}>
      {people.slice(0, SHOWN).map(({ id, name, avatarUrl }) => (
        <Avatar key={id} name={name} {...(avatarUrl === undefined ? {} : { src: avatarUrl })} />
      ))}
      {people.length > SHOWN && <AvatarGroupOverflow count={people.length - SHOWN} />}
    </AvatarGroup>
  );
}

/** The other people who have the app open. */
export function PeopleOnline({ people }: { readonly people: readonly Person[] }) {
  return <People people={people} size="xsm" />;
}

/** Everyone looking at a chat. */
export function PeopleHere({ presence, chatId }: PeopleHereProps) {
  return <People people={presence.filter((seen) => seen.chatId === chatId).map(({ person }) => person)} size="sm" />;
}

function typingText(names: readonly string[]): string {
  if (names.length === 1) return `${names[0]} is typing…`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`;
  return `${names.length} people are typing…`;
}

/** Who else is writing in a chat, as one line. Nothing when nobody is. */
export function typingNote({ presence, chatId }: PeopleHereProps, me: Person) {
  const names = presence
    .filter((seen) => seen.chatId === chatId && seen.typing && seen.person.id !== me.id)
    .map(({ person }) => person.name);
  return names.length === 0 ? undefined : (
    <Text type="supporting" color="secondary">
      {typingText(names)}
    </Text>
  );
}
