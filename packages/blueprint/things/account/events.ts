import { Blueprint } from "orthograph";
import { Account } from "./thing.ts";

export const AccountConnected = Blueprint.event({ account: Account.fields.id, connector: Account.fields.connector });
export const AccountOffline = Blueprint.event({ account: Account.fields.id });
export const AccountBack = Blueprint.event({ account: Account.fields.id });
export const AccountLent = Blueprint.event({ account: Account.fields.id, by: Account.fields.lentBy });
export const AccountGivenBack = Blueprint.event({ account: Account.fields.id });
export const AccountRemoved = Blueprint.event({ account: Account.fields.id });
