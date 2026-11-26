// astryx-template: detail-page
import { useRef, useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Layout";
import { pixel, proportional, Table, type TableColumn } from "@astryxdesign/core/Table";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { Reading, useApi, useClock, useRead, useRefresh } from "~/modules/page/service.ts";
import type { McpView, ShellView } from "~/modules/views-workspace/types.ts";
import { useDoing } from "../doing.ts";
import type { Dirty } from "../types.ts";
import { Add, Detail } from "./mcp-detail.tsx";
import type { Manager, Server, Setting } from "./mcp-types.ts";
import { useOpenRow } from "../rows.ts";

const asks = (s: Server): number => s.tools.filter((x) => x.is === "ask").length;
const nameOf = (managers: readonly Manager[], id: string): string => managers.find((m) => m.id === id)?.name ?? id;

/** How a server signs in, said: a key kept in Keys, a person's own account, or nothing. */
function signInSaid(s: Server, shell: ShellView | undefined): string {
  if (s.signIn === null) return "Nothing";
  if ("secret" in s.signIn) return `A key, kept in Keys as ${s.signIn.secret}`;
  const person = s.signIn.oauth;
  return `Signs in as ${shell?.people.find((p) => p.id === person)?.name ?? person}, with ${s.name}`;
}

function Servers({
  view,
  shell,
  zone,
  onDirty,
}: {
  readonly view: McpView;
  readonly shell: ShellView | undefined;
  readonly zone: string;
  readonly onDirty: Dirty;
}) {
  const [narrow, toast, clock, doing, api, refresh] = [
    useMediaQuery("(max-width: 1100px)"),
    useToast(),
    useClock(),
    useDoing(),
    useApi(),
    useRefresh(),
  ];
  const managers: readonly Manager[] = (shell?.tree ?? []).filter((m) => m.above !== null).map((m) => ({ id: m.id, name: m.name }));
  const [servers, setServers] = useState<readonly Server[]>(() => view.servers.map((s) => ({ ...s })));
  const [open, setOpen] = useState<string | null>(narrow ? null : (view.servers[0]?.id ?? null));
  const [adding, setAdding] = useState(false);
  const [who, setWho] = useState<Record<string, string[]>>(() => Object.fromEntries(view.servers.map((s) => [s.id, [...s.usedBy]])));
  const pending = useRef<Map<string, readonly [string, string, Setting]>>(new Map());
  const row = useOpenRow<Server>(adding ? null : open, (s) => {
    setAdding(false);
    setOpen(s.id);
  });
  const s = servers.find((x) => x.id === open);

  const saveAll = () => {
    const all = [...pending.current.values()];
    pending.current.clear();
    return Promise.all(all.map(([server, tool, is]) => doing("mcp.tool", { server, tool, is }, ["/settings/mcp-servers"])));
  };
  const set = (tool: string, v: Setting) => {
    if (s === undefined) return;
    setServers((all) => all.map((x) => (x.id === s.id ? { ...x, tools: x.tools.map((t) => (t.name === tool ? { ...t, is: v } : t)) } : x)));
    pending.current.set(`${s.id}/${tool}`, [s.id, tool, v]);
    onDirty(saveAll);
  };
  const add = async (address: string, secret: string | undefined) => {
    const made = await api.write("/settings/mcp-servers", { name: "", url: address, ...(secret === undefined ? {} : { secret }) });
    if (made._tag !== "Ok") return toast({ body: made.says, uniqueID: "added" });
    if ("_tag" in made.value) return toast({ body: made.value.why, uniqueID: "added" });
    const server: Server = { ...made.value.server, by: shell?.me.name ?? "", added: clock.now() };
    setServers((all) => [...all, server]);
    setWho((w) => ({ ...w, [server.id]: [] }));
    setAdding(false);
    setOpen(server.id);
    refresh(["/settings/mcp-servers"]);
    toast({ body: `${server.name}: ${server.tools.length} tools. The one that changes things asks first`, uniqueID: "added" });
  };
  const cols: TableColumn<Server>[] = [
    {
      key: "name",
      header: "Server",
      width: proportional(2, { minWidth: 150 }),
      renderCell: (x) => (
        <VStack gap={0}>
          <Text type="label" maxLines={1}>
            {x.name}
          </Text>
          <Text type="supporting" color="secondary" maxLines={1}>
            {x.usedBy.length > 0 ? `Used by ${x.usedBy.map((id) => nameOf(managers, id)).join(", ")}` : "Nobody yet"}
          </Text>
        </VStack>
      ),
    },
    {
      key: "tools",
      header: "Tools",
      width: pixel(100),
      align: "end",
      renderCell: (x) => (
        <Text hasTabularNumbers maxLines={1}>
          {x.tools.length}, {asks(x)} ask
        </Text>
      ),
    },
  ];
  const list = (
    <VStack gap={3}>
      <HStack gap={2} vAlign="center">
        <StackItem size="fill">
          <VStack gap={0.5}>
            <Heading level={3} accessibilityLevel={2}>
              MCP servers
            </Heading>
            <Text type="supporting" color="secondary">
              Tools added without code. Not a connector: nothing comes in through them.
            </Text>
          </VStack>
        </StackItem>
      </HStack>
      <HStack>
        <Button label="Add a server" variant="secondary" onClick={() => setAdding(true)} />
      </HStack>
      <Table<Server> data={[...servers]} columns={cols} idKey="id" density="compact" dividers="rows" plugins={{ row }} />
    </VStack>
  );
  const back = () => {
    setOpen(null);
    setAdding(false);
  };
  const checkedSaid = (x: Server): string =>
    x.state._tag === "Works" ? `Works. Checked at ${clock.time(x.state.at)}` : `Failed: ${x.state.why}`;
  const detail = adding ? (
    <Add onAdd={(a, k) => void add(a, k)} {...(narrow ? { onBack: back } : {})} />
  ) : s ? (
    <Detail
      s={s}
      managers={managers}
      zone={zone}
      narrow={narrow}
      signIn={signInSaid(s, shell)}
      checked={checkedSaid(s)}
      who={who[s.id] ?? []}
      onWho={(v) => {
        setWho((w) => ({ ...w, [s.id]: v }));
        onDirty(saveAll);
      }}
      onSet={set}
      onCheck={() => void doing("mcp.check", { server: s.id }, ["/settings/mcp-servers"])}
      onTakeAway={() => {
        setServers((all) => all.filter((x) => x.id !== s.id));
        setOpen(null);
        void doing("mcp.remove", { server: s.id }, ["/settings/mcp-servers"]);
      }}
      {...(narrow ? { onBack: back } : {})}
    />
  ) : null;
  if (narrow) return detail ?? list;
  return (
    <HStack gap={8} vAlign="start">
      <VStack width={360}>{list}</VStack>
      <StackItem size="fill">{detail}</StackItem>
    </HStack>
  );
}

/** Tools added without code: an address and a way to sign in, and what each tool starts at. */
export default function McpServers({ onDirty }: { readonly onDirty: Dirty }) {
  const shell = useRead("/shell");
  const zone = shell._tag === "Ok" ? shell.value.workspace.zone : "UTC";
  return (
    <Reading from="/settings/mcp-servers">
      {(view) => <Servers view={view} shell={shell._tag === "Ok" ? shell.value : undefined} zone={zone} onDirty={onDirty} />}
    </Reading>
  );
}
