// astryx-template: settings
import { useState, type ComponentType } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutPanel, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Selector } from "@astryxdesign/core/Selector";
import { useToast } from "@astryxdesign/core/Toast";
import { Missing, Reading, useGo, useRead } from "~/modules/page/service.ts";
import { useDay } from "./day.ts";
import type { PageProps } from "~/modules/page/types.ts";
import type { PlaybookView } from "~/modules/views-manager/types.ts";
import { Agents } from "./agents.tsx";
import { Evals } from "./evals.tsx";
import { Header } from "./header.tsx";
import { ManagerFrame } from "./frame.tsx";
import { Notes, Panel, shownOf, type Shown } from "./notes.tsx";
import { Objective } from "./objective.tsx";
import { Page } from "./page.tsx";
import { Reach } from "./reach.tsx";
import { SkillPage } from "./skill.tsx";
import { Skills } from "./skills.tsx";
import { Triggers } from "./triggers.tsx";
import { useChanges, type Target } from "./changes.ts";
import { Versions } from "./versions.tsx";
import { Workflow } from "./workflow.tsx";
import { PARTS, slug, type Part } from "./words.ts";

const BODY: Readonly<Record<string, ComponentType<{ onDirty?: () => void }>>> = {
  Playbook: Page,
  Objective,
  Workflow,
  Triggers,
  Agents,
  Skills,
  Reach,
  Evals,
  Versions,
};
const LIVE = [...PARTS, "Versions"] as const;

/** One playbook, as the person reads and comments on it: a draft being set up, or the one that runs. */
function Playbook({
  view,
  target,
  since,
  part,
  skill,
}: {
  view: PlaybookView;
  target: Target;
  since: number | null;
  part: string;
  skill: string | null;
}) {
  const where = "walk" in target ? `/set-up/${target.walk}/draft` : `/m/${target.manager}/playbook`;
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const isWide = useMediaQuery("(min-width: 1360px)");
  const [go, date, showToast] = [useGo(), useDay(), useToast()];
  const isDraft = view.draft;
  const open = (p: string) => go(p === "Playbook" ? where : `${where}/${slug(p)}`);
  const [own, setOwn] = useState<readonly Shown[]>([]);
  const [about, setAbout] = useState<string | null>(null);
  const [isTalking, setTalking] = useState(false);
  const [isDirty, setDirty] = useState(false);
  const changes = useChanges(view, target);
  const comments = [...view.comments.map((c) => shownOf(view, c, date)), ...own];
  const said = changes.said;
  const isPast = part === "Versions";
  const waiting = comments.filter((c) => !said[c.id]).length;
  const count = (p: string) => comments.filter((c) => c.part === p && !said[c.id]).length;
  const names: readonly string[] = isDraft ? PARTS : LIVE;
  const Body = BODY[part] ?? Page;
  const talk = (v: string | null) => {
    setAbout(v);
    setTalking(true);
  };
  const panel = (
    <Panel
      part={part}
      comments={comments}
      said={said}
      at={about}
      onAt={setAbout}
      onSay={(id, v) => {
        changes.say(id, v);
        setDirty(true);
      }}
      onAdd={(text) => {
        const line = comments.find((c) => c.on === about)?.line ?? slug(part);
        setOwn((c) => [
          ...c,
          {
            id: `own${c.length}`,
            part: part as Part,
            line,
            on: about ?? part,
            by: changes.me,
            when: "Now",
            text,
            reply: null,
            change: null,
            isCase: false,
          },
        ]);
        void changes.comment(line, text);
        setAbout(null);
        showToast({ body: "Juno reads it, and answers here.", uniqueID: "said" });
      }}
    />
  );
  const item = (p: string) => (
    <ListItem
      key={p}
      label={p}
      isSelected={p === part}
      aria-current={p === part ? "page" : undefined}
      onClick={() => open(p)}
      {...(count(p) > 0 ? { endContent: <Badge variant="neutral" label={String(count(p))} /> } : {})}
    />
  );
  const hasSide = isWide && !isPast;
  const content =
    isTalking && !hasSide ? (
      <VStack gap={3}>
        <HStack>
          <Button label={`Back to ${part}`} size="sm" variant="ghost" onClick={() => setTalking(false)} />
        </HStack>
        {panel}
      </VStack>
    ) : skill !== null ? (
      <SkillPage key={skill} id={skill} onBack={() => open("Skills")} />
    ) : (
      <Body onDirty={() => setDirty(true)} />
    );
  return (
    <Notes.Provider
      value={{
        view,
        comments,
        said,
        isDraft,
        part,
        about: talk,
        change: () => setDirty(true),
        openSkill: (id) => go(`${where}/skills/${id}`),
        person: changes.person,
      }}
    >
      <Layout
        height="fill"
        header={
          <Header
            view={view}
            since={since}
            waiting={waiting}
            comments={count(part)}
            isTalkable={!hasSide && !isPast && !isTalking}
            isDirty={isDirty}
            changes={changes}
            onTalk={() => talk(null)}
            onSaved={() => setDirty(false)}
          />
        }
        start={
          isNarrow ? undefined : (
            <LayoutPanel hasDivider={false} width={220} padding={2}>
              <List density="balanced">{names.map(item)}</List>
            </LayoutPanel>
          )
        }
        end={
          hasSide ? (
            <LayoutPanel width={300} padding={4} role="complementary" label="Comments">
              {panel}
            </LayoutPanel>
          ) : undefined
        }
        content={
          <LayoutContent role="main" padding={4}>
            <VStack gap={4}>
              {isNarrow && (
                <>
                  <Selector
                    label="Part"
                    isLabelHidden
                    value={part}
                    onChange={(v) => {
                      setTalking(false);
                      open(String(v));
                    }}
                    options={names.map((n) => ({ value: n, label: n }))}
                  />
                  <Divider />
                </>
              )}
              {content}
            </VStack>
          </LayoutContent>
        }
      />
    </Notes.Provider>
  );
}

const partOf = (names: readonly string[], part: string | undefined, skill: string | undefined): string =>
  skill !== undefined ? "Skills" : (names.find((n) => slug(n) === part) ?? "Playbook");

/** A running playbook: it also says since when this version has run. */
function Running({ manager, part, skill }: { manager: string; part: string; skill: string | null }) {
  const versions = useRead("/m/:manager/versions", { manager });
  const since = versions._tag === "Ok" ? (versions.value.versions[0]?.at ?? null) : null;
  return (
    <ManagerFrame id={manager} tab="Playbook">
      <Reading from="/m/:manager/playbook?version" parts={{ manager }} failed="We could not read the playbook">
        {(view) => <Playbook key={manager} view={view} target={{ manager }} since={since} part={part} skill={skill} />}
      </Reading>
    </ManagerFrame>
  );
}

export default function PlaybookPage({ params }: PageProps) {
  const { manager, walk, part, skill } = params;
  return walk !== undefined ? (
    <Reading from="/set-up/:walk" parts={{ walk }} failed="We could not read the draft">
      {({ draft }) =>
        draft === null ? (
          <Missing title="There is no draft yet" description="It comes after the questions." />
        ) : (
          <Playbook key={walk} view={draft} target={{ walk }} since={null} part={partOf(PARTS, part, skill)} skill={skill ?? null} />
        )
      }
    </Reading>
  ) : (
    <Running manager={manager ?? ""} part={partOf(LIVE, part, skill)} skill={skill ?? null} />
  );
}
