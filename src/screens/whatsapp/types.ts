/** A message in a conversation. `side: "me"` is the manager; `by` says who sent it. */
export interface Msg {
  readonly kind: "msg";
  readonly id: string;
  readonly side: "them" | "me";
  readonly name?: string;
  readonly time: string;
  readonly text: string;
  readonly photo?: string;
  readonly by?: string;
  readonly unsent?: boolean;
  readonly thread?: string;
}
/** One quiet line in the stream: "Handed to Support", "You told Support: ...". */
export interface Note {
  readonly kind: "note";
  readonly id: string;
  readonly text: string;
  readonly link?: { readonly label: string; readonly to: string };
}
export type Line = Msg | Note;
export type Mode = "tell" | "write";
