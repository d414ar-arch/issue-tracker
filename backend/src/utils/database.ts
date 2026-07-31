import path from "path";
import { fileURLToPath } from "url";
import { DatabaseError } from "../middleware/errorHandler.js";
import { PostgresDatabase, Database, RunResult } from "../db/pg-database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DB_PATH = path.resolve(__dirname, "..", "..", "database.sqlite");

export type { Database, RunResult };

class SQLiteDatabase implements Database {
  private db: any;
  public run: (sql: string, params?: any[]) => Promise<RunResult>;
  public get: (sql: string, params?: any[]) => Promise<any>;
  public all: (sql: string, params?: any[]) => Promise<any[]>;
  public close: () => Promise<void>;

  constructor(db: any) {
    this.db = db;
    this.run = promisify(db.run.bind(db));
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

function promisify(fn: Function): (...args: any[]) => Promise<any> {
  return function (this: any, ...args: any[]) {
    return new Promise((resolve, reject) => {
      fn.call(this, ...args, (err: Error | null, result: any) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  };
}

async function createSQLiteDatabase(): Promise<Database> {
  const { default: init } = await import("sqlite3");
  const { promisify: utilPromisify } = await import("util");

  return new Promise((resolve, reject) => {
    const db = new init.Database(DB_PATH, (err: Error | null) => {
      if (err) {
        reject(
          new DatabaseError(`Failed to connect to database: ${err.message}`, {
            path: DB_PATH,
            error: err,
          })
        );
      } else {
        db.run("PRAGMA foreign_keys = ON", (pragmaErr: Error | null) => {
          if (pragmaErr) {
            reject(
              new DatabaseError(
                `Failed to enable foreign keys: ${pragmaErr.message}`,
                { error: pragmaErr }
              )
            );
          } else {
            resolve(new SQLiteDatabase(db));
          }
        });
      }
    });
  });
}

function createPostgresDatabase(): Database {
  return new PostgresDatabase();
}

export async function getDatabase(): Promise<Database> {
  if (process.env.DATABASE_URL) {
    return createPostgresDatabase();
  }
  return createSQLiteDatabase();
}

export async function withTransaction<T>(
  callback: (db: Database) => Promise<T>
): Promise<T> {
  const db = await getDatabase();

  try {
    await db.beginTransaction();
    const result = await callback(db);
    await db.commit();
    await db.close();
    return result;
  } catch (error) {
    try {
      await db.rollback();
    } catch (rollbackError) {
      console.error("Failed to rollback transaction:", rollbackError);
    }
    await db.close();
    throw error;
  }
}

export async function checkDatabaseHealth(): Promise<{
  status: "healthy" | "unhealthy";
  tables: string[];
  error?: string;
}> {
  try {
    const db = await getDatabase();

    let tables: { name: string }[];
    if (process.env.DATABASE_URL) {
      tables = await db.all(
        `SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
      );
    } else {
      tables = await db.all(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`
      );
    }

    await db.close();

    return {
      status: "healthy",
      tables: tables.map((table) => table.name),
    };
  } catch (error) {
    return {
      status: "unhealthy",
      tables: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export class QueryBuilder {
  private query: string = "";
  private params: any[] = [];

  constructor(baseQuery: string = "") {
    this.query = baseQuery;
  }

  where(condition: string, ...params: any[]): QueryBuilder {
    if (this.query.toLowerCase().includes("where")) {
      this.query += ` AND ${condition}`;
    } else {
      this.query += ` WHERE ${condition}`;
    }
    this.params.push(...params);
    return this;
  }

  orderBy(column: string, direction: "ASC" | "DESC" = "ASC"): QueryBuilder {
    if (this.query.toLowerCase().includes("order by")) {
      this.query += `, ${column} ${direction}`;
    } else {
      this.query += ` ORDER BY ${column} ${direction}`;
    }
    return this;
  }

  limit(count: number): QueryBuilder {
    this.query += ` LIMIT ?`;
    this.params.push(count);
    return this;
  }

  offset(count: number): QueryBuilder {
    this.query += ` OFFSET ?`;
    this.params.push(count);
    return this;
  }

  build(): { query: string; params: any[] } {
    return {
      query: this.query,
      params: this.params,
    };
  }

  async execute(db: Database): Promise<any[]> {
    const { query, params } = this.build();
    return await db.all(query, params);
  }

  async executeOne(db: Database): Promise<any> {
    const { query, params } = this.build();
    return await db.get(query, params);
  }
}

export function escapeIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

export function buildInClause(values: any[]): {
  clause: string;
  params: any[];
} {
  if (values.length === 0) {
    return { clause: "1=0", params: [] };
  }

  const placeholders = values.map(() => "?").join(",");
  return {
    clause: `IN (${placeholders})`,
    params: values,
  };
}

export interface PaginationOptions {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export async function paginate<T>(
  db: Database,
  baseQuery: string,
  countQuery: string,
  params: any[],
  options: PaginationOptions
): Promise<PaginatedResult<T>> {
  const countResult = await db.get(countQuery, params);
  const total = countResult.total || countResult.count || 0;

  const dataQuery = `${baseQuery} LIMIT ? OFFSET ?`;
  const dataParams = [...params, options.limit, options.offset];
  const data = await db.all(dataQuery, dataParams);

  return {
    data,
    pagination: {
      total,
      limit: options.limit,
      offset: options.offset,
      hasMore: options.offset + options.limit < total,
    },
  };
}

export async function runMigration(migrationSql: string): Promise<void> {
  const db = await getDatabase();

  try {
    const statements = migrationSql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    await db.beginTransaction();

    for (const statement of statements) {
      await db.run(statement);
    }

    await db.commit();
    await db.close();
  } catch (error) {
    await db.rollback();
    await db.close();
    throw new DatabaseError(
      `Migration failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
      { migration: migrationSql, error }
    );
  }
}
