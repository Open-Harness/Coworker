import { structOf } from "#modules/things/service.js";
import type { EventNaming, EventsApi } from "./types.ts";

// Events are frozen, so their names are kept beside them.
const names = new WeakMap<object, string>();

export const Events: EventsApi = {
  event: (fields) => Object.freeze({ kind: "event", fields, schema: structOf(fields) }),
};

export const EventNames: EventNaming = {
  name: (event, name) => void names.set(event, name),
  nameOf: (event) => names.get(event),
};
