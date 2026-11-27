import { Blueprint } from "orthograph";

// Secret values, encrypted with the vault module's master key and referred to by name. Never in a view or an answer.
// Orthograph has no vault kind; `kind` keeps it open, and the compiler refuses it until a host supplies one.
export default Blueprint.store.kind("vault");
