// astryx-template: settings
import { useEffect, useState, type ComponentType } from "react";
import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Divider } from "@astryxdesign/core/Divider";
import { useMediaQuery } from "@astryxdesign/core/hooks";
import { HStack, Layout, LayoutContent, LayoutHeader, LayoutPanel, StackItem, VStack } from "@astryxdesign/core/Layout";
import { List, ListItem } from "@astryxdesign/core/List";
import { Selector } from "@astryxdesign/core/Selector";
import { Heading, Text } from "@astryxdesign/core/Text";
import { useToast } from "@astryxdesign/core/Toast";
import { go } from "../../shell";
import { Agents } from "./agents";
import { COMMENTS, PARTS, type Comment, type Part } from "./data";
import { Evals } from "./evals";
import { Notes, Panel, type Said } from "./notes";
import { Objective } from "./objective";
import { Page } from "./page";
import { Reach } from "./reach";
import { SkillPage } from "./skill";
import { Skills } from "./skills";
import { Triggers } from "./triggers";
import { Versions } from "./versions";
import { Workflow } from "./workflow";

const BODY: Readonly<Record<string, ComponentType<{ onDirty?: () => void }>>> = { Playbook: Page, Objective, Workflow, Triggers, Agents, Skills, Reach, Evals, Versions };
const LIVE = [...PARTS, "Versions"] as const;
const slug = (p: string) => p.toLowerCase().replaceAll(" ", "-");
const read = () => {
  const h = location.hash.slice(1); const isDraft = h.startsWith("draft");
  const rest = isDraft ? h.slice(6) : h.replace(/^m-sales-playbook-?/, "");
  const skill = /^skill-(.+)$/.exec(rest)?.[1] ?? null;
  const names: readonly string[] = isDraft ? PARTS : LIVE;
  return { isDraft, skill, part: skill ? "Skills" : names.find((n) => slug(n) === rest) ?? "Playbook" };
};
const LATER: readonly Comment[] = [
  { id: "n1", on: "Workflow", at: "Read it fresh", by: "Juno", when: "23 Nov", text: "It found nothing in the last 60 reminders. I would leave it out for reminders only: 4 cents and 20 seconds each. Tried on 60 past ones, the same mails went out.", change: { was: "A lead that went quiet: Write, Read it fresh, Send", now: "A lead that went quiet: Write, Send" } },
  { id: "n2", on: "Skills", at: "Bo’s way of writing", by: "Bo Larsen", when: "24 Nov", text: "The mail to Arden Glass was too long. Two lines would do for someone I have met.", reply: "Kept as a case. Tried on the 9 mails to people you have met: 5 unchanged before, 8 now.", change: { was: "Bo writes longer to people Bo has met.", now: "To people Bo has met: two lines, no facts they know." }, case: true },
  { id: "n3", on: "Evals", at: "Look for signs", by: "Juno", when: "24 Nov", text: "The weakest part this week: 68% of what it found became work. I tried one change on the same 28 past cases: it finds 22, all 19 that became work are among them (86%), and it leaves 6 that were only a new page. It changes what counts as a sign, so I ask.", change: { was: "A new site.", now: "A new site at its own address." } },
];

