import { useRef, type CSSProperties } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Center } from "@astryxdesign/core/Center";
import { HStack } from "@astryxdesign/core/Stack";
import { Icon } from "@astryxdesign/core/Icon";
import { IconButton } from "@astryxdesign/core/IconButton";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Text } from "@astryxdesign/core/Text";
import { Toolbar } from "@astryxdesign/core/Toolbar";
import { BackwardIcon, ForwardIcon, HandRaisedIcon, PauseIcon, PlayIcon, SpeakerWaveIcon, SpeakerXMarkIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Pointer } from "./pointer";
import type { Walk } from "./use-walk";
import { LAST, nextByHand } from "./walk";
import { Edit } from "./edit";
import { ROWS } from "./data";
import { SalesPage } from "./page";

const fill: CSSProperties = { position: "relative", flex: 1, minHeight: 0, overflow: "hidden" };
const page: CSSProperties = { position: "absolute", inset: 0, overflow: "auto" };
const over: CSSProperties = { position: "absolute", inset: 0, background: "var(--color-overlay)", padding: 16, overflow: "auto", zIndex: 1 };
const HINT: Readonly<Record<string, string>> = { list: "Start here: Triggers.", pencil: "Edit Look for signs.", when: "Change When.", rest: "Leave these as they are.", keep: "Press Keep.", save: "Save as version 7, when you are sure.", cell: "Saved." };

/** The console itself, beside the chat, with Juno at work on it. The bar is how a person stops it, steps it, or takes over. */
export function Stage({ w, onClose }: { w: Walk; onClose: () => void }) {
  const pane = useRef<HTMLDivElement>(null);
  const isHand = w.mode === "hand"; const isPlaying = w.mode === "playing";
  const at = isHand ? nextByHand(w.draft) : w.step.at;
  const status = isHand ? "You have it. Juno only points." : w.mode === "yours" ? "Juno waits for you" : w.mode === "done" ? "Juno is done" : isPlaying ? "Juno is at work here" : "Paused";
  return (
    <>
      <Toolbar label="Juno at work" size="sm" dividers={["bottom"]}
        startContent={<HStack gap={2} vAlign="center"><StatusDot variant={w.mode === "yours" ? "warning" : isPlaying ? "success" : "neutral"} label={status} /><Text type="label" weight="semibold">{status}</Text></HStack>}
        endContent={
          <>
            {!isHand && w.mode !== "done" && (
              <>
                <IconButton label="Step back" size="sm" variant="ghost" icon={<Icon icon={BackwardIcon} size="sm" />} onClick={w.back} isDisabled={w.n === 0} />
                <IconButton label={isPlaying ? "Pause" : "Go on"} size="sm" variant="ghost" icon={<Icon icon={isPlaying ? PauseIcon : PlayIcon} size="sm" />} onClick={isPlaying ? w.pause : w.play} isDisabled={w.mode === "yours"} />
                <IconButton label="Step on" size="sm" variant="ghost" icon={<Icon icon={ForwardIcon} size="sm" />} onClick={w.forward} isDisabled={w.mode === "yours"} />
              </>
            )}
            <IconButton label={w.isAloud ? "Stop reading aloud" : "Read it aloud"} size="sm" variant="ghost" icon={<Icon icon={w.isAloud ? SpeakerWaveIcon : SpeakerXMarkIcon} size="sm" />} onClick={() => w.setAloud(!w.isAloud)} />
            {isHand ? <Button label="Juno, go on" size="sm" variant="secondary" onClick={w.again} /> : w.mode !== "done" && <Button label="I’ll do it" size="sm" variant="secondary" icon={<Icon icon={HandRaisedIcon} size="sm" />} onClick={w.take} />}
            <IconButton label="Close" size="sm" variant="ghost" icon={<Icon icon={XMarkIcon} size="sm" />} onClick={onClose} />
          </>
        }
      />
      <div ref={pane} style={fill}>
        <div style={page}><SalesPage d={w.draft} onChange={w.change} /></div>
        {w.draft.editing && <div style={over}><Center axis="both" minHeight="100%"><Edit t={ROWS[0]!} d={w.draft} onChange={w.change} /></Center></div>}
        <Pointer pane={pane} at={at} isAbove={at === "cell"} isQuiet={isHand} say={isHand ? HINT[at] ?? "" : w.step.say} count={isHand ? "" : `${w.n + 1} of ${LAST + 1}`}>
          {w.mode === "yours" && <HStack gap={2} wrap="wrap"><Badge variant="warning" label="Waits for you" /><Button label="Save" size="sm" variant="primary" onClick={() => w.answer(true)} /><Button label="Not yet" size="sm" variant="secondary" onClick={() => w.answer(false)} /></HStack>}
        </Pointer>
      </div>
    </>
  );
}
