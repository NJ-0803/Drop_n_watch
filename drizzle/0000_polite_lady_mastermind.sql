CREATE TABLE `price_checks` (
	`user_id` text PRIMARY KEY NOT NULL,
	`attempted_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `watches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`document` text NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_watches_user_created` ON `watches` (`user_id`,`created_at`);