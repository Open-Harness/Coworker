import type { ReactNode } from "react";
import type { Person } from "~/modules/protocol/types.ts";
import type {
  ChatRow,
  DocumentRow,
  DocumentVersion,
  ModelOption,
  ModelRef,
  Presence,
  ScheduleRow,
  SettingsChange,
  ThinkingLevel,
  UsageSummary,
  WorkspaceRow,
  WorkspaceSettings,
} from "~/modules/protocol/types.ts";
import type { ChatView, Gap } from "~/modules/transcript/types.ts";

/*
 * Reusable pieces made only of Astryx components. They draw props and report what people do; they know nothing about
 * sockets, routes or stores.
 */

/** Where things live, so every link is a real link. */
export interface Links {
  readonly home: string;
  readonly library: string;
  readonly admin: string;
  readonly workspace: (workspaceId: string) => string;
  readonly settings: (workspaceId: string) => string;
  readonly chat: (workspaceId: string, chatId: number) => string;
  readonly document: (workspaceId: string, document: DocumentRow) => string;
}
export interface Selected {
  readonly workspaceId?: string;
  readonly chatId?: number;
  readonly page: "home" | "library" | "settings" | "chat";
}

export interface RowHandlers {
  readonly onPin: (pinned: boolean) => void;
  readonly onRename: (title: string) => void;
  readonly onArchive: (archived: boolean) => void;
  readonly onDelete: () => void;
}
export interface RowMenuProps extends RowHandlers {
  /** What kind of row, as shown in the dialogs: "chat", "workspace". */
  readonly kind: string;
  readonly title: string;
  readonly isPinned: boolean;
  readonly isArchived: boolean;
  readonly deleteWarning: string;
  readonly extraItems?: readonly { readonly label: string; readonly onClick: () => void }[];
  readonly onOpenChange?: (isOpen: boolean) => void;
}

export interface WorkspaceNavProps {
  readonly workspaces: readonly WorkspaceRow[];
  readonly me: Person;
  readonly people: readonly Person[];
  readonly selected: Selected;
  readonly links: Links;
  readonly onSearch: () => void;
  readonly onNewWorkspace: (name: string) => void;
  readonly onNewChat: (workspaceId: string) => void;
  readonly onChangeName?: () => void;
  /** Present for administrators. */
  readonly adminHref?: string;
  readonly workspaceHandlers: (workspace: WorkspaceRow) => RowHandlers;
  readonly chatHandlers: (workspace: WorkspaceRow, chat: ChatRow) => RowHandlers;
}

export interface NameDialogProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly description?: string;
  readonly label: string;
  readonly initialValue?: string;
  readonly submitLabel: string;
  readonly maxLength: number;
  /** Absent: the dialog stays until a name is given. */
  readonly onClose?: () => void;
  readonly onSubmit: (name: string) => void;
}

export interface PromptComposerProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onSubmit: (value: string) => void;
  readonly placeholder: string;
  readonly documents: readonly DocumentRow[];
  readonly models: readonly ModelOption[];
  readonly model?: ModelRef;
  readonly thinkingLevel: ThinkingLevel;
  readonly onConfigure: (change: { readonly model?: ModelRef; readonly thinkingLevel?: ThinkingLevel }) => void;
  readonly isDisabled?: boolean;
  readonly extraActions?: ReactNode;
  /** An agent decides what answers, so there is nothing to choose. */
  readonly isModelFixed?: boolean;
  readonly headerContext?: ReactNode;
  readonly problem?: string;
  /** Present while the assistant is answering. */
  readonly running?: {
    readonly mode: "followUp" | "steer";
    readonly onMode: (mode: "followUp" | "steer") => void;
    readonly onStop: () => void;
  };
  readonly queued?: readonly { readonly id: number; readonly label: string }[];
  readonly onWithdraw?: (id: number) => void;
}

export interface TranscriptProps {
  readonly view: ChatView;
  readonly me: Person;
  readonly documents: readonly DocumentRow[];
  readonly onLoadEarlier: () => Promise<void>;
  readonly onFillGap: (gap: Gap) => void;
  readonly onFork: (entryId: number) => void;
  readonly onOpenDocument: (documentId: string, version?: number) => void;
  readonly onContinue: () => void;
  /** Who answers, when it is not the workspace's assistant. */
  readonly agentName?: string;
}

