import type { Work } from "~/modules/work/types.ts";
import type { Hold, Job, Message, Spend, Store, StoredJob, ThreadRow } from "./types.ts";

/** What a manager keeps, in memory: for tests of what it does, beside the real one in its Durable Object. */
export function memoryStore(): Store {
  const [works, seen, jobs, threads, messages, spends, holds, once] = [
    new Map<string, Work>(),
    new Set<string>(),
    [] as { key: string; work: string; job: Job; done: boolean }[],
    new Map<string, ThreadRow>(),
    new Map<string, Message[]>(),
    [] as Spend[],
    new Map<string, Hold>(),
    new Map<string, string>(),
  ];
  return {
    transaction: (run) => run(),
    work: (id) => works.get(id),
    works: () => [...works.values()],
    putWork: (work) => void works.set(work.id, work),
    seen: (key) => seen.has(key),
    see: (key) => void seen.add(key),
    addJobs: (work, more) => {
      for (const job of more) if (!jobs.some((one) => one.key === job.key)) jobs.push({ key: job.key, work, job, done: false });
    },
    nextJob: (work) => {
      const at = jobs.findIndex((one) => one.work === work && !one.done);
      const found = jobs[at];
      return found === undefined ? undefined : ({ seq: at, work, job: found.job } satisfies StoredJob);
    },
    finishJob: (key) => void jobs.forEach((one) => (one.done = one.done || one.key === key)),
    busy: () => [...new Set(jobs.filter((one) => !one.done).map((one) => one.work))],
    thread: (id) => threads.get(id),
    threadsOf: (work) => [...threads.values()].filter((one) => one.work === work),
    putThread: (row) => void threads.set(row.id, row),
    messages: (thread) => messages.get(thread) ?? [],
    addMessage: (thread, message) => void messages.set(thread, [...(messages.get(thread) ?? []), message]),
    addSpend: (spend) => void (spends.some((one) => one.call === spend.call) || spends.push(spend)),
    spendOf: (work) => {
      const mine = spends.filter((one) => one.work === work);
      return {
        dollars: mine.reduce((sum, one) => sum + (one.dollars ?? 0), 0),
        notKnown: mine.filter((one) => one.dollars === undefined).length,
      };
    },
    spends: () => spends,
    hold: (work) => holds.get(work),
    setHold: (work, hold) => void (hold === null ? holds.delete(work) : holds.set(work, hold)),
    once: (key) => once.get(key),
    keepOnce: (key, value) => void (once.has(key) || once.set(key, value)),
  };
}
