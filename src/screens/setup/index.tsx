// astryx-template: form-wizard-vertical
import { Reading, useApi, useGo, useRead, useRefresh } from "~/modules/page/service.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { WalkEvent } from "~/modules/walkthrough/types.ts";
import { useToast } from "@astryxdesign/core/Toast";
import { Walk } from "./walk.tsx";

/** The walkthrough. Its steps and questions are written for this one objective, by the co-worker's set-up skill. */
export default function Setup({ params }: PageProps) {
  const [api, go, refresh, showToast] = [useApi(), useGo(), useRefresh(), useToast()];
  const shell = useRead("/shell");
  const coworker_ = useRead("/coworker");
  if (shell._tag !== "Ok") return null;
  const setUp = coworker_._tag === "Ok" ? coworker_.value.setUp : undefined;
  const { coworker, me, people, workspace } = shell.value;
  const say = async (said: string) => {
    const walked = await api.write("/set-up", { said });
    if (walked._tag === "Ok") go(`/set-up/${walked.value.walk}`);
    else showToast({ body: `That did not go through. ${walked.says}`, uniqueID: "say-failed" });
  };
  const walk = params["walk"];
  if (walk === undefined)
    return (
      <Walk
        view={undefined}
        skill={setUp === undefined ? undefined : { skill: setUp.skill, version: setUp.version }}
        who={coworker.name}
        me={me.id}
        people={people}
        zone={workspace.zone}
        say={(said) => void say(said)}
        send={() => undefined}
      />
    );
  const send = async (event: WalkEvent) => {
    const next = await api.write("/set-up/:walk", event, { walk });
    if (next._tag !== "Ok") return showToast({ body: `That did not go through. ${next.says}`, uniqueID: "walk-failed" });
    if ("_tag" in next.value) return showToast({ body: next.value.why, uniqueID: "walk-refused" });
    refresh([`/set-up/${next.value.walk.id}`]);
    if (next.value.walk.id !== walk) go(`/set-up/${next.value.walk.id}`);
  };
  return (
    <Reading from="/set-up/:walk" parts={{ walk }} failed="We could not read this set-up">
      {(view) => (
        <Walk
          view={view}
          skill={view.writtenBy}
          who={coworker.name}
          me={me.id}
          people={people}
          zone={workspace.zone}
          say={() => undefined}
          send={(event) => void send(event)}
        />
      )}
    </Reading>
  );
}
