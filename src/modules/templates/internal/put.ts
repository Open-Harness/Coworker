import { Scalar, visit, type Document } from "yaml";
import type { Files } from "~/modules/playbook/types.ts";
import type { Blank } from "../types.ts";
import { byId, isNumber, modelOf, putText, wholeBlank, type Values } from "./blank.ts";
import { editFiles, type Edits } from "./edit.ts";

/* The blanks of a template's files, put in. An answer goes in as one text, or as a number or a model where the blank is one. */

type Put = { readonly blanks: ReadonlyMap<string, Blank>; readonly values: Values };

/** What replaces a node that is only a blank: a number or the map of a model, else nothing (it is text). */
function whole(put: Put, doc: Document, id: string): Scalar | ReturnType<Document["createNode"]> | null {
  const blank = put.blanks.get(id);
  const value = put.values[id];
  if (blank === undefined || value === undefined) return null;
  if (blank.is.a === "number" && isNumber(value)) return new Scalar(Number(value));
  const model = blank.is.a === "model" ? modelOf(value) : null;
  if (model === null) return null;
  const node = doc.createNode(model);
  if ("flow" in node) node.flow = true;
  return node;
}

function putIntoDocument(put: Put, doc: Document): boolean {
  let changed = false;
  visit(doc, {
    Scalar(key, node) {
      if (typeof node.value !== "string" || !node.value.includes("{{")) return undefined;
      const id = key === "key" ? null : wholeBlank(node.value);
      const swapped = id === null ? null : whole(put, doc, id);
      changed = true;
      if (swapped !== null) return swapped;
      node.value = putText(node.value, put.values);
      return undefined;
    },
  });
  return changed;
}

export function putValues(files: Files, blanks: readonly Blank[], values: Values): Files {
  const put: Put = { blanks: byId(blanks), values };
  const edits: Edits = { doc: (doc) => putIntoDocument(put, doc), text: (text) => putText(text, values) };
  return editFiles(files, edits, (_, text) => text.includes("{{"));
}
