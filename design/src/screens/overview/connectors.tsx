import { Fragment, useMemo } from "react";
import * as stylex from "@stylexjs/stylex";
import { VStack, HStack } from "@astryxdesign/core/Layout";
import { Text, Heading } from "@astryxdesign/core/Text";
import { Card } from "@astryxdesign/core/Card";
import { Divider } from "@astryxdesign/core/Divider";
import { Token } from "@astryxdesign/core/Token";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { manager } from "../../world";
import { LegendDot } from "./charts";
import { hashNoise } from "./data";

const UPTIME_DAYS = 90;

type UptimeStatus = "operational" | "degraded" | "down";

// Mirrors `uptimeStyles` below: the legend needs values, the bars need static StyleX rules.
const UPTIME_COLOR: Record<UptimeStatus, string> = { operational: "var(--color-success)", degraded: "var(--color-warning)", down: "var(--color-error)" };
const UPTIME_LABEL: Record<UptimeStatus, string> = { operational: "Working", degraded: "Partly working", down: "Not working" };
const UPTIME_ORDER: UptimeStatus[] = ["operational", "degraded", "down"];
// Share of the day served: a down day is a partial outage, not 24h lost.
const DAY_UPTIME: Record<UptimeStatus, number> = { operational: 100, degraded: 98.4, down: 82 };

interface ConnectorUptime { name: string; kind: string; days: UptimeStatus[]; uptime: number; degradedDays: number; downDays: number }

// Stable per name, so a history doesn't reshuffle.
function seedFor(name: string): number {
  let h = 7;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 9973;
  return h;
}

/** `risk` is how rough the record runs: 1 is a steady connector. Today always reads as working. */
function buildUptime(name: string, kind: string, risk: number): ConnectorUptime {
  const seed = seedFor(name);
  // Fixed quotas rather than a per-day coin flip: over 90 draws the variance of independent rolls swamps the signal.
  const downCount = Math.round(UPTIME_DAYS * Math.min(0.09, 0.005 * risk) * (0.6 + 0.8 * hashNoise(seed, 3.7)));
  const degradedCount = Math.round(UPTIME_DAYS * Math.min(0.32, 0.02 * risk) * (0.6 + 0.8 * hashNoise(seed, 5.9)));
  const ranked = [...Array(UPTIME_DAYS - 1).keys()].sort((a, b) => hashNoise(b, seed) - hashNoise(a, seed));
  const days: UptimeStatus[] = new Array(UPTIME_DAYS).fill("operational");
  for (let k = 0; k < downCount; k++) days[ranked[k]!] = "down";
  for (let k = downCount; k < downCount + degradedCount; k++) days[ranked[k]!] = "degraded";
  const cleanDay = DAY_UPTIME.operational - 0.02 - hashNoise(seed, 11.3) * 0.06;
  let served = 0, degradedDays = 0, downDays = 0;
  for (let i = 0; i < UPTIME_DAYS; i++) {
    const d = days[i]!;
    if (d === "operational") served += cleanDay - hashNoise(i, seed + 1) * 0.02;
    else { served += DAY_UPTIME[d]; if (d === "degraded") degradedDays++; else downDays++; }
  }
  return { name, kind, days, uptime: served / UPTIME_DAYS, degradedDays, downDays };
}

// Index 0 is the oldest day, UPTIME_DAYS - 1 is today.
function dayLabel(i: number): string {
  const ago = UPTIME_DAYS - 1 - i;
  return ago === 0 ? "Today" : ago === 1 ? "Yesterday" : `${ago} days ago`;
}

const uptimeStyles = stylex.create({
  // Below ~420px the row can't honor the 3px bar floor, so it scrolls rather
  // than thinning bars: that would hide the outage days this strip shows.
  strip: { display: "flex", gap: "2px", overflowX: "auto", overscrollBehaviorX: "contain", scrollbarWidth: "thin" },
  // No radius: at 3-8px wide the smallest token (4px) rounds a bar away.
  bar: { flexBasis: 0, flexGrow: 1, minWidth: "3px", height: "30px" },
  // Mirrors UPTIME_COLOR above.
  operational: { backgroundColor: "var(--color-success)" },
  degraded: { backgroundColor: "var(--color-warning)" },
  down: { backgroundColor: "var(--color-error)" },
});

/** One connector's 90-day strip: a single image to assistive tech, not 90 unlabelled boxes. */
function UptimeStrip({ entry }: { entry: ConnectorUptime }) {
  const summary = entry.downDays === 0 && entry.degradedDays === 0
    ? `${UPTIME_DAYS} days for ${entry.name}: working every day.`
    : `${UPTIME_DAYS} days for ${entry.name}: partly working ${entry.degradedDays} ${entry.degradedDays === 1 ? "day" : "days"}, not working ${entry.downDays}.`;
  return (
    <div {...stylex.props(uptimeStyles.strip)} role="img" aria-label={summary}>
      {entry.days.map((d, i) => <div key={i} {...stylex.props(uptimeStyles.bar, uptimeStyles[d])} title={`${dayLabel(i)}: ${UPTIME_LABEL[d]}`} />)}
    </div>
  );
}

function UptimeRow({ entry }: { entry: ConnectorUptime }) {
  return (
    <VStack gap={2}>
      <HStack gap={3} vAlign="center" hAlign="between">
        <HStack gap={2} vAlign="center">
          <StatusDot variant="success" label="Working now" />
          <Heading level={4} accessibilityLevel={3}>{entry.name}</Heading>
          <Token size="sm" color="default" label={entry.kind} />
        </HStack>
        <Text type="supporting" color="secondary">{entry.uptime.toFixed(2)}% of the time working</Text>
      </HStack>
      <UptimeStrip entry={entry} />
    </VStack>
  );
}

/** The manager's connectors and MCP servers, one strip each. */
export function ConnectorsHistory() {
  const coding = manager("coding");
  const entries = useMemo(
    () => [...coding.connectors.map((c) => buildUptime(c, "Connector", 1)), ...coding.mcp.map((m) => buildUptime(m, "MCP server", 2.5))],
    [coding],
  );
  return (
    <VStack gap={6}>
      <HStack gap={3} vAlign="center" hAlign="between" wrap="wrap">
        <VStack>
          <Heading level={2}>Its connectors, last {UPTIME_DAYS} days</Heading>
          <Text type="supporting" color="secondary">Day by day, whether each one was working</Text>
        </VStack>
        <HStack gap={4} vAlign="center" wrap="wrap">
          {UPTIME_ORDER.map((s) => <LegendDot key={s} color={UPTIME_COLOR[s]} label={UPTIME_LABEL[s]} />)}
        </HStack>
      </HStack>
      <Card padding={6}>
        <VStack gap={6}>
          {entries.map((entry, i) => (
            <Fragment key={entry.name}>
              {i > 0 && <Divider />}
              <UptimeRow entry={entry} />
            </Fragment>
          ))}
        </VStack>
      </Card>
    </VStack>
  );
}
