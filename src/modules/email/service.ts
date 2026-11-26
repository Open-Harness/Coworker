import type { Email } from "./types.ts";
import { emailChannel } from "./internal/channel.ts";
import { receiveMail } from "./internal/receive.ts";

export const email: Email = {
  source: (dependencies) => ({ receive: (mail) => receiveMail(dependencies, mail) }),
  channel: emailChannel,
};
