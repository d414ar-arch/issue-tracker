import sqlite3 from "sqlite3";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PostgresDatabase, Database, RunResult } from "./pg-database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = path.resolve(__dirname, "..", "..", "database.sqlite");

export type { Database, RunResult };

export class DatabaseConnection implements Database {
  private db: sqlite3.Database;
  public run: (sql: string, params?: any[]) => Promise<RunResult>;
  public get: (sql: string, params?: any[]) => Promise<any>;
  public all: (sql: string, params?: any[]) => Promise<any[]>;
  public close: () => Promise<void>;

  constructor(db: sqlite3.Database) {
    this.db = db;

    this.run = (sql: string, params?: any[]) => {
      return new Promise((resolve, reject) => {
        this.db.run(sql, params || [], function (err) {
          if (err) {
            reject(err);
          } else {
            resolve(this);
          }
        });
      });
    };

    this.get = promisify(db.get.bind(db));
    this.all = promisify(db.all.bind(db));
    this.close = promisify(db.close.bind(db));
  }

  async beginTransaction(): Promise<void> {
    await this.run("BEGIN TRANSACTION");
  }

  async commit(): Promise<void> {
    await this.run("COMMIT");
  }

  async rollback(): Promise<void> {
    await this.run("ROLLBACK");
  }
}

async function createPostgresDatabase(): Promise<Database> {
  const db = new PostgresDatabase();
  if (process.env.NODE_ENV !== "test") {
    console.log("Connected to PostgreSQL database");
  }
  return db;
}

async function createSQLiteDatabase(): Promise<Database> {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error("Error opening database:", err);
        reject(err);
      } else {
        if (process.env.NODE_ENV !== "test") {
          console.log("Connected to SQLite database at:", DB_PATH);
        }
        resolve(new DatabaseConnection(db));
      }
    });
  });
}

export async function createDatabase(): Promise<Database> {
  if (process.env.DATABASE_URL) {
    return createPostgresDatabase();
  }
  return createSQLiteDatabase();
}

export async function runMigrations(): Promise<void> {
  if (process.env.DATABASE_URL) {
    console.log("PostgreSQL migrations are managed by running the SQL files directly.");
    return;
  }

  const db = await createSQLiteDatabase();

  try {
    await db.run("PRAGMA foreign_keys = ON");

    const migrationsDir = path.join(__dirname, "migrations");
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    if (process.env.NODE_ENV !== "test") {
      console.log("Running database migrations...");
    }

    for (const file of migrationFiles) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, "utf8");

      if (process.env.NODE_ENV !== "test") {
        console.log(`Running migration: ${file}`);
      }
      await db.run(sql);
    }

    if (process.env.NODE_ENV !== "test") {
      console.log("All migrations completed successfully!");
    }
  } catch (error) {
    console.error("Error running migrations:", error);
    throw error;
  } finally {
    await db.close();
  }
}

export async function getDatabase(): Promise<Database> {
  if (process.env.NODE_ENV === "test") {
    const { testDb } = await import("../tests/setup.js");
    await testDb.run("PRAGMA foreign_keys = ON");
    return testDb;
  }

  if (process.env.DATABASE_URL) {
    return createPostgresDatabase();
  }

  const db = await createSQLiteDatabase();
  await db.run("PRAGMA foreign_keys = ON");
  return db;
}
