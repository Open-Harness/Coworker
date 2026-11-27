import { Blueprint } from "orthograph";
import { Comment } from "./thing.ts";

export const Commented = Blueprint.event({ comment: Comment.fields.id, line: Comment.fields.line });
export const ChangeOffered = Blueprint.event({ comment: Comment.fields.id });
export const CommentAnswered = Blueprint.event({ comment: Comment.fields.id });
export const CommentBecameCase = Blueprint.event({ comment: Comment.fields.id });
export const ChangeTaken = Blueprint.event({ comment: Comment.fields.id });
export const ChangeLeft = Blueprint.event({ comment: Comment.fields.id });
