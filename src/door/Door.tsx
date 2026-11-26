// astryx-template: login-card
import type { CSSProperties, ReactNode, SVGProps } from "react";
import { CubeIcon } from "@heroicons/react/24/outline";
import { Card } from "@astryxdesign/core/Card";
import { Center } from "@astryxdesign/core/Center";
import { Icon } from "@astryxdesign/core/Icon";
import { VStack } from "@astryxdesign/core/Layout";
import { Heading, Text } from "@astryxdesign/core/Text";

// Brand sign-in marks — no heroicons or template-assets equivalent.
export const GoogleIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16} aria-hidden="true" {...props}>
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export const GitHubIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" width={16} height={16} aria-hidden="true" {...props}>
    <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2 0 1.9 1.2 1.9 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1 .9 2.2v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3" />
  </svg>
);

// Standalone auth page paints its own body background (no host shell).
const pageStyle: CSSProperties = { minHeight: "100dvh", backgroundColor: "var(--color-background-body)" };
// Cap the column at 400px but let it shrink to fit narrow screens (Stack
// has no maxWidth prop, so it's set here).
const contentStyle: CSSProperties = { width: "100%", maxWidth: 400 };

/** The page outside the product: the mark, one card, and what is under it. */
export function Door({
  title,
  description,
  children,
  below,
}: {
  title: string;
  description: string;
  children: ReactNode;
  below?: ReactNode;
}) {
  return (
    <Center role="main" axis="both" padding={6} style={pageStyle}>
      <VStack gap={4} hAlign="center" style={contentStyle}>
        <VStack gap={2} hAlign="center">
          <Icon icon={CubeIcon} size="lg" />
          <Text type="body" weight="bold" size="lg">
            Co-worker
          </Text>
        </VStack>
        <Card padding={8} width="100%">
          <VStack gap={4} hAlign="stretch">
            <VStack gap={1} hAlign="center">
              <Heading level={2} accessibilityLevel={1} justify="center">
                {title}
              </Heading>
              <Text type="body" color="secondary" size="sm" justify="center">
                {description}
              </Text>
            </VStack>
            {children}
          </VStack>
        </Card>
        {below}
      </VStack>
    </Center>
  );
}
