import { Blueprint } from "orthograph";
import { Key } from "../thing.ts";
import { owner } from "../../workspace/roles.ts";

// `GET /settings/keys`.secrets. A list answers every field, so `value` relies on its secret mark to stay out: DX log.
export default Blueprint.read(Key, { where: ["workspace", "of"], order: "oldest", page: 100, allowed: [owner.of("workspace")] });
