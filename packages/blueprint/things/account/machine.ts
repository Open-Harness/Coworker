import { Blueprint } from "orthograph";
import { Account } from "./thing.ts";
import * as Events from "./events.ts";

// Connected or offline, as its last check found; removed for good. A lent account starts lent and ends given back.
// `check` chooses the outcome; `offline` is the loop's, when a call finds it broken (delta D5).
export const machine = Blueprint.machine(Account, {
  states: ["connected", "offline", "lent", "givenBack", "removed"],
  moves: {
    connect: { from: [], to: "connected", emits: Events.AccountConnected },
    lend: { from: [], to: "lent", emits: Events.AccountLent },
    offline: { from: ["connected", "lent"], to: "offline", emits: Events.AccountOffline },
    check: { from: ["connected", "offline", "lent"], to: ["connected", "offline", "lent"], emits: Events.AccountBack },
    giveBack: { from: ["lent", "offline"], to: "givenBack", emits: Events.AccountGivenBack },
    remove: { from: ["connected", "offline"], to: "removed", emits: Events.AccountRemoved },
  },
  notFrom: { exit: 85 },
});
