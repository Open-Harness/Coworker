import type { ChatComposerToken } from "@astryxdesign/core/Chat";

/** A document in a prompt: `@Title` to the model, a chip to people. */
export const documentToken = (title: string): ChatComposerToken => ({
  value: `@${title}`,
  label: `@${title}`,
  variant: "blue",
});
