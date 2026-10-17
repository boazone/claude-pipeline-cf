import { sql } from "drizzle-orm";
import { check, index, integer, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from "drizzle-orm/sqlite-core";

/**
 * The schema, in the grammar of `vibe/reference/database-conventions.md`: `<table>_<column>` names,
 * `UNQ__` / `IDX__` / `CHK__` constraint names, a GUID beside every surrogate key. A migration is
 * generated from this file (`npm run db:generate -w @{{name}}/api -- --name {{prefix}}_<n>_<what>`),
 * never written by hand, and its SQL is approved at the story's decision card before it runs anywhere.
 */

/** SQLite has no JSON type. */
const isJson = (table: string, column: AnySQLiteColumn) =>
  check(`CHK__${table}__${column.name}_is_json`, sql`${column} IS NULL OR json_valid(${column})`);

const isOneOf = (table: string, column: AnySQLiteColumn, values: readonly string[]) =>
  check(
    `CHK__${table}__${column.name}_in_set`,
    sql`${column} IN (${sql.raw(values.map((value) => `'${value}'`).join(", "))})`,
  );

const CREATE_TIME = sql`CURRENT_TIMESTAMP`;

export const SYSTEM_LOG_ENVIRONMENT = ["LOCAL", "DEV", "QA", "PRODUCTION"] as const;
export const SYSTEM_LOG_LEVEL = ["WARNING", "ERROR", "FATAL"] as const;
export const SYSTEM_LOG_SOURCE = ["API", "WEB"] as const;

/**
 * **The system log** — warnings, errors and fatals from the api and the browser, on every
 * environment, written only through `../system-log.ts`. An append-only log with a surrogate key,
 * because two faults in one second would collide on a composite one, and a GUID, so one entry can be
 * addressed. No soft delete, no update. The bug sweep (`code/tools/sweep`) reads production's (and
 * QA's) `ERROR` and `FATAL` rows.
 */
export const systemLog = sqliteTable(
  "system_log",
  {
    systemLogId: integer("system_log_id").primaryKey({ autoIncrement: true }),
    systemLogGuid: text("system_log_guid", { length: 36 }).notNull(),
    systemLogTime: text("system_log_time").notNull().default(CREATE_TIME),
    systemLogEnvironment: text("system_log_environment", { length: 16, enum: SYSTEM_LOG_ENVIRONMENT }).notNull(),
    systemLogLevel: text("system_log_level", { length: 16, enum: SYSTEM_LOG_LEVEL }).notNull(),
    systemLogSource: text("system_log_source", { length: 16, enum: SYSTEM_LOG_SOURCE }).notNull(),
    /** Truncated on write, never refused. */
    systemLogMessage: text("system_log_message").notNull(),
    /** NULL = no stack. */
    systemLogStack: text("system_log_stack"),
    /** Cloudflare's `cf-ray`, the key into Workers Logs. NULL = no request behind it. */
    systemLogRay: text("system_log_ray", { length: 64 }),
    /** Display-only JSON, never indexed. */
    systemLogData: text("system_log_data"),
  },
  (t) => [
    uniqueIndex("UNQ__system_log__system_log_guid").on(t.systemLogGuid),
    index("IDX__system_log__system_log_time").on(t.systemLogTime),
    isOneOf("system_log", t.systemLogEnvironment, SYSTEM_LOG_ENVIRONMENT),
    isOneOf("system_log", t.systemLogLevel, SYSTEM_LOG_LEVEL),
    isOneOf("system_log", t.systemLogSource, SYSTEM_LOG_SOURCE),
    isJson("system_log", t.systemLogData),
  ],
);
