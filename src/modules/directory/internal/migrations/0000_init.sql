CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phase` text NOT NULL,
	`pinned` integer DEFAULT false NOT NULL,
	`archived_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`sequence` integer DEFAULT 0 NOT NULL,
	`chats` text NOT NULL,
	`documents` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `workspaces_phase` ON `workspaces` (`phase`);