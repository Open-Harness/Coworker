// astryx-template: detail-page
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { CheckboxList, CheckboxListItem } from "@astryxdesign/core/CheckboxList";
import { Divider } from "@astryxdesign/core/Divider";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { MetadataList, MetadataListItem } from "@astryxdesign/core/MetadataList";
import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Selector } from "@astryxdesign/core/Selector";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Table, pixel, proportional, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { Token } from "@astryxdesign/core/Token";
import { useToast } from "@astryxdesign/core/Toast";
import { go } from "../../../shell";
import { SERVERS, SETTINGS, WHO, type Server, type Setting, type Tool } from "../parts/mcp";
import { useOpenRow } from "../parts/rows";

export const meta = { save: true };
const asks = (s: Server) => s.tools.filter((x) => x.setting === "ask").length;

function ToolTable({ s, onSet, narrow }: { s: Server; onSet: (tool: string, v: Setting) => void; narrow: boolean }) {
  const cols: TableColumn<Tool>[] = [
    { key: "name", header: "Tool", width: proportional(3, { minWidth: 150 }), renderCell: (x) => <VStack gap={0}><Text type="label" maxLines={1}>{x.name}</Text><Text type="supporting" color="secondary" maxLines={narrow ? 3 : 2}>{x.does}</Text></VStack> },
    ...(narrow ? [] : [{ key: "kind", header: "It", width: pixel(96), renderCell: (x: Tool) => <Token size="sm" label={x.reads ? "Reads" : "Changes"} /> }]),
    { key: "set", header: "Starts", width: pixel(narrow ? 150 : 170), renderCell: (x) => (
      <SegmentedControl label={`${x.name} starts`} size="sm" value={x.setting} onChange={(v) => onSet(x.id, v as Setting)}>
        {SETTINGS.map((o) => <SegmentedControlItem key={o.value} value={o.value} label={o.label} />)}
      </SegmentedControl>) },
  ];
  return <Table<Tool> data={[...s.tools]} columns={cols} idKey="id" density="compact" dividers="rows" verticalAlign="top" />;
}

function Detail({ s, onSet, onWho, who, onBack, narrow }: { s: Server; onSet: (tool: string, v: Setting) => void; who: string[]; onWho: (v: string[]) => void; onBack?: () => void; narrow: boolean }) {
  const toast = useToast();
  return (
    <VStack gap={4}>
      {onBack ? <HStack><Button label="All servers" variant="ghost" size="sm" onClick={onBack} /></HStack> : null}
      <HStack gap={3} vAlign="center" wrap="wrap">
        <StackItem size="fill"><VStack gap={0.5}><Heading level={3} accessibilityLevel={3}>{s.name}</Heading><HStack gap={1.5} vAlign="center"><StatusDot variant="neutral" label="Works" /><Text type="supporting" color="secondary">Works. Checked at {s.checked}</Text></HStack></VStack></StackItem>
        <Button label="Check it" variant="secondary" size="sm" onClick={() => toast({ body: `${s.name} works, ${s.tools.length} tools`, uniqueID: s.id })} />
        <Button label="Take it away" variant="ghost" size="sm" onClick={() => go("soon-Take away an MCP server")} />
      </HStack>
      <MetadataList columns={narrow ? 1 : 2}>
        <MetadataListItem label="Address">{s.address}</MetadataListItem>
        <MetadataListItem label="Signs in">{s.signIn}</MetadataListItem>
        <MetadataListItem label="Added by">{s.by}, {s.added}</MetadataListItem>
        <MetadataListItem label="Tools">{s.tools.length}, {asks(s)} ask first</MetadataListItem>
      </MetadataList>
      <Divider />
      <VStack gap={1}><Heading level={4} accessibilityLevel={4}>Tools</Heading><Text type="supporting" color="secondary">A tool that only reads starts on. The others start at ask: a person says yes each time. Off, and no manager sees it.</Text></VStack>
      <ToolTable s={s} onSet={onSet} narrow={narrow} />
      <Divider />
      <VStack gap={2}>
        <VStack gap={0.5}><Heading level={4} accessibilityLevel={4}>Which managers have it</Heading><Text type="supporting" color="secondary">A manager has the tools above that are on or ask. What a piece of work may use is its mandate, and it never grows.</Text></VStack>
        <CheckboxList label="Managers" isLabelHidden value={who} onChange={(v: string[]) => onWho(v)}>
          {WHO.map((m) => <CheckboxListItem key={m} value={m} label={m} />)}
        </CheckboxList>
      </VStack>
    </VStack>
  );
}

