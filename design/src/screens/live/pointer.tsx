/* What makes Juno visible on the screen: a ring around what it is at, its cursor, and what it says. The only piece here that is ours. */
import { useEffect, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Card } from "@astryxdesign/core/Card";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, StackItem, VStack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { CursorArrowRaysIcon } from "@heroicons/react/24/solid";
import { JUNO } from "../../juno/world";

interface Box { x: number; y: number; w: number; h: number; W: number; H: number }
/** Where the named place is in the pane, followed while the page moves under it. */
function useBox(pane: RefObject<HTMLElement | null>, at: string): Box | null {
  const [box, setBox] = useState<Box | null>(null);
  useEffect(() => {
    let seen = "";
    const look = () => {
      const p = pane.current; const el = p?.querySelector<HTMLElement>(`[data-spot="${at}"]`);
      if (!p || !el) { if (seen !== "") { seen = ""; setBox(null); } return; }
      if (seen === "") el.scrollIntoView({ block: "nearest" });
      const a = p.getBoundingClientRect(); const b = el.getBoundingClientRect();
      const now = { x: b.left - a.left, y: b.top - a.top, w: b.width, h: b.height, W: a.width, H: a.height };
      const key = Object.values(now).map(Math.round).join(); if (key !== seen) { seen = key; setBox(now); }
    };
    look(); const t = setInterval(look, 60); return () => clearInterval(t);
  }, [pane, at]);
  return box;
}

const MOVE = "left .35s ease, top .35s ease, width .35s ease, height .35s ease";
const STILL = "none";
const PAD = 6; const WIDE = 320; const ROOM = 150;
const layer: CSSProperties = { position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 5 };

export function Pointer({ pane, at, say, count, isQuiet, isAbove, children }: { pane: RefObject<HTMLElement | null>; at: string; say: string; count: string; isQuiet?: boolean; isAbove?: boolean; children?: ReactNode }) {
  const b = useBox(pane, at);
  const MOVE_ = useMediaQuery("(prefers-reduced-motion: reduce)") ? STILL : MOVE;
  if (!b) return null;
  const isBelow = isAbove ? b.y < ROOM : b.y + b.h + ROOM < b.H || b.y < ROOM;
  const ring: CSSProperties = { position: "absolute", left: b.x - PAD, top: b.y - PAD, width: b.w + 2 * PAD, height: b.h + 2 * PAD, border: "2px solid var(--color-data-categorical-blue)", borderRadius: "var(--radius-container)", boxSizing: "border-box", transition: MOVE_ };
  const cursor: CSSProperties = { position: "absolute", left: b.x + Math.min(b.w * 0.6, b.w - 12), top: b.y + b.h / 2, color: "var(--color-data-categorical-blue)", transition: MOVE_ };
  const wide = Math.min(WIDE, b.W - 24);
  const left = Math.max(12, Math.min(b.x - PAD, b.W - wide - 12));
  const bubble: CSSProperties = { position: "absolute", left, width: wide, pointerEvents: "auto", transition: MOVE_, boxShadow: "var(--shadow-high)", borderRadius: "var(--radius-container)", ...(isBelow ? { top: b.y + b.h + PAD + 10 } : { bottom: b.H - b.y + PAD + 10 }) };
  return (
    <div style={layer}>
      <div style={ring} />
      {!isQuiet && <div style={cursor}><Icon icon={CursorArrowRaysIcon} size="md" color="inherit" /></div>}
      <div style={bubble} role="status">
        <Card padding={3}>
          <HStack gap={2} vAlign="start">
            <Avatar name={JUNO.name} size={24} tooltip={false} />
            <StackItem size="fill"><VStack gap={2}><Text type="body">{say}</Text>{children}{count && <Text type="supporting" color="secondary">{count}</Text>}</VStack></StackItem>
          </HStack>
        </Card>
      </div>
    </div>
  );
}
