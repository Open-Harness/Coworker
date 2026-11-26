export const STEPS: readonly { readonly label: string; readonly isOptional?: boolean }[] = [{ label: "Workspace" }, { label: "Model" }, { label: "Connector", isOptional: true }, { label: "Review" }];
export const REGIONS = [{ value: "eu", label: "European Union" }, { value: "us", label: "United States" }];
export const MODELS = [
  { id: "chatgpt", label: "ChatGPT", price: "Your plan", about: "Sign in with the ChatGPT plan you already pay for." },
  { id: "key", label: "A key", price: "You pay the provider", about: "Anthropic, OpenAI or Google. We never add to their price." },
  { id: "own", label: "Your own", price: "You run it", about: "Any address that speaks like OpenAI." },
] as const;
export const CONNECTORS = [
  { id: "github", label: "GitHub", about: "Issues and pull requests come in, pull requests and reviews go out.", next: "Juno makes a manager for the repos you pick." },
  { id: "email", label: "Email", about: "Its own address, ready now. Mail comes in, answers go out.", next: "Juno makes a manager that answers it." },
  { id: "whatsapp", label: "WhatsApp", about: "A number of its own. You scan a code to connect it.", next: "Juno makes a manager for the number." },
] as const;
export interface Answers {
  readonly name: string; readonly slug: string; readonly region: string; readonly join: string;
  readonly model: string; readonly key: string; readonly limit: number;
  readonly connector: string; readonly repos: readonly string[]; readonly tellMe: boolean;
}
export const START: Answers = { name: "", slug: "", region: "eu", join: "domain", model: "chatgpt", key: "", limit: 20, connector: "github", repos: ["acme/web"], tellMe: true };
export function problems(a: Answers): readonly Readonly<Record<string, string>>[] {
  const workspace: Record<string, string> = {}, model: Record<string, string> = {}, connector: Record<string, string> = {};
  if (a.name.trim() === "") workspace["name"] = "Enter a name for the workspace.";
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/u.test(a.slug)) workspace["slug"] = "Use lowercase letters, numbers and hyphens.";
  if (a.model !== "chatgpt" && a.key.trim() === "") model["key"] = a.model === "key" ? "Paste the key. It is tested before you go on." : "Enter the address.";
  if (a.limit < 1) model["limit"] = "It needs at least a dollar to do anything.";
  if (a.connector === "github" && a.repos.length === 0) connector["repos"] = "Pick at least one repo, or skip this.";
  return [workspace, model, connector, {}];
}
