// astryx-template: login-card
import { useEffect, useState, type ReactElement } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { useBrowser, useGo, useOutside } from "~/modules/page/service.ts";
import { Door, GitHubIcon, GoogleIcon } from "./Door.tsx";

export type Way = "github" | "google";
const WAYS: Readonly<Record<Way, { readonly label: string; readonly icon: ReactElement }>> = {
  github: { label: "Continue with GitHub", icon: <GitHubIcon /> },
  google: { label: "Continue with Google", icon: <GoogleIcon /> },
};
const isWay = (value: unknown): value is Way => value === "github" || value === "google";
/** `{person: null}` is what a visitor is told; a signed-in person has one. */
const isNobody = (body: unknown): boolean => typeof body !== "object" || body === null || !("person" in body) || body.person === null;
const isEmail = (text: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(text);

export interface DoorWords {
  readonly title: string;
  readonly description: string;
  readonly send: string;
  readonly other: string;
  readonly otherLink: string;
  readonly otherHref: string;
  readonly terms: boolean;
}

/** `{ways: ["github", "google"]}`: the ways in this server offers, narrowed. */
function waysOf(body: unknown): readonly Way[] {
  const ways = typeof body === "object" && body !== null && "ways" in body && Array.isArray(body.ways) ? body.ways : [];
  return ways.filter(isWay);
}

/** `{url}`: where a provider's own page is. */
const pageOf = (body: unknown): string | undefined =>
  typeof body === "object" && body !== null && "url" in body && typeof body.url === "string" ? body.url : undefined;

/** Signing in and making an account are the same three ways in: a link by mail, GitHub or Google. There is no password. */
export function SignIn({ words }: { readonly words: DoorWords }) {
  const outside = useOutside();
  const { open } = useBrowser();
  const go = useGo();
  const [ways, setWays] = useState<readonly Way[]>([]);
  const [email, setEmail] = useState("");
  const [failed, setFailed] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();

  useEffect(() => {
    void outside.get("/api/sign-in").then((answer) => setWays(answer._tag === "Ok" ? waysOf(answer.value) : []));
    // Someone who is signed in has no use for this page.
    void outside.get("/api/me").then((answer) => {
      if (answer._tag === "Ok" && !isNobody(answer.value)) go("//", { replace: true });
    });
  }, [outside, go]);

  const send = async (again = false) => {
    const to = again ? (sentTo ?? "") : email.trim();
    if (!isEmail(to)) return setFailed("Enter your email address.");
    const sent = await outside.post("/api/auth/sign-in/magic-link", { email: to, callbackURL: "/" });
    if (sent._tag === "Ok") return setSentTo(to);
    setFailed(`We could not send a link to ${to}. ${sent.says}`);
  };
  const continueWith = async (way: Way) => {
    const page = await outside.post("/api/auth/sign-in/social", { provider: way, callbackURL: "/", disableRedirect: true });
    const url = page._tag === "Ok" ? pageOf(page.value) : undefined;
    if (url === undefined) return setFailed("That did not work. Try another way in.");
    open(url);
  };

  if (sentTo !== undefined)
    return (
      <Door title="Check your email" description="We sent you a link. It works once, for 5 minutes.">
        <Card padding={0}>
          <Section variant="muted" padding={4}>
            <HStack gap={2} vAlign="center">
              <Icon icon={EnvelopeIcon} color="secondary" />
              <VStack gap={0}>
                <Text type="label">{sentTo}</Text>
                <Text type="supporting" color="secondary">
                  Open it in this browser
                </Text>
              </VStack>
            </HStack>
          </Section>
        </Card>
        <VStack gap={3} hAlign="stretch">
          <Button label="Send it again" variant="secondary" size="lg" clickAction={() => send(true)} />
          <Button label="Use a different email" variant="ghost" size="lg" onClick={() => setSentTo(undefined)} />
        </VStack>
      </Door>
    );

  return (
    <Door
      title={words.title}
      description={words.description}
      below={
        words.terms ? (
          <VStack hAlign="center" width="100%">
            <Text type="supporting" color="secondary" justify="center">
              By continuing, you agree to our{" "}
              <Link href="/sign-up" type="supporting">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/sign-up" type="supporting">
                Privacy Policy
              </Link>
              .
            </Text>
          </VStack>
        ) : undefined
      }
    >
      <TextInput
        label="Work email"
        isLabelHidden
        type="email"
        placeholder="name@company.com"
        value={email}
        onChange={(value: string) => {
          setEmail(value);
          setFailed(undefined);
        }}
        onEnter={() => void send()}
        size="lg"
        {...(failed === undefined ? {} : { status: { type: "error" as const, message: failed } })}
      />
      <Button label={words.send} variant="primary" size="lg" clickAction={() => send()} />
      {ways.length === 0 ? null : <Divider label="Or continue with" />}
      <VStack gap={3} hAlign="stretch">
        {ways.map((way) => (
          <Button
            key={way}
            label={WAYS[way].label}
            variant="secondary"
            icon={WAYS[way].icon}
            size="lg"
            clickAction={() => continueWith(way)}
          />
        ))}
      </VStack>
      <VStack hAlign="center">
        <Text type="supporting" color="secondary">
          {words.other}{" "}
          <Link href={words.otherHref} type="supporting">
            {words.otherLink}
          </Link>
        </Text>
      </VStack>
    </Door>
  );
}
