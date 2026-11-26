import { describe, expect, it } from "vitest";
import { emailServiceMailer } from "./service.ts";
import { fakeMailer } from "./testing.ts";

describe("mail", () => {
  it("the Email Service mailer passes the message on and returns its id", async () => {
    const calls: unknown[] = [];
    const binding = { send: async (message: unknown) => (calls.push(message), { messageId: "<m1@x>" }) } as unknown as SendEmail;
    const result = await emailServiceMailer(binding).send({
      from: "a@x.test",
      fromName: "Launch",
      to: "b@x.test",
      subject: "Hi",
      text: "Hello",
    });
    expect(result).toEqual({ _tag: "Sent", messageId: "<m1@x>" });
    expect(calls).toEqual([{ from: { email: "a@x.test", name: "Launch" }, to: "b@x.test", subject: "Hi", text: "Hello" }]);
  });

  it("turns a refusal into a value", async () => {
    const binding = { send: async () => Promise.reject(new Error("domain not verified")) } as unknown as SendEmail;
    expect(await emailServiceMailer(binding).send({ from: "a@x.test", to: "b@x.test", subject: "Hi", text: "" })).toEqual({
      _tag: "Failed",
      reason: "domain not verified",
    });
  });

  it("the fake keeps what it sent and can be made to fail", async () => {
    const mailer = fakeMailer();
    await mailer.send({ from: "a@x.test", to: "B@x.test", subject: "One", text: "" });
    expect(mailer.lastTo("b@x.test")?.subject).toBe("One");
    mailer.failWith("down");
    expect(await mailer.send({ from: "a@x.test", to: "b@x.test", subject: "Two", text: "" })).toEqual({ _tag: "Failed", reason: "down" });
    expect(mailer.sent).toHaveLength(1);
  });
});
