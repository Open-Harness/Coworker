import { Blueprint } from "orthograph";
import { Item } from "./thing.ts";
import { Should } from "../../values/coworker.ts";

export const ItemCame = Blueprint.event({ item: Item.fields.id, manager: Item.fields.manager });
export const ItemDecided = Blueprint.event({ item: Item.fields.id, said: Item.fields.said });
export const ItemApproved = Blueprint.event({ item: Item.fields.id });
export const ItemCorrected = Blueprint.event({ item: Item.fields.id, should: Should });
