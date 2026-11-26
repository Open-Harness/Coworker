// astryx-template: ai-chat
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useHotkeys } from "@astryxdesign/core/hooks";
import { VStack } from "@astryxdesign/core/Stack";
import { useApi, useGo } from "~/modules/page/service.ts";
import { createWalk, type Shown } from "./engine.ts";
import { Panel } from "./panel.tsx";
import { Pointer } from "./pointer.tsx";

/* The co-worker showing how, anywhere in the console: ask it for the steps of a doing (`POST /walk`), and it plays them on the page you are on. */

type Values = Readonly<Record<string, string>>;
const Showing = createContext<(doing: string, values: Values) => void>(() => undefined);

/** Asks to be shown how to do something: what the palette and a reply of the co-worker's "Show me" press. */
export const useShow = (): ((doing: string, values: Values) => void) => useContext(Showing);

interface Props {
  readonly name: string;
  /** Where the person is, under the workspace. */
  readonly path: string;
  readonly children: ReactNode;
}

export function ShowProvider({ name, path, children }: Props) {
  const [api, go] = [useApi(), useGo()];
  const [shown, setShown] = useState<Shown | null>(null);
  const here = useRef<HTMLElement>(null);
  const at = useRef(path);
  at.current = path;
  const walk = useMemo(
    () =>
      createWalk({
        root: () => here.current?.ownerDocument ?? null,
        here: () => at.current,
        go,
        shows: setShown,
      }),
    [go],
  );
  useEffect(() => () => walk.close(), [walk]);
  useHotkeys([{ keys: "escape", allowInInputs: true, onPress: () => shown?.mode === "playing" && walk.stop() }]);
  const show = useMemo(
    () => async (doing: string, values: Values) => {
      const walked = await api.write("/walk", { doing, values });
      if (walked._tag === "Ok") walk.start(walked.value.steps);
    },
    [api, walk],
  );
  return (
    <Showing.Provider value={(doing, values) => void show(doing, values)}>
      {children}
      <VStack ref={here} hidden />
      <Pointer target={shown?.target ?? null} />
      {shown !== null && <Panel name={name} shown={shown} onStop={walk.stop} onSkip={walk.skip} onClose={walk.close} />}
    </Showing.Provider>
  );
}
