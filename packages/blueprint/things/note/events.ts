import { Blueprint } from "orthograph";
import { Note } from "./thing.ts";

export const NoteProposed = Blueprint.event({ note: Note.fields.id, tell: Note.fields.tell });
export const NoteKept = Blueprint.event({ note: Note.fields.id });
export const NoteLeft = Blueprint.event({ note: Note.fields.id });
export const NoteForgotten = Blueprint.event({ note: Note.fields.id });