/** The skill that is the manager. First a draft, then the page it runs by: the same parts, and comments on all of it. */
export default function Playbook() {
  const isNarrow = useMediaQuery("(max-width: 900px)");
  const isWide = useMediaQuery("(min-width: 1360px)");
  const [at, setAt] = useState(read());
  useEffect(() => { const on = () => setAt(read()); addEventListener("hashchange", on); return () => removeEventListener("hashchange", on); }, []);
  const { isDraft, part, skill } = at;
  const base = isDraft ? "draft" : "m-sales-playbook";
  const open = (p: string) => go(`${base}-${slug(p)}`);
  const showToast = useToast();
  const [comments, setComments] = useState<readonly Comment[]>(isDraft ? COMMENTS : LATER);
  const [said, setSaid] = useState<Said>({});
  const [about, setAbout] = useState<string | null>(null);
  const [isTalking, setTalking] = useState(false);
  const [isDirty, setDirty] = useState(false);
  const isPast = part === "Versions";
  const waiting = comments.filter((c) => !said[c.id]).length;
  const count = (p: string) => comments.filter((c) => c.on === p && !said[c.id]).length;
  const names: readonly string[] = isDraft ? PARTS : LIVE;
  const Body = BODY[part]!;
  const talk = (v: string | null) => { setAbout(v); setTalking(true); };
  const panel = <Panel part={part} comments={comments} said={said} at={about} onAt={setAbout} onSay={(id, v) => { setSaid((s) => ({ ...s, [id]: v })); setDirty(true); }}
    onAdd={(text) => { setComments((c) => [...c, { id: `own${c.length}`, on: part as Part, at: about ?? part, by: "Ama Mensah", when: "Now", text }]); setAbout(null); showToast({ body: "Juno reads it, and answers here.", uniqueID: "said" }); }} />;
  const item = (p: string) => <ListItem key={p} label={p} isSelected={p === part} aria-current={p === part ? "page" : undefined} onClick={() => open(p)} {...(count(p) ? { endContent: <Badge variant="neutral" label={String(count(p))} /> } : {})} />;
  const hasSide = isWide && !isPast;
  const content = isTalking && !hasSide ? <VStack gap={3}><HStack><Button label={`Back to ${part}`} size="sm" variant="ghost" onClick={() => setTalking(false)} /></HStack>{panel}</VStack> : skill ? <SkillPage key={skill} id={skill} onBack={() => open("Skills")} /> : <Body onDirty={() => setDirty(true)} />;
  return (
    <Notes.Provider value={{ comments, said, isDraft, part, about: talk, change: () => setDirty(true), openSkill: (id) => go(`${base}-skill-${id}`) }}>
      <Layout height="fill"
        header={
          <LayoutHeader hasDivider>
            <HStack gap={2} vAlign="center" wrap="wrap">
              <StackItem size="fill">{isDraft ? <VStack gap={0}><Heading level={1}>Sales, a draft</Heading><Text type="supporting" color="secondary">Nothing is made yet. {waiting ? `${waiting} comments open.` : "No comments open."}</Text></VStack> : <Text type="supporting" color="secondary">Version 6, since 23 Nov. A change reaches open work, and never widens it.</Text>}</StackItem>
              {!hasSide && !isPast && !isTalking && <Button label={count(part) ? `Comments, ${count(part)}` : "Comments"} size="sm" variant="ghost" onClick={() => talk(null)} />}
              {isDraft ? <>{!isNarrow && <Button label="Back to the questions" size="sm" variant="ghost" onClick={() => go("setup-ask-2")} />}<Button label="Try again" aria-label="Try again on past work" size="sm" variant="secondary" onClick={() => showToast({ body: "Runs on 5 Sep to 4 Oct again. About 8 minutes, nothing is sent.", uniqueID: "try" })} /><Button label="Make it" size="sm" variant="primary" onClick={() => { showToast({ body: "Sales is there. It watches and asks for two weeks, and does what people ask for.", uniqueID: "made" }); go("m-sales-playbook"); }} /></>
                : <><Button label="Try on past work" size="sm" variant="secondary" onClick={() => go("soon-Try on past work")} /><Button label="Save as version 7" size="sm" variant="primary" isDisabled={!isDirty} onClick={() => { setDirty(false); showToast({ body: "Version 7. 4 open pieces of work were told.", uniqueID: "save" }); }} /></>}
            </HStack>
          </LayoutHeader>
        }
        start={isNarrow ? undefined : (
          <LayoutPanel hasDivider={false} width={220} padding={2}>
            <List density="balanced">{names.map(item)}</List>
          </LayoutPanel>
        )}
        end={hasSide ? <LayoutPanel width={300} padding={4} role="complementary" label="Comments">{panel}</LayoutPanel> : undefined}
        content={
          <LayoutContent role="main" padding={4}>
            <VStack gap={4}>
              {isNarrow && <><Selector label="Part" isLabelHidden value={part} onChange={(v) => { setTalking(false); open(String(v)); }} options={names.map((n) => ({ value: n, label: n }))} /><Divider /></>}
              {content}
            </VStack>
          </LayoutContent>
        }
      />
    </Notes.Provider>
  );
}
