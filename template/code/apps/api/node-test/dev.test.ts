import { expect, it } from "vitest";

// A path in a variable keeps `dev.mjs` out of the typecheck; it is a Node script, typed in JSDoc.
const devMjs = new URL("../dev.mjs", import.meta.url).href;
const { parentsFirst } = (await import(devMjs)) as { parentsFirst: (schema: string, data: string) => string };

/**
 * `parentsFirst`, which orders a preview's copy of dev's rows so D1's per-insert foreign key
 * check passes. The shape is
 * wrangler's `d1 export`: a schema dump of `CREATE` statements, and a rows dump of one `INSERT` per
 * statement, a row's text possibly spanning lines.
 */
const schema = `PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE \`game\` (
	\`game_id\` integer PRIMARY KEY,
	\`language_id\` integer NOT NULL,
	FOREIGN KEY (\`language_id\`) REFERENCES \`language\`(\`language_id\`)
);
CREATE TABLE \`language\` (
	\`language_id\` integer PRIMARY KEY
);
CREATE TABLE \`user\` (
	\`user_id\` integer PRIMARY KEY,
	\`language_id\` integer REFERENCES language(language_id)
);
CREATE TABLE IF NOT EXISTS "point" (
	\`point_id\` integer PRIMARY KEY,
	\`game_id\` integer NOT NULL,
	FOREIGN KEY (\`game_id\`) REFERENCES \`game\`(\`game_id\`)
);
CREATE INDEX \`IDX__game__language_id\` ON \`game\` (\`language_id\`);`;

const rows = `PRAGMA defer_foreign_keys=TRUE;
INSERT INTO "user" ("user_id","language_id") VALUES(1,1);
INSERT INTO "point" ("point_id","game_id") VALUES(1,1);
INSERT INTO "game" ("game_id","language_id") VALUES(1,1);
INSERT INTO "game" ("game_id","language_id") VALUES(2,'a
two-line value');
INSERT INTO "language" ("language_id") VALUES(1);`;

it("orders a dump's rows parents first, quoted references or bare", () => {
  expect(parentsFirst(schema, rows)).toBe(
    `PRAGMA defer_foreign_keys=TRUE;
INSERT INTO "language" ("language_id") VALUES(1);
INSERT INTO "user" ("user_id","language_id") VALUES(1,1);
INSERT INTO "game" ("game_id","language_id") VALUES(1,1);
INSERT INTO "game" ("game_id","language_id") VALUES(2,'a
two-line value');
INSERT INTO "point" ("point_id","game_id") VALUES(1,1);`,
  );
});
