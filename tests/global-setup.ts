import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import * as schema from "../src/db/schema";
import { syncReferenceData } from "../src/server/reference-data";

export default async function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgres://doener:doener@localhost:5432/doenerbuch_test";
  const client = postgres(url, { max: 1, onnotice: () => {} });
  await client.unsafe("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
  await syncReferenceData(db);
  await client.end();
}