/** A server is an address and a way to sign in. This one asks for both, and then looks at what it offers. */
function Add({ onAdd, onBack }: { onAdd: (name: string, address: string) => void; onBack?: () => void }) {
  const [address, setAddress] = useState("");
  const [how, setHow] = useState("key");
  const [key, setKey] = useState("");
  return (
    <VStack gap={4}>
      {onBack ? <HStack><Button label="All servers" variant="ghost" size="sm" onClick={onBack} /></HStack> : null}
      <VStack gap={0.5}><Heading level={3} accessibilityLevel={3}>Add a server</Heading><Text type="supporting" color="secondary">Tools without code: an address and a way to sign in. Nothing comes in through it, and it has no board of its own.</Text></VStack>
      <TextInput label="Address" placeholder="https://mcp.linear.example/mcp" value={address} onChange={setAddress} />
      <Selector label="Signs in with" value={how} onChange={setHow} options={[{ value: "key", label: "A key" }, { value: "account", label: "An account, in your browser" }, { value: "none", label: "Nothing" }]} />
      {how === "key" ? <TextInput label="Name of the key in Keys" description="Co-worker opens it only for one call. It is never shown." placeholder="linear-key" value={key} onChange={setKey} /> : null}
      <HStack gap={2}><Button label="Add and look at its tools" variant="primary" isDisabled={address.trim() === ""} onClick={() => onAdd((new URL(address.trim().startsWith("http") ? address.trim() : `https://${address.trim()}`).hostname.split(".").find((p) => p !== "mcp" && p !== "www") ?? "Server").replace(/^./, (c) => c.toUpperCase()), address.trim())} /></HStack>
    </VStack>
  );
}

export default function McpServers({ onDirty }: { onDirty: () => void }) {
  const narrow = useMediaQuery("(max-width: 1100px)");
  const toast = useToast();
  const [servers, setServers] = useState<readonly Server[]>(SERVERS);
  const [open, setOpen] = useState<string | null>(narrow ? null : "sentry");
  const [adding, setAdding] = useState(false);
  const [who, setWho] = useState<Record<string, string[]>>(() => Object.fromEntries(SERVERS.map((s) => [s.id, [...s.usedBy]])));
  const row = useOpenRow<Server>(adding ? null : open, (s) => { setAdding(false); setOpen(s.id); });
  const s = servers.find((x) => x.id === open);

  const set = (tool: string, v: Setting) => { setServers((all) => all.map((x) => x.id === open ? { ...x, tools: x.tools.map((t) => t.id === tool ? { ...t, setting: v, chosen: true as const } : t) } : x)); onDirty(); };
  const add = (name: string, address: string) => {
    const made: Server = { id: name.toLowerCase(), name, address, signIn: "A key, kept in Keys", by: "Ama Mensah", added: "25 Nov", checked: "09:54", usedBy: [], tools: [
      { id: "list_issues", name: "list_issues", does: "Issues, with who has them", reads: true, setting: "on" }, { id: "get_issue", name: "get_issue", does: "One issue, with its comments", reads: true, setting: "on" },
      { id: "create_issue", name: "create_issue", does: "Make a new issue", reads: false, setting: "ask" }] };
    setServers((all) => [...all, made]); setWho((w) => ({ ...w, [made.id]: [] })); setAdding(false); setOpen(made.id); onDirty();
    toast({ body: `${name}: 3 tools. The one that changes things asks first`, uniqueID: "added" });
  };
  const cols: TableColumn<Server>[] = [
    { key: "name", header: "Server", width: proportional(2, { minWidth: 150 }), renderCell: (x) => <VStack gap={0}><Text type="label" maxLines={1}>{x.name}</Text><Text type="supporting" color="secondary" maxLines={1}>{x.usedBy.length > 0 ? `Used by ${x.usedBy.join(", ")}` : "Nobody yet"}</Text></VStack> },
    { key: "tools", header: "Tools", width: pixel(100), align: "end", renderCell: (x) => <Text hasTabularNumbers maxLines={1}>{x.tools.length}, {asks(x)} ask</Text> },
  ];
  const list = (
    <VStack gap={3}>
      <HStack gap={2} vAlign="center"><StackItem size="fill"><VStack gap={0.5}><Heading level={3} accessibilityLevel={2}>MCP servers</Heading><Text type="supporting" color="secondary">Tools added without code. Not a connector: nothing comes in through them.</Text></VStack></StackItem></HStack>
      <HStack><Button label="Add a server" variant="secondary" onClick={() => setAdding(true)} /></HStack>
      <Table<Server> data={[...servers]} columns={cols} idKey="id" density="compact" dividers="rows" plugins={{ row }} />
    </VStack>
  );
  const back = () => { setOpen(null); setAdding(false); };
  const detail = adding ? <Add onAdd={add} {...(narrow ? { onBack: back } : {})} />
    : s ? <Detail s={s} onSet={set} who={who[s.id] ?? []} onWho={(v) => { setWho((w) => ({ ...w, [s.id]: v })); onDirty(); }} narrow={narrow} {...(narrow ? { onBack: back } : {})} /> : null;
  if (narrow) return detail ?? list;
  return <HStack gap={8} vAlign="start"><VStack width={360}>{list}</VStack><StackItem size="fill">{detail}</StackItem></HStack>;
}
