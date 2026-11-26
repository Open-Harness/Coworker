import { describe, it } from "vitest";

/*
 * What the new core must do, from the README of the loop that was here. The flows under evals/flows say it end to end;
 * these are its own tests, written as it is built.
 */
describe("working", () => {
  it.todo("take puts work on its kind's first step once per item, and opens that step's thread through the agent");
  it.todo("an event moves the work once by its key, with the jobs it asks for, in one transaction");
  it.todo("a job that cannot go on holds the work with why, and is tried again at the hold's date; nothing is lost or done twice");
  it.todo("a step that code checks is left when its commands pass, whatever the agent said");
  it.todo("an ask parks the thread on a signal; the answer resumes the same call, once");
  it.todo("a tool that fails is told to the agent, never turned into a silent wait");
});