export interface PeopleHereProps {
  readonly presence: readonly Presence[];
  readonly chatId: number;
}

export interface DocumentPanelProps {
  readonly row: DocumentRow;
  /** Absent while loading. */
  readonly document?: DocumentVersion;
  readonly problem?: string;
  readonly onVersion: (version: number) => void;
  readonly onShare: () => void;
  readonly onClose: () => void;
}

export interface Suggestion {
  readonly heading: string;
  readonly body: string;
  readonly prompt: string;
}
export interface SuggestionCategory {
  readonly key: string;
  readonly label: string;
  readonly icon: "write" | "code" | "research" | "plan";
  readonly suggestions: readonly Suggestion[];
}
export interface SuggestionPickerProps {
  readonly categories: readonly SuggestionCategory[];
  readonly onPick: (prompt: string) => void;
}

export interface SearchEntry {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly kind: "chat" | "document" | "message";
}
export interface SearchPaletteProps {
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly recent: () => readonly SearchEntry[];
  readonly search: (term: string) => Promise<readonly SearchEntry[]>;
  readonly onPick: (id: string) => void;
}

export interface LibraryProps {
  readonly workspaces: readonly WorkspaceRow[];
  readonly links: Links;
  readonly onRestoreWorkspace: (workspaceId: string) => void;
  readonly onRestoreChat: (workspaceId: string, chatId: number) => void;
}

export interface SettingsFormProps {
  readonly settings: WorkspaceSettings;
  readonly models: readonly ModelOption[];
  readonly onSave: (change: SettingsChange) => void;
}
export interface UsageReportProps {
  readonly usage: UsageSummary;
  readonly budgetUsd?: number;
}
export interface ScheduleListProps {
  readonly schedules: readonly ScheduleRow[];
  readonly chatTitle: (chatId: number) => string;
  readonly chatHref: (chatId: number) => string;
  readonly onCancel: (taskId: number) => void;
}
export interface PageProps {
  readonly title: string;
  readonly description?: string;
  readonly endContent?: ReactNode;
  /** Where the page is, above its title. */
  readonly trail?: ReactNode;
  /** `wide` for tables. */
  readonly width?: "text" | "wide";
  readonly children: ReactNode;
}

/** Astryx's categorical data colours, by name. A chart never takes a raw colour. */
export type ChartColor = "blue" | "orange" | "teal" | "purple" | "red" | "green" | "pink" | "cyan";

export interface ChartSeries {
  readonly name: string;
  /** One number per label. */
  readonly values: readonly number[];
  readonly color: ChartColor;
}

/** A line or bar chart over labelled steps such as days. */
export interface SeriesChartProps {
  /** What the chart shows, as its accessible name and the caption of its numbers. */
  readonly label: string;
  /** One per step, already short enough to sit on an axis: `24 Nov`. */
  readonly labels: readonly string[];
  readonly series: readonly ChartSeries[];
  /** Bars of several series stack instead of standing side by side. */
  readonly isStacked?: boolean;
  /** The axis may stop at fractions (hours); by default it counts whole things. */
  readonly hasDecimals?: boolean;
  /** Said after each number in the text alternative and the tooltip: `hours`. */
  readonly unit?: string;
  /** What to say instead of a flat chart when every number is zero. */
  readonly emptyText?: string;
  readonly height?: number;
  /** Where the axis counts: its ticks, how high it goes, and what goes before a number on it (`$`). Bars only. */
  readonly axis?: { readonly ticks: readonly number[]; readonly top: number; readonly prefix?: string };
  /** Dashed lines across the bars, at these values: a limit, where to be told. Bars only. */
  readonly lines?: readonly number[];
  /** A bar at or above this is drawn red, so that a day over the line shows. One series only. */
  readonly over?: number;
}

export interface DonutChartProps {
  readonly label: string;
  readonly slices: readonly { readonly name: string; readonly value: number; readonly color: ChartColor }[];
  /** The big number or word in the hole. */
  readonly centre?: string;
  readonly emptyText?: string;
  readonly height?: number;
}
