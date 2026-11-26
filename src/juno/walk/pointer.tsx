// astryx-template: ai-chat
import { useEffect, useState } from "react";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { Icon } from "@astryxdesign/core/Icon";
import { VStack } from "@astryxdesign/core/Stack";
import { CursorArrowRaysIcon } from "@heroicons/react/24/outline";
import { rectOf, ring } from "./controls.ts";

/* What makes the co-worker visible on the page: a ring on the control it is at, and its cursor going there. */

interface Point {
  readonly x: number;
  readonly y: number;
}

const SIZE = 24;
const FRAME = 30;

/** Where the cursor rests on a control: a little in from its right, in the middle of its height. */
const restOn = (control: HTMLElement): Point => {
  const box = rectOf(control);
  return { x: box.x + Math.min(box.w * 0.6, box.w - 12), y: box.y + box.h / 2 };
};

export function Pointer({ target }: { readonly target: HTMLElement | null }) {
  const [at, setAt] = useState<Point | null>(null);
  const isStill = useMediaQuery("(prefers-reduced-motion: reduce)");
  useEffect(() => {
    if (target === null) return undefined;
    const unring = ring(target);
    const follow = () =>
      setAt((was) => {
        const goal = restOn(target);
        if (was === null || isStill || Math.hypot(goal.x - was.x, goal.y - was.y) < 2) return goal;
        return { x: was.x + (goal.x - was.x) * 0.4, y: was.y + (goal.y - was.y) * 0.4 };
      });
    follow();
    const timer = setInterval(follow, FRAME);
    return () => {
      clearInterval(timer);
      unring();
    };
  }, [target, isStill]);
  if (target === null || at === null) return null;
  return (
    <VStack
      data-testid="juno-pointer"
      aria-hidden
      style={{
        position: "fixed",
        left: at.x,
        top: at.y,
        width: SIZE,
        height: SIZE,
        pointerEvents: "none",
        zIndex: 1000,
        color: "var(--color-data-categorical-blue)",
      }}
    >
      <Icon icon={CursorArrowRaysIcon} size="md" color="inherit" />
    </VStack>
  );
}
