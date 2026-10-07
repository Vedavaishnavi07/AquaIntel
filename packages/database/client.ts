import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
export interface DB {
  query(sql: string, params?: any[]): Promise<{ rows: any[] }>;
  transaction<T>(fn: (db: DB) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
export async function connect(test = false): Promise<DB> {
  const url = test ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
  if (url) {
    const pool = new pg.Pool({ connectionString: url, max: 10 });
    const wrap = (client: pg.Pool | pg.PoolClient): DB => ({
      query: async (sql, params) => client.query(sql, params),
      close: async () => {},
      transaction: async (fn) => {
        const c = await pool.connect();
        try {
          await c.query("BEGIN");
          const result = await fn(wrap(c));
          await c.query("COMMIT");
          return result;
        } catch (e) {
          await c.query("ROLLBACK");
          throw e;
        } finally {
          c.release();
        }
      },
    });
    return { ...wrap(pool), close: () => pool.end() };
  }
  if (process.env.NODE_ENV === "production")
    throw new Error("Production requires DATABASE_URL");
  const directory = test
    ? undefined
    : resolve(process.env.LOCAL_DATA_DIR || ".local/postgres");
  if (directory) await mkdir(directory, { recursive: true });
  const p = new PGlite(directory);
  const wrap = (c: any): DB => ({
    query: async (sql, params) => c.query(sql, params),
    transaction: async (fn) => c.transaction((tx: any) => fn(wrap(tx))),
    close: async () => {},
  });
  return { ...wrap(p), close: () => p.close() };
}
export async function migrate(db: DB) {
  await db.query(
    "CREATE TABLE IF NOT EXISTS aquaintel_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const directory = resolve("packages/database/migrations");
  for (const name of (await readdir(directory))
    .filter((n) => n.endsWith(".sql"))
    .sort()) {
    if (
      (
        await db.query("SELECT name FROM aquaintel_migrations WHERE name=$1", [
          name,
        ])
      ).rows.length
    )
      continue;
    const sql = await readFile(resolve(directory, name), "utf8");
    await db.transaction(async (tx) => {
      for (const statement of sql.split("--> statement-breakpoint"))
        if (statement.trim()) await tx.query(statement);
      await tx.query("INSERT INTO aquaintel_migrations(name) VALUES($1)", [
        name,
      ]);
    });
  }
}
