import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, "..", "db", "migrations");
const MIGRATIONS_PG_DIR = path.resolve(__dirname, "..", "db", "migrations-pg");

const readSql = (dir: string, file: string) =>
  fs.readFileSync(path.join(dir, file), "utf8");

describe("Sprint/Epic Migration Parity", () => {
  const sqliteMigrations = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const pgMigrations = fs
    .readdirSync(MIGRATIONS_PG_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  it("SQLite has epics, sprints and issue-column migrations", () => {
    const names = sqliteMigrations.join("\n");
    expect(names).toContain("create_epics");
    expect(names).toContain("create_sprints");
    expect(names).toContain("add_epic_sprint");
  });

  it("PG has epics, sprints and issue-column migrations", () => {
    const names = pgMigrations.join("\n");
    expect(names).toContain("create_epics");
    expect(names).toContain("create_sprints");
    expect(names).toContain("add_epic_sprint");
  });

  it("SQLite epics table declares required columns", () => {
    const sql = readSql(MIGRATIONS_DIR, "008_create_epics_table.sql");
    expect(sql).toContain("epics");
    expect(sql).toContain("name");
    expect(sql).toContain("color");
  });

  it("SQLite sprints table restricts status enum", () => {
    const sql = readSql(MIGRATIONS_DIR, "009_create_sprints_table.sql");
    expect(sql).toContain("sprints");
    expect(sql).toContain("'planned'");
    expect(sql).toContain("'active'");
    expect(sql).toContain("'completed'");
  });

  it("SQLite issues migration adds epic_id and sprint_id FKs", () => {
    const sql = readSql(MIGRATIONS_DIR, "010_add_epic_sprint_to_issues.sql");
    expect(sql).toMatch(/ADD COLUMN epic_id/i);
    expect(sql).toMatch(/ADD COLUMN sprint_id/i);
    expect(sql).toMatch(/ON DELETE SET NULL/i);
    expect(sql).toMatch(/idx_issues_epic_id/i);
    expect(sql).toMatch(/idx_issues_sprint_id/i);
  });

  it("PG issues migration adds epic_id and sprint_id FKs with IF NOT EXISTS", () => {
    const sql = readSql(MIGRATIONS_PG_DIR, "006_add_epic_sprint_to_issues.sql");
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "epic_id"/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "sprint_id"/i);
    expect(sql).toMatch(/ON DELETE SET NULL/i);
    expect(sql).toMatch(/idx_issues_epic_id/i);
    expect(sql).toMatch(/idx_issues_sprint_id/i);
  });

  it("PG sprints table restricts status enum", () => {
    const sql = readSql(MIGRATIONS_PG_DIR, "005_create_sprints_table.sql");
    expect(sql).toContain("planned");
    expect(sql).toContain("active");
    expect(sql).toContain("completed");
    expect(sql).toContain('"status"');
  });
});