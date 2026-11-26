/** `launch.acme+dt-14@co-worker.tech` → the manager `launch` of the workspace `acme`, the task `DT-14`. */
export interface Addressed {
  readonly workspace: string;
  readonly slug: string;
  readonly task?: string;
}

/** The last dot before the Task ends the manager's slug: a workspace's address has no dots, a slug may. */
const ADDRESS = /^([a-z0-9][a-z0-9._-]*)\.([a-z0-9-]+)(?:\+dt-(\d+))?@([^@\s]+)$/iu;

export function parseAddress(address: string, mailDomain: string): Addressed | undefined {
  const match = ADDRESS.exec(address.trim());
  if (match === null || match[4]?.toLowerCase() !== mailDomain.toLowerCase()) return undefined;
  const [, slug = "", workspace = "", task] = match;
  return { workspace: workspace.toLowerCase(), slug: slug.toLowerCase(), ...(task === undefined ? {} : { task: `DT-${task}` }) };
}

/** Where replies about a Task should come back: the manager's address with the Task in it. */
export function taskAddress(managerAddress: string, task: string): string {
  const at = managerAddress.lastIndexOf("@");
  return `${managerAddress.slice(0, at)}+${task.toLowerCase()}${managerAddress.slice(at)}`;
}

export const domainOf = (address: string): string => address.slice(address.lastIndexOf("@") + 1).toLowerCase();
