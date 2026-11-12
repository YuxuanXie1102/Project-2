CREATE TABLE `evidence_photo` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`check_id` text NOT NULL,
	`check_text` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`uploaded_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `day`, `check_id`)
);
--> statement-breakpoint
CREATE TABLE `user_state` (
	`user_id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated_at` integer NOT NULL
);
