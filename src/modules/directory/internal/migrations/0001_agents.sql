CREATE TABLE `agent_versions` (
	`agent_id` text NOT NULL,
	`version` integer NOT NULL,
	`config` text NOT NULL,
	`saved_at` integer NOT NULL,
	`saved_by` text NOT NULL,
	`request_id` text NOT NULL,
	PRIMARY KEY(`agent_id`, `version`)
);
--> statement-breakpoint
CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`created_by` text NOT NULL,
	`deployed_version` integer,
	`deployed_to` text,
	`deployed_at` integer,
	`deployed_by` text,
	`deleted_at` integer
);
