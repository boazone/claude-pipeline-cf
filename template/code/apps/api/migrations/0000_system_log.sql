CREATE TABLE `system_log` (
	`system_log_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`system_log_guid` text(36) NOT NULL,
	`system_log_time` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`system_log_environment` text(16) NOT NULL,
	`system_log_level` text(16) NOT NULL,
	`system_log_source` text(16) NOT NULL,
	`system_log_message` text NOT NULL,
	`system_log_stack` text,
	`system_log_ray` text(64),
	`system_log_data` text,
	CONSTRAINT "CHK__system_log__system_log_environment_in_set" CHECK("system_log"."system_log_environment" IN ('LOCAL', 'DEV', 'QA', 'PRODUCTION')),
	CONSTRAINT "CHK__system_log__system_log_level_in_set" CHECK("system_log"."system_log_level" IN ('WARNING', 'ERROR', 'FATAL')),
	CONSTRAINT "CHK__system_log__system_log_source_in_set" CHECK("system_log"."system_log_source" IN ('API', 'WEB')),
	CONSTRAINT "CHK__system_log__system_log_data_is_json" CHECK("system_log"."system_log_data" IS NULL OR json_valid("system_log"."system_log_data"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `UNQ__system_log__system_log_guid` ON `system_log` (`system_log_guid`);--> statement-breakpoint
CREATE INDEX `IDX__system_log__system_log_time` ON `system_log` (`system_log_time`);