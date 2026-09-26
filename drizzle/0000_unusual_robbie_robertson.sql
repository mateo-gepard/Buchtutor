CREATE TABLE `analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text,
	`payload` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `request_limits` (
	`user_id` text NOT NULL,
	`bucket` text NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`user_id`, `bucket`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`work_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`anchor` text NOT NULL,
	`kind` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`analysis` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`deleted_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_notes_owner_updated` ON `notes` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`user_id` text NOT NULL,
	`work_id` text NOT NULL,
	`edition_id` text NOT NULL,
	`section_id` text NOT NULL,
	`block_id` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `work_id`)
);
