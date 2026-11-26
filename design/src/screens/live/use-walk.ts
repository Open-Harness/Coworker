import { useEffect, useRef, useState } from "react";
import { draftAt, dwell, EMPTY, LAST, STEPS, STOP, stepAt, type Draft } from "./walk";

export type Mode = "playing" | "paused" | "yours" | "done" | "hand";
/** Reads a sentence aloud, where the browser can. Returns what stops it. */
function speak(text: string): () => void {
  try { const u = new SpeechSynthesisUtterance(text); u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u); return () => speechSynthesis.cancel(); } catch { return () => undefined; }
}

/** Plays the steps one by one, and stops where only a person may go on, or when the person takes over. */
export function useWalk(from: number, startsPlaying: boolean, byHand: boolean) {
  const [n, setN] = useState(from);
  const [typed, setTyped] = useState(startsPlaying ? 0 : 1);
  const [mode, setMode] = useState<Mode>(byHand ? "hand" : from === STOP ? "yours" : from === LAST ? "done" : startsPlaying ? "playing" : "paused");
  const [isAloud, setAloud] = useState(false);
  const [hand, setHand] = useState<Draft>(EMPTY);
  const [saved, setSaved] = useState(false);
  const hush = useRef<() => void>(() => undefined);
  const step = stepAt(n, saved);
  const draft = mode === "hand" ? hand : { ...draftAt(n, typed), saved: n === LAST && saved };

  useEffect(() => { if (isAloud && mode !== "hand" && mode !== "paused") hush.current = speak(step.say); return () => hush.current(); }, [n, isAloud, mode === "hand", mode === "paused"]);
  useEffect(() => {
    if (mode !== "playing") return;
    const total = dwell(step, isAloud); const started = performance.now();
    // Say it first, then do it: the first part of the time is for looking.
    const t = setInterval(() => {
      const p = (performance.now() - started) / total;
      setTyped(step.typed ? Math.min(1, Math.max(0, (p - 0.15) / 0.55)) : p > 0.55 ? 1 : 0);
      if (p < 1) return;
      clearInterval(t);
      const to = n + 1;
      setN(to); setTyped(0);
      if (STEPS[to]?.yours) setMode("yours"); else if (to === LAST) { setTyped(1); setMode("done"); }
    }, 40);
    return () => clearInterval(t);
  }, [n, mode, isAloud]);

  const jump = (to: number, m: Mode) => { setN(to); setTyped(m === "playing" ? 0 : 1); setMode(m); };
  return {
    n, step, mode, draft, isAloud, setAloud,
    pause: () => setMode("paused"), play: () => setMode("playing"),
    forward: () => { const to = Math.min(n + 1, LAST); jump(to, to === STOP ? "yours" : to === LAST ? "done" : "paused"); },
    back: () => jump(Math.max(0, n - 1), "paused"),
    answer: (yes: boolean) => { setSaved(yes); jump(LAST, "done"); },
    again: () => { setSaved(false); jump(0, "playing"); },
    undo: () => { setSaved(false); jump(0, "paused"); },
    take: () => { setHand(draft); setMode("hand"); },
    tryIt: () => { setHand(EMPTY); setMode("hand"); },
    change: (d: Partial<Draft>) => { if (mode === "yours" && d.saved !== undefined) { setSaved(d.saved); jump(LAST, "done"); } else if (mode === "hand") setHand((x) => ({ ...x, ...d })); else { setHand({ ...draft, ...d }); setMode("hand"); } },
  };
}
export type Walk = ReturnType<typeof useWalk>;
