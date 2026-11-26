const IPV4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u;

/** [network, prefix length] of every IPv4 range that is not the public internet. 100.64/10 is the tailnet. */
const NON_PUBLIC_V4: readonly (readonly [string, number])[] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 3],
];

function v4Number(address: string): number | undefined {
  const match = IPV4.exec(address);
  if (match === null) return undefined;
  const octets = match.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return undefined;
  return octets.reduce((value, octet) => value * 256 + octet, 0);
}

const inRange = (address: number, network: string, length: number): boolean => {
  const size = 2 ** (32 - length);
  return Math.floor(address / size) === Math.floor(v4Number(network)! / size);
};

/** The eight groups of an IPv6 address, or undefined when it is not one. */
function v6Groups(address: string): readonly number[] | undefined {
  if (!URL.canParse(`http://[${address}]/`)) return undefined;
  const canonical = new URL(`http://[${address}]/`).hostname.slice(1, -1);
  const [head = "", tail] = canonical.split("::");
  const left = head === "" ? [] : head.split(":");
  const right = tail === undefined || tail === "" ? [] : tail.split(":");
  const zeros = tail === undefined ? [] : Array.from({ length: 8 - left.length - right.length }, () => "0");
  return [...left, ...zeros, ...right].map((group) => Number.parseInt(group, 16));
}

/** Only 2000::/3 is public IPv6; inside it, ranges that embed or tunnel IPv4 and documentation are refused too. */
function isPublicV6(groups: readonly number[]): boolean {
  const [first = 0, second = 0] = groups;
  if (first < 0x2000 || first > 0x3fff) return false;
  if (first === 0x2002) return false; // 6to4
  if (first === 0x2001 && second < 0x0200) return false; // Teredo and special-purpose
  if (first === 0x2001 && second === 0x0db8) return false; // documentation
  return first !== 0x3fff;
}

export const isAddress = (host: string): boolean => v4Number(host) !== undefined || host.includes(":");

/** Whether an IP address belongs to the public internet. Anything unreadable does not. */
export function isPublicAddress(address: string): boolean {
  const v4 = v4Number(address);
  if (v4 !== undefined) return !NON_PUBLIC_V4.some(([network, length]) => inRange(v4, network, length));
  const groups = v6Groups(address);
  return groups !== undefined && groups.length === 8 && isPublicV6(groups);
}
