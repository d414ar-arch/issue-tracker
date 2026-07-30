import { Pool, PoolClient } from "pg";
import { DatabaseError } from "../middleware/errorHandler.js";

export interface RunResult {
  lastID?: number | string | null;
  changes?: number;
}

export interface Database {
  run: (sql: string, params?: any[]) => Promise<RunResult>;
  get: (sql: string, params?: any[]) => Promise<any>;
  all: (sql: string, params?: any[]) => Promise<any[]>;
  close: () => Promise<void>;
  beginTransaction: () => Promise<void>;
  commit: () => Promise<void>;
  rollback: () => Promise<void>;
}

function convertPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

function isInsert(sql: string): boolean {
  return /^\s*INSERT\s/i.test(sql);
}

export function getPool(): Pool {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/issue_tracker";

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
  });
}

export class PostgresDatabase implements Database {
  private pool: Pool;
  private client: PoolClient | null = null;

  constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  private async getClient(): Promise<PoolClient> {
    if (this.client) {
      return this.client;
    }
    const client = await this.pool.connect();
    return client;
  }

  async run(sql: string, params?: any[]): Promise<RunResult> {
    const convertedSql = convertPlaceholders(sql);
    const client = await this.getClient();

    try {
      if (isInsert(sql)) {
        const result = await client.query(
          `${convertedSql} RETURNING id`,
          params || []
        );
        return {
          lastID: result.rows[0]?.id ?? null,
          changes: result.rowCount ?? 0,
        };
      }

      const result = await client.query(convertedSql, params || []);
      return { lastID: null, changes: result.rowCount ?? 0 };
    } finally {
      if (!this.client) {
        client.release();
      }
    }
  }

  async get(sql: string, params?: any[]): Promise<any> {
    const convertedSql = convertPlaceholders(sql);
    const client = await this.getClient();

    try {
      const result = await client.query(convertedSql, params || []);
      return result.rows[0] ?? null;
    } finally {
      if (!this.client) {
        client.release();
      }
    }
  }

  async all(sql: string, params?: any[]): Promise<any[]> {
    const convertedSql = convertPlaceholders(sql);
    const client = await this.getClient();

    try {
      const result = await client.query(convertedSql, params || []);
      return result.rows;
    } finally {
      if (!this.client) {
        client.release();
      }
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
  }

  async beginTransaction(): Promise<void> {
    const client = await this.pool.connect();
    this.client = client;
    await client.query("BEGIN");
  }

  async commit(): Promise<void> {
    if (this.client) {
      await this.client.query("COMMIT");
      this.client.release();
      this.client = null;
    }
  }

  async rollback(): Promise<void> {
    if (this.client) {
      await this.client.query("ROLLBACK");
      this.client.release();
      this.client = null;
    }
  }
}

export function createPostgresDatabase(pool?: Pool): PostgresDatabase {
  return new PostgresDatabase(pool);
}
