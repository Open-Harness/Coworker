// astryx-template: login-card
import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Icon } from "@astryxdesign/core/Icon";
import { HStack, VStack } from "@astryxdesign/core/Layout";
import { Link } from "@astryxdesign/core/Link";
import { Section } from "@astryxdesign/core/Section";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { useToast } from "@astryxdesign/core/Toast";
import { EnvelopeIcon } from "@heroicons/react/24/outline";
import { go } from "../shell";
import { Door, GitHubIcon, GoogleIcon } from "./Door";

const isEmail = (text: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(text);
export interface DoorWords { readonly title: string; readonly description: string; readonly send: string; readonly other: string; readonly otherLink: string; readonly otherHref: string; readonly next: string; readonly terms: boolean }

/** Signing in and making an account are the same three ways in: a link by mail, GitHub or Google. There is no password. */
export function SignIn({ words }: { words: DoorWords }) {
  const [email, setEmail] = useState("");
  const [failed, setFailed] = useState(false);
  const [sentTo, setSentTo] = useState<string>();
  const showToast = useToast();
  const send = () => { if (isEmail(email)) setSentTo(email); else setFailed(true); };

  if (sentTo !== undefined)
    return (
      <Door title="Check your email" description="We sent you a link. It works once, for 5 minutes.">
        <Card padding={0}>
          <Section variant="muted" padding={4}>
            <HStack gap={2} vAlign="center">
              <Icon icon={EnvelopeIcon} color="secondary" />
              <VStack gap={0}>
                <Text type="label">{sentTo}</Text>
                <Text type="supporting" color="secondary">Open it in this browser</Text>
              </VStack>
            </HStack>
          </Section>
        </Card>
        <VStack gap={3} hAlign="stretch">
          <Button label="Send it again" variant="secondary" size="lg" onClick={() => showToast({ body: `Sent again to ${sentTo}`, uniqueID: "again" })} />
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
              By continuing, you agree to our <Link href="#signup" type="supporting">Terms of Service</Link> and <Link href="#signup" type="supporting">Privacy Policy</Link>.
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
        onChange={(v: string) => { setEmail(v); setFailed(false); }}
        onEnter={send}
        size="lg"
        {...(failed ? { status: { type: "error" as const, message: "Enter your email address." } } : {})}
      />
      <Button label={words.send} variant="primary" size="lg" onClick={send} />
      <Divider label="Or continue with" />
      <VStack gap={3} hAlign="stretch">
        <Button label="Continue with GitHub" variant="secondary" icon={<GitHubIcon />} size="lg" onClick={() => go(words.next)} />
        <Button label="Continue with Google" variant="secondary" icon={<GoogleIcon />} size="lg" onClick={() => go(words.next)} />
      </VStack>
      <VStack hAlign="center">
        <Text type="supporting" color="secondary">
          {words.other} <Link href={words.otherHref} type="supporting">{words.otherLink}</Link>
        </Text>
      </VStack>
    </Door>
  );
}
