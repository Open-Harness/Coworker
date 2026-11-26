import { lazy, Suspense, useEffect, useState, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { Theme } from "@astryxdesign/core/theme";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Center } from "@astryxdesign/core/Center";
import "./styles.css";
import { ManagerFrame, Shell, TABS } from "./shell";
import { manager, MANAGERS } from "./world";
import { InOut } from "./screens/inout";
const found = import.meta.glob<{ default: ComponentType }>("./screens/*/index.tsx");
const made = new Map(Object.entries(found).map(([path, load]) => [path, lazy(load)]));
const screen = (n: string) => made.get(`./screens/${n}/index.tsx`);
const Soon = ({ what }: { what: string }) => <Center axis="both" height="100%"><EmptyState title={what} description="Not drawn yet." /></Center>;
function Screen({ name }: { name: string }) { const C = screen(name); return C ? <Suspense><C /></Suspense> : <Soon what={name} />; }
function App() {
  const [hash, set] = useState(location.hash.slice(1) || "setup");
  useEffect(() => { const on = () => set(decodeURIComponent(location.hash.slice(1)) || "setup"); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  if (["signin", "signup", "join", "start"].includes(hash)) return <Screen name={hash} />;
  if (hash === "task") return <Shell at="coding" place="ACME-412"><Screen name="task" /></Shell>;
  if (hash === "thread") return <Shell at="coding"><Screen name="thread" /></Shell>;
  if (hash === "new" || hash.startsWith("new-")) return <Shell at="root" place="New manager"><Screen name="new" /></Shell>;
  if (hash.startsWith("state-")) return <Screen name="states" />;
  if (hash === "m-sales-playbook-compare") return <Shell at="sales" place="Sales"><ManagerFrame id="sales" tab="Playbook"><Screen name="compare" /></ManagerFrame></Shell>;
  if (hash === "m-coding-settings") return <Shell at="coding" place="Coding"><ManagerFrame id="coding" tab="Settings"><Screen name="manager-settings" /></ManagerFrame></Shell>;
  if (hash === "root") return <Shell at="root" place="Managers"><Screen name="tree" /></Shell>;
  if (hash === "setup" || hash.startsWith("setup-")) return <Shell at="setup" place="this chat"><Screen name="setup" /></Shell>;
  if (hash === "draft" || hash.startsWith("draft-")) return <Shell at="setup" place="the draft"><Screen name="playbook" /></Shell>;
  const s = /^m-sales-(intake|search|playbook)(?:-[\w-]+)?$/.exec(hash);
  if (s) return <Shell at="sales" place="Sales">{s[1] === "search" ? <Screen name="search" /> : <ManagerFrame id="sales" tab={s[1] === "playbook" ? "Playbook" : "Intake"}><Screen name={s[1]!} /></ManagerFrame>}</Shell>;
  const io = /^m-(\w+)-connectors(?:-(\w+))?$/.exec(hash);
  if (io) return <Shell at={io[1]!} place={manager(io[1]!).name}><ManagerFrame id={io[1]!} tab="Connectors"><InOut id={io[1]!} which={io[2]} /></ManagerFrame></Shell>;
  const m = /^m-(\w+)-([\w-]+)$/.exec(hash);
  if (m) {
    const id = MANAGERS.some((x) => x.id === m[1]) ? m[1]! : "coding"; const tab = TABS.find((t) => t.toLowerCase().replaceAll(" ", "-") === m[2]) ?? "Overview";
    const C = id === "sales" && tab === "Overview" ? "overview" : id === "coding" ? (tab === "Overview" ? "overview" : tab === "Board" ? "board" : tab === "Threads" ? "threads" : undefined) : id === "sales" && tab === "Board" ? "sales-board" : undefined;
    return <Shell at={id} place={manager(id).name}><ManagerFrame id={id} tab={tab}>{C ? <Screen name={C} /> : <Soon what={tab} />}</ManagerFrame></Shell>;
  }
  if (hash === "home" || hash === "palette") return <Shell at="home" place="Home"><Screen name="home" /></Shell>;
  if (hash === "inbox") return <Shell at="Inbox" place="Inbox"><Screen name="inbox" /></Shell>;
  if (hash === "chats") return <Shell at="chats" place="All chats"><Screen name="chats" /></Shell>;
  if (hash.startsWith("chat-support")) return <Shell at={hash} place="this chat"><Screen name="chat" /></Shell>;
  if (hash.startsWith("juno-")) return <Shell at="juno" place="About Juno"><Screen name="juno" /></Shell>;
  if (hash.startsWith("live")) return <Screen name="live" />;
  if (hash.startsWith("set-")) return <Shell at="Settings"><Screen name="settings" /></Shell>;
  if (hash.startsWith("soon-")) return <Shell at={hash.slice(5)}><Soon what={hash.slice(5)} /></Shell>;
  return <Shell at="system" place="Overview"><Screen name="system" /></Shell>;
}
const asked = new URLSearchParams(location.search).get("mode");
const pageMode = () => asked ?? document.documentElement.dataset["theme"] ?? "system";
/** Follows the light or dark choice of the page it is published in. */
function Root() {
  const [mode, setMode] = useState(pageMode);
  useEffect(() => { const o = new MutationObserver(() => setMode(pageMode())); o.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] }); return () => o.disconnect(); }, []);
  return <Theme theme={neutralTheme} mode={mode as "light"}><App /></Theme>;
}
createRoot(document.getElementById("root")!).render(<Root />);
